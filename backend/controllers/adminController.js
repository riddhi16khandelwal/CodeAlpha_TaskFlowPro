const asyncHandler   = require('../utils/asyncHandler');
const User           = require('../models/User');
const Project        = require('../models/Project');
const Task           = require('../models/Task');
const Comment        = require('../models/Comment');
const Notification   = require('../models/Notification');
const ActivityLog    = require('../models/ActivityLog');
const { sendSuccess, sendError, paginationMeta } = require('../utils/ApiResponse');

// ─────────────────────────────────────────────────────────────
// @desc   Admin dashboard — platform-wide analytics
// @route  GET /api/v1/admin/dashboard
// @access Admin
// ─────────────────────────────────────────────────────────────
const getAdminDashboard = asyncHandler(async (req, res) => {
  const now          = new Date();
  const last30Days   = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const last7Days    = new Date(now -  7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    activeUsers,
    newUsersThisMonth,
    totalProjects,
    activeProjects,
    archivedProjects,
    totalTasks,
    completedTasks,
    overdueTasks,
    totalComments,
    recentUsers,
    recentProjects,
    recentActivity,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isActive: true }),
    User.countDocuments({ createdAt: { $gte: last30Days } }),
    Project.countDocuments(),
    Project.countDocuments({ status: 'active' }),
    Project.countDocuments({ isArchived: true }),
    Task.countDocuments(),
    Task.countDocuments({ status: 'completed' }),
    Task.countDocuments({ dueDate: { $lt: now }, status: { $ne: 'completed' } }),
    Comment.countDocuments({ isDeleted: false }),
    User.find().sort({ createdAt: -1 }).limit(5).select('name email role avatar createdAt isActive'),
    Project.find().sort({ createdAt: -1 }).limit(5).populate('owner', 'name email').select('name status owner createdAt memberCount'),
    ActivityLog.find().populate('actor', 'name avatar').sort({ createdAt: -1 }).limit(15),
  ]);

  // Task completion rate
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // User growth last 7 days vs prev 7 days
  const newUsersLast7 = await User.countDocuments({ createdAt: { $gte: last7Days } });
  const prev7Start    = new Date(now - 14 * 24 * 60 * 60 * 1000);
  const newUsersPrev7 = await User.countDocuments({ createdAt: { $gte: prev7Start, $lt: last7Days } });
  const userGrowth    = newUsersPrev7 > 0
    ? Math.round(((newUsersLast7 - newUsersPrev7) / newUsersPrev7) * 100)
    : 100;

  // Tasks created per day (last 7 days)
  const taskTrend = await Task.aggregate([
    { $match: { createdAt: { $gte: last7Days } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Priority distribution
  const priorityDist = await Task.aggregate([
    { $group: { _id: '$priority', count: { $sum: 1 } } },
  ]);
  const priorityMap = { low: 0, medium: 0, high: 0, urgent: 0 };
  priorityDist.forEach((p) => { priorityMap[p._id] = p.count; });

  sendSuccess(res, 200, 'Admin dashboard data fetched', {
    overview: {
      totalUsers, activeUsers, newUsersThisMonth,
      totalProjects, activeProjects, archivedProjects,
      totalTasks, completedTasks, overdueTasks,
      totalComments, completionRate,
      userGrowth: `${userGrowth > 0 ? '+' : ''}${userGrowth}%`,
    },
    priorityDistribution: priorityMap,
    taskTrend,
    recentUsers,
    recentProjects,
    recentActivity,
  });
});

// ─────────────────────────────────────────────────────────────
// @desc   Get all users with search + pagination
// @route  GET /api/v1/admin/users
// @access Admin
// ─────────────────────────────────────────────────────────────
const getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, role, isActive } = req.query;

  const filter = {};
  if (search) {
    filter.$or = [
      { name:  { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }
  if (role)     filter.role     = role;
  if (isActive !== undefined) filter.isActive = isActive === 'true';

  const skip  = (parseInt(page) - 1) * parseInt(limit);
  const total = await User.countDocuments(filter);

  const users = await User.find(filter)
    .select('-password')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  sendSuccess(res, 200, 'Users fetched successfully', users,
    paginationMeta(total, parseInt(page), parseInt(limit)));
});

// ─────────────────────────────────────────────────────────────
// @desc   Get single user details (admin view)
// @route  GET /api/v1/admin/users/:id
// @access Admin
// ─────────────────────────────────────────────────────────────
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if (!user) return sendError(res, 404, 'User not found.');

  const [projectCount, taskCount, commentCount] = await Promise.all([
    Project.countDocuments({ $or: [{ owner: user._id }, { 'members.user': user._id }] }),
    Task.countDocuments({ assignees: user._id }),
    Comment.countDocuments({ author: user._id, isDeleted: false }),
  ]);

  sendSuccess(res, 200, 'User details fetched', {
    ...user.toObject(),
    stats: { projectCount, taskCount, commentCount },
  });
});

