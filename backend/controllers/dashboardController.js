const asyncHandler   = require('../utils/asyncHandler');
const Project        = require('../models/Project');
const Task           = require('../models/Task');
const ActivityLog    = require('../models/ActivityLog');
const Notification   = require('../models/Notification');
const { sendSuccess } = require('../utils/ApiResponse');

// ─────────────────────────────────────────────────────────────
// @desc   Get personal dashboard stats for logged-in user
// @route  GET /api/v1/dashboard
// @access Private
// ─────────────────────────────────────────────────────────────
const getDashboard = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const now    = new Date();

  // All projects the user belongs to
  const projectFilter = {
    $or: [{ owner: userId }, { 'members.user': userId }],
  };

  const [
    totalProjects,
    activeProjects,
    totalTasksAssigned,
    completedTasks,
    inProgressTasks,
    overdueTasks,
    urgentTasks,
    recentActivity,
    unreadNotifications,
    upcomingTasks,
  ] = await Promise.all([
    // Project counts
    Project.countDocuments(projectFilter),
    Project.countDocuments({ ...projectFilter, status: 'active' }),

    // Task counts (assigned to me)
    Task.countDocuments({ assignees: userId, isArchived: false }),
    Task.countDocuments({ assignees: userId, status: 'completed', isArchived: false }),
    Task.countDocuments({ assignees: userId, status: 'inprogress', isArchived: false }),

    // Overdue: due date in the past, not completed
    Task.countDocuments({
      assignees: userId,
      status:    { $ne: 'completed' },
      dueDate:   { $lt: now },
      isArchived: false,
    }),

    // Urgent tasks
    Task.countDocuments({ assignees: userId, priority: 'urgent', status: { $ne: 'completed' }, isArchived: false }),

    // Recent activity logs relevant to user
    ActivityLog.find({ actor: userId })
      .populate('project', 'name color icon')
      .populate('task', 'title')
      .sort({ createdAt: -1 })
      .limit(10),

    // Unread notifications
    Notification.countDocuments({ recipient: userId, isRead: false }),

    // Tasks due in next 7 days
    Task.find({
      assignees:  userId,
      status:     { $ne: 'completed' },
      dueDate:    { $gte: now, $lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
      isArchived: false,
    })
      .populate('project', 'name color icon')
      .sort({ dueDate: 1 })
      .limit(5),
  ]);

  // Task status breakdown
  const taskBreakdown = await Task.aggregate([
    { $match: { assignees: userId, isArchived: false } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const breakdown = { todo: 0, inprogress: 0, review: 0, completed: 0 };
  taskBreakdown.forEach((b) => { breakdown[b._id] = b.count; });

  // Priority breakdown
  const priorityBreakdown = await Task.aggregate([
    { $match: { assignees: userId, status: { $ne: 'completed' }, isArchived: false } },
    { $group: { _id: '$priority', count: { $sum: 1 } } },
  ]);
  const priorityMap = { low: 0, medium: 0, high: 0, urgent: 0 };
  priorityBreakdown.forEach((p) => { priorityMap[p._id] = p.count; });

  // Recent projects
  const recentProjects = await Project.find(projectFilter)
    .populate('owner', 'name avatar')
    .sort({ updatedAt: -1 })
    .limit(5)
    .select('name color icon status updatedAt');

  sendSuccess(res, 200, 'Dashboard data fetched successfully', {
    stats: {
      totalProjects,
      activeProjects,
      totalTasksAssigned,
      completedTasks,
      inProgressTasks,
      pendingTasks: totalTasksAssigned - completedTasks,
      overdueTasks,
      urgentTasks,
      unreadNotifications,
      completionRate:
        totalTasksAssigned > 0
          ? Math.round((completedTasks / totalTasksAssigned) * 100)
          : 0,
    },
    taskBreakdown:    breakdown,
    priorityBreakdown: priorityMap,
    recentActivity,
    recentProjects,
    upcomingTasks,
  });
});

module.exports = { getDashboard };
