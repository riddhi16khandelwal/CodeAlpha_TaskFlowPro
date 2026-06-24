const asyncHandler   = require('../utils/asyncHandler');
const Project        = require('../models/Project');
const Task           = require('../models/Task');
const User           = require('../models/User');
const ActivityLog    = require('../models/ActivityLog');
const { createNotification, createBulkNotifications } = require('../utils/notificationHelper');
const { sendSuccess, sendError, paginationMeta } = require('../utils/ApiResponse');

// ─────────────────────────────────────────────────────────────
// @desc   Create a new project
// @route  POST /api/v1/projects
// @access Private
// ─────────────────────────────────────────────────────────────
const createProject = asyncHandler(async (req, res) => {
  const { name, description, color, icon, visibility, dueDate, startDate, tags } = req.body;

  const project = await Project.create({
    name, description, color, icon, visibility, dueDate, startDate, tags,
    owner: req.user._id,
    members: [], // owner is separate from members array
  });

  // Add project to user's projects list
  await User.findByIdAndUpdate(req.user._id, { $addToSet: { projects: project._id } });

  await ActivityLog.log({
    actor: req.user._id, action: 'project_created',
    description: `Project "${project.name}" was created`,
    project: project._id, meta: { name: project.name },
  });

  const populated = await Project.findById(project._id).populate('owner', 'name email avatar');
  sendSuccess(res, 201, 'Project created successfully', populated);
});

// ─────────────────────────────────────────────────────────────
// @desc   Get all projects for logged-in user
// @route  GET /api/v1/projects
// @access Private
// ─────────────────────────────────────────────────────────────
const getMyProjects = asyncHandler(async (req, res) => {
  const { status, search, page = 1, limit = 20 } = req.query;

  const filter = {
    $or: [
      { owner: req.user._id },
      { 'members.user': req.user._id },
    ],
  };

  if (status) filter.status = status;
  if (search) filter.name   = { $regex: search, $options: 'i' };

  const skip  = (parseInt(page) - 1) * parseInt(limit);
  const total = await Project.countDocuments(filter);

  const projects = await Project.find(filter)
    .populate('owner', 'name email avatar')
    .populate('members.user', 'name email avatar')
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  // Attach task counts
  const projectsWithCounts = await Promise.all(
    projects.map(async (p) => {
      const [totalTasks, completedTasks] = await Promise.all([
        Task.countDocuments({ project: p._id }),
        Task.countDocuments({ project: p._id, status: 'completed' }),
      ]);
      const obj = p.toObject();
      obj.taskStats = { total: totalTasks, completed: completedTasks };
      return obj;
    })
  );

  sendSuccess(res, 200, 'Projects fetched successfully', projectsWithCounts,
    paginationMeta(total, parseInt(page), parseInt(limit)));
});

// ─────────────────────────────────────────────────────────────
// @desc   Get single project by ID
// @route  GET /api/v1/projects/:id
// @access Private (members only — checked by projectAccess middleware)
// ─────────────────────────────────────────────────────────────
const getProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)
    .populate('owner', 'name email avatar bio')
    .populate('members.user', 'name email avatar bio');

  if (!project) return sendError(res, 404, 'Project not found.');

  // Task summary
  const taskStats = await Task.aggregate([
    { $match: { project: project._id } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const statsMap = { todo: 0, inprogress: 0, review: 0, completed: 0 };
  taskStats.forEach((s) => { statsMap[s._id] = s.count; });

  const result = project.toObject();
  result.taskStats = { ...statsMap, total: Object.values(statsMap).reduce((a, b) => a + b, 0) };

  sendSuccess(res, 200, 'Project fetched successfully', result);
});

// ─────────────────────────────────────────────────────────────
// @desc   Update project
// @route  PUT /api/v1/projects/:id
// @access Private (owner/admin only)
// ─────────────────────────────────────────────────────────────
const updateProject = asyncHandler(async (req, res) => {
  const allowed = ['name', 'description', 'color', 'icon', 'visibility', 'status', 'dueDate', 'startDate', 'tags'];
  const updates = {};
  allowed.forEach((key) => { if (req.body[key] !== undefined) updates[key] = req.body[key]; });

  const project = await Project.findByIdAndUpdate(req.params.id, updates, {
    new: true, runValidators: true,
  }).populate('owner', 'name email avatar').populate('members.user', 'name email avatar');

  if (!project) return sendError(res, 404, 'Project not found.');

  await ActivityLog.log({
    actor: req.user._id, action: 'project_updated',
    description: `Project "${project.name}" was updated`,
    project: project._id, meta: updates,
  });

  // Notify all members
  const memberIds = project.members.map((m) => m.user._id || m.user);
  await createBulkNotifications(memberIds, {
    sender: req.user._id, type: 'project_updated',
    title: 'Project updated',
    message: `"${project.name}" has been updated by ${req.user.name}`,
    refModel: 'Project', refId: project._id, project: project._id,
  });

  sendSuccess(res, 200, 'Project updated successfully', project);
});

// ─────────────────────────────────────────────────────────────
// @desc   Archive / Restore project
// @route  PATCH /api/v1/projects/:id/archive
// @access Private (owner/admin)
// ─────────────────────────────────────────────────────────────
const archiveProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) return sendError(res, 404, 'Project not found.');

  project.isArchived = !project.isArchived;
  project.status     = project.isArchived ? 'archived' : 'active';
  project.archivedAt = project.isArchived ? new Date() : null;
  await project.save();

  const action = project.isArchived ? 'archived' : 'restored';

  await ActivityLog.log({
    actor: req.user._id, action: project.isArchived ? 'project_archived' : 'project_restored',
    description: `Project "${project.name}" was ${action}`,
    project: project._id,
  });

  sendSuccess(res, 200, `Project ${action} successfully`, project);
});