// ─────────────────────────────────────────────────────────────
// @desc   Update user role or active status
// @route  PUT /api/v1/admin/users/:id
// @access Admin
// ─────────────────────────────────────────────────────────────
const updateUser = asyncHandler(async (req, res) => {
  // Prevent admin from editing themselves via this route
  if (String(req.params.id) === String(req.user._id)) {
    return sendError(res, 400, 'Use the /auth/profile route to update your own account.');
  }

  const allowed = ['role', 'isActive', 'name'];
  const updates = {};
  allowed.forEach((key) => { if (req.body[key] !== undefined) updates[key] = req.body[key]; });

  const user = await User.findByIdAndUpdate(req.params.id, updates, {
    new: true, runValidators: true,
  }).select('-password');

  if (!user) return sendError(res, 404, 'User not found.');

  await ActivityLog.log({
    actor:       req.user._id,
    action:      'user_updated',
    description: `Admin updated user "${user.name}" — ${JSON.stringify(updates)}`,
    meta:        updates,
  });

  sendSuccess(res, 200, 'User updated successfully', user);
});

// ─────────────────────────────────────────────────────────────
// @desc   Hard-delete a user (admin only)
// @route  DELETE /api/v1/admin/users/:id
// @access Admin
// ─────────────────────────────────────────────────────────────
const deleteUser = asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) {
    return sendError(res, 400, 'You cannot delete your own admin account.');
  }

  const user = await User.findById(req.params.id);
  if (!user) return sendError(res, 404, 'User not found.');

  // Remove user from all project member lists
  await Project.updateMany(
    { 'members.user': user._id },
    { $pull: { members: { user: user._id } } }
  );

  await Comment.deleteMany({ author: user._id });
  await Notification.deleteMany({ recipient: user._id });
  await user.deleteOne();

  await ActivityLog.log({
    actor:       req.user._id,
    action:      'user_deleted',
    description: `Admin permanently deleted user "${user.name}" (${user.email})`,
    meta:        { deletedUserId: user._id, email: user.email },
  });

  sendSuccess(res, 200, `User "${user.name}" permanently deleted`);
});

// ─────────────────────────────────────────────────────────────
// @desc   Get all projects (admin view)
// @route  GET /api/v1/admin/projects
// @access Admin
// ─────────────────────────────────────────────────────────────
const getAllProjects = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, status } = req.query;

  const filter = {};
  if (search) filter.name = { $regex: search, $options: 'i' };
  if (status) filter.status = status;

  const skip  = (parseInt(page) - 1) * parseInt(limit);
  const total = await Project.countDocuments(filter);

  const projects = await Project.find(filter)
    .populate('owner', 'name email avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  // Attach task counts
  const result = await Promise.all(
    projects.map(async (p) => {
      const taskCount = await Task.countDocuments({ project: p._id });
      const obj = p.toObject();
      obj.taskCount = taskCount;
      return obj;
    })
  );

  sendSuccess(res, 200, 'All projects fetched', result,
    paginationMeta(total, parseInt(page), parseInt(limit)));
});

// ─────────────────────────────────────────────────────────────
// @desc   Get all tasks (admin view)
// @route  GET /api/v1/admin/tasks
// @access Admin
// ─────────────────────────────────────────────────────────────
const getAllTasks = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, priority, search } = req.query;

  const filter = {};
  if (status)   filter.status   = status;
  if (priority) filter.priority = priority;
  if (search)   filter.title    = { $regex: search, $options: 'i' };

  const skip  = (parseInt(page) - 1) * parseInt(limit);
  const total = await Task.countDocuments(filter);

  const tasks = await Task.find(filter)
    .populate('project',   'name color')
    .populate('assignees', 'name email avatar')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  sendSuccess(res, 200, 'All tasks fetched', tasks,
    paginationMeta(total, parseInt(page), parseInt(limit)));
});

// ─────────────────────────────────────────────────────────────
// @desc   Platform-wide analytics
// @route  GET /api/v1/admin/analytics
// @access Admin
// ─────────────────────────────────────────────────────────────
const getAnalytics = asyncHandler(async (req, res) => {
  const { period = '30' } = req.query;
  const days   = parseInt(period);
  const since  = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [userGrowth, taskCreation, taskCompletion, projectCreation] = await Promise.all([
    // Daily new users
    User.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),

    // Daily new tasks
    Task.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),

    // Daily task completions
    Task.aggregate([
      { $match: { completedAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),

    // Daily new projects
    Project.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  // Top 5 most active projects (by task count)
  const topProjects = await Task.aggregate([
    { $group: { _id: '$project', taskCount: { $sum: 1 } } },
    { $sort: { taskCount: -1 } },
    { $limit: 5 },
    { $lookup: { from: 'projects', localField: '_id', foreignField: '_id', as: 'project' } },
    { $unwind: '$project' },
    { $project: { 'project.name': 1, 'project.color': 1, taskCount: 1 } },
  ]);

  sendSuccess(res, 200, 'Analytics fetched', {
    period: `${days} days`,
    userGrowth,
    taskCreation,
    taskCompletion,
    projectCreation,
    topProjects,
  });
});

module.exports = {
  getAdminDashboard,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getAllProjects,
  getAllTasks,
  getAnalytics,
};