// ─────────────────────────────────────────────────────────────
// @desc   Delete project (and all its tasks, comments)
// @route  DELETE /api/v1/projects/:id
// @access Private (owner/admin)
// ─────────────────────────────────────────────────────────────
const deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) return sendError(res, 404, 'Project not found.');

  // Only owner or system admin can delete
  if (String(project.owner) !== String(req.user._id) && req.user.role !== 'admin') {
    return sendError(res, 403, 'Only the project owner can delete this project.');
  }

  // Cascade delete tasks and comments
  const tasks = await Task.find({ project: project._id }).select('_id');
  const Comment = require('../models/Comment');
  await Comment.deleteMany({ project: project._id });
  await Task.deleteMany({ project: project._id });

  // Remove project from all users
  await User.updateMany(
    { projects: project._id },
    { $pull: { projects: project._id } }
  );

  await project.deleteOne();

  await ActivityLog.log({
    actor: req.user._id, action: 'project_deleted',
    description: `Project "${project.name}" was permanently deleted`,
    meta: { projectName: project.name, tasksDeleted: tasks.length },
  });

  sendSuccess(res, 200, 'Project deleted successfully');
});

// ─────────────────────────────────────────────────────────────
// @desc   Invite a member to the project
// @route  POST /api/v1/projects/:id/members
// @access Private (project admin)
// ─────────────────────────────────────────────────────────────
const inviteMember = asyncHandler(async (req, res) => {
  const { userId, role = 'member' } = req.body;

  const project = await Project.findById(req.params.id);
  if (!project) return sendError(res, 404, 'Project not found.');

  // Check user exists
  const invitee = await User.findById(userId);
  if (!invitee) return sendError(res, 404, 'User not found.');

  // Already owner?
  if (String(project.owner) === String(userId)) {
    return sendError(res, 400, 'This user is already the project owner.');
  }

  // Already a member?
  const alreadyMember = project.members.some((m) => String(m.user) === String(userId));
  if (alreadyMember) {
    return sendError(res, 400, 'This user is already a member of the project.');
  }

  project.members.push({ user: userId, role, joinedAt: new Date() });
  await project.save();

  // Add to user's projects list
  await User.findByIdAndUpdate(userId, { $addToSet: { projects: project._id } });

  await ActivityLog.log({
    actor: req.user._id, action: 'member_invited',
    description: `${invitee.name} was invited to project "${project.name}"`,
    project: project._id, meta: { inviteeId: userId, role },
  });

  await createNotification({
    recipient: userId, sender: req.user._id, type: 'project_invitation',
    title: 'Project invitation',
    message: `${req.user.name} added you to the project "${project.name}"`,
    refModel: 'Project', refId: project._id, project: project._id,
  });

  const updated = await Project.findById(project._id)
    .populate('owner', 'name email avatar')
    .populate('members.user', 'name email avatar');

  sendSuccess(res, 200, `${invitee.name} has been added to the project`, updated);
});

// ─────────────────────────────────────────────────────────────
// @desc   Remove a member from the project
// @route  DELETE /api/v1/projects/:id/members/:userId
// @access Private (project admin or self-leave)
// ─────────────────────────────────────────────────────────────
const removeMember = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const project = await Project.findById(req.params.id);
  if (!project) return sendError(res, 404, 'Project not found.');

  // Can't remove the owner
  if (String(project.owner) === String(userId)) {
    return sendError(res, 400, 'Cannot remove the project owner.');
  }

  // Only project admin (or self) can remove
  const isSelf    = String(req.user._id) === String(userId);
  const isAdmin   = req.projectRole === 'admin' || req.user.role === 'admin';
  if (!isSelf && !isAdmin) {
    return sendError(res, 403, 'Only project admins can remove other members.');
  }

  const beforeCount = project.members.length;
  project.members   = project.members.filter((m) => String(m.user) !== String(userId));

  if (project.members.length === beforeCount) {
    return sendError(res, 404, 'This user is not a member of the project.');
  }

  await project.save();
  await User.findByIdAndUpdate(userId, { $pull: { projects: project._id } });

  await ActivityLog.log({
    actor: req.user._id, action: 'member_removed',
    description: `Member was removed from project "${project.name}"`,
    project: project._id, meta: { removedUserId: userId },
  });

  await createNotification({
    recipient: userId, sender: req.user._id, type: 'member_removed',
    title: 'Removed from project',
    message: `You have been removed from the project "${project.name}"`,
    refModel: 'Project', refId: project._id,
  });

  sendSuccess(res, 200, 'Member removed from project successfully');
});

// ─────────────────────────────────────────────────────────────
// @desc   Get project activity log
// @route  GET /api/v1/projects/:id/activity
// @access Private
// ─────────────────────────────────────────────────────────────
const getProjectActivity = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const ActivityLog = require('../models/ActivityLog');

  const skip  = (parseInt(page) - 1) * parseInt(limit);
  const total = await ActivityLog.countDocuments({ project: req.params.id });

  const logs = await ActivityLog.find({ project: req.params.id })
    .populate('actor', 'name email avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  sendSuccess(res, 200, 'Activity log fetched', logs,
    paginationMeta(total, parseInt(page), parseInt(limit)));
});

module.exports = {
  createProject, getMyProjects, getProject, updateProject,
  archiveProject, deleteProject, inviteMember, removeMember, getProjectActivity,
};
