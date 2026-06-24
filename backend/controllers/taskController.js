const asyncHandler   = require('../utils/asyncHandler');
const Task           = require('../models/Task');
const Project        = require('../models/Project');
const User           = require('../models/User');
const ActivityLog    = require('../models/ActivityLog');
const { createNotification, createBulkNotifications } = require('../utils/notificationHelper');
const { sendSuccess, sendError, paginationMeta } = require('../utils/ApiResponse');

// ─────────────────────────────────────────────────────────────
// @desc   Create a task
// @route  POST /api/v1/tasks
// @access Private
// ─────────────────────────────────────────────────────────────
const createTask = asyncHandler(async (req, res) => {
  const { title, description, project: projectId, priority, status, dueDate, startDate, assignees, labels, estimatedHours, columnId } = req.body;

  // Verify project exists and user has access
  const project = await Project.findById(projectId);
  if (!project) return sendError(res, 404, 'Project not found.');

  const isMember =
    String(project.owner) === String(req.user._id) ||
    project.members.some((m) => String(m.user) === String(req.user._id)) ||
    req.user.role === 'admin';

  if (!isMember) return sendError(res, 403, 'You are not a member of this project.');

  // Determine order (append to end of column)
  const lastTask = await Task.findOne({ project: projectId, status: status || 'todo' }).sort({ order: -1 });
  const order    = lastTask ? lastTask.order + 1 : 0;

  const task = await Task.create({
    title, description, project: projectId,
    priority: priority || 'medium',
    status:   status   || 'todo',
    columnId: columnId || status || 'todo',
    dueDate:  dueDate  || null,
    startDate:startDate|| null,
    assignees:assignees|| [],
    labels:   labels   || [],
    estimatedHours: estimatedHours || null,
    order,
    createdBy: req.user._id,
  });

  await ActivityLog.log({
    actor: req.user._id, action: 'task_created',
    description: `Task "${task.title}" was created in project "${project.name}"`,
    project: projectId, task: task._id,
    meta: { title, priority: task.priority, status: task.status },
  });

  // Notify assignees
  if (task.assignees && task.assignees.length > 0) {
    await createBulkNotifications(task.assignees, {
      sender: req.user._id, type: 'task_assigned',
      title: 'You have been assigned a task',
      message: `${req.user.name} assigned you to "${task.title}" in ${project.name}`,
      refModel: 'Task', refId: task._id, project: projectId,
    });
  }

  const populated = await Task.findById(task._id)
    .populate('assignees', 'name email avatar')
    .populate('createdBy', 'name email avatar');

  sendSuccess(res, 201, 'Task created successfully', populated);
});

// ─────────────────────────────────────────────────────────────
// @desc   Get all tasks for a project
// @route  GET /api/v1/projects/:projectId/tasks
// @access Private
// ─────────────────────────────────────────────────────────────
const getProjectTasks = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { status, priority, assignee, search, page = 1, limit = 50, sort = 'order' } = req.query;

  const filter = { project: projectId, isArchived: false };
  if (status)   filter.status   = status;
  if (priority) filter.priority = priority;
  if (assignee) filter.assignees = assignee;
  if (search)   filter.title    = { $regex: search, $options: 'i' };

  const skip  = (parseInt(page) - 1) * parseInt(limit);
  const total = await Task.countDocuments(filter);

  const sortMap = {
    order: { order: 1 },
    priority: { priority: -1 },
    dueDate: { dueDate: 1 },
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
  };

  const tasks = await Task.find(filter)
    .populate('assignees', 'name email avatar')
    .populate('createdBy', 'name email avatar')
    .sort(sortMap[sort] || { order: 1 })
    .skip(skip)
    .limit(parseInt(limit));

  sendSuccess(res, 200, 'Tasks fetched successfully', tasks,
    paginationMeta(total, parseInt(page), parseInt(limit)));
});

// ─────────────────────────────────────────────────────────────
// @desc   Get my assigned tasks (across all projects)
// @route  GET /api/v1/tasks/my
// @access Private
// ─────────────────────────────────────────────────────────────
const getMyTasks = asyncHandler(async (req, res) => {
  const { status, priority, overdue, page = 1, limit = 20 } = req.query;

  const filter = { assignees: req.user._id, isArchived: false };
  if (status)   filter.status   = status;
  if (priority) filter.priority = priority;
  if (overdue === 'true') {
    filter.dueDate = { $lt: new Date() };
    filter.status  = { $ne: 'completed' };
  }

  const skip  = (parseInt(page) - 1) * parseInt(limit);
  const total = await Task.countDocuments(filter);

  const tasks = await Task.find(filter)
    .populate('project', 'name color icon')
    .populate('assignees', 'name email avatar')
    .populate('createdBy', 'name email avatar')
    .sort({ dueDate: 1, priority: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  sendSuccess(res, 200, 'Your tasks fetched successfully', tasks,
    paginationMeta(total, parseInt(page), parseInt(limit)));
});

// ─────────────────────────────────────────────────────────────
// @desc   Get single task
// @route  GET /api/v1/tasks/:id
// @access Private
// ─────────────────────────────────────────────────────────────
const getTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id)
    .populate('project', 'name color icon members owner')
    .populate('assignees', 'name email avatar bio')
    .populate('createdBy', 'name email avatar')
    .populate('checklist.completedBy', 'name');

  if (!task) return sendError(res, 404, 'Task not found.');

  // Count comments
  const Comment = require('../models/Comment');
  const commentCount = await Comment.countDocuments({ task: task._id, isDeleted: false });
  const result = task.toObject();
  result.commentCount = commentCount;

  sendSuccess(res, 200, 'Task fetched successfully', result);
});

// ─────────────────────────────────────────────────────────────
// @desc   Update task
// @route  PUT /api/v1/tasks/:id
// @access Private
// ─────────────────────────────────────────────────────────────
const updateTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id).populate('project');
  if (!task) return sendError(res, 404, 'Task not found.');

  const allowed = ['title', 'description', 'priority', 'dueDate', 'startDate', 'estimatedHours', 'loggedHours', 'labels', 'coverColor'];
  const updates = {};
  allowed.forEach((key) => { if (req.body[key] !== undefined) updates[key] = req.body[key]; });

  const updatedTask = await Task.findByIdAndUpdate(req.params.id, updates, {
    new: true, runValidators: true,
  }).populate('assignees', 'name email avatar').populate('createdBy', 'name email avatar');

  await ActivityLog.log({
    actor: req.user._id, action: 'task_updated',
    description: `Task "${updatedTask.title}" was updated`,
    project: task.project._id, task: task._id, meta: updates,
  });

  // Notify assignees
  if (updatedTask.assignees && updatedTask.assignees.length > 0) {
    const assigneeIds = updatedTask.assignees.map((a) => a._id);
    await createBulkNotifications(assigneeIds, {
      sender: req.user._id, type: 'task_updated',
      title: 'Task updated',
      message: `"${updatedTask.title}" was updated by ${req.user.name}`,
      refModel: 'Task', refId: updatedTask._id, project: task.project._id,
    });
  }

  sendSuccess(res, 200, 'Task updated successfully', updatedTask);
});

// ─────────────────────────────────────────────────────────────
// @desc   Move task (change status/column/order)
// @route  PATCH /api/v1/tasks/:id/move
// @access Private
// ─────────────────────────────────────────────────────────────
const moveTask = asyncHandler(async (req, res) => {
  const { status, columnId, order } = req.body;

  const task = await Task.findById(req.params.id).populate('project', 'name _id');
  if (!task) return sendError(res, 404, 'Task not found.');

  const oldStatus = task.status;
  task.status   = status;
  task.columnId = columnId || status;
  if (order !== undefined) task.order = order;
  await task.save();

  await ActivityLog.log({
    actor: req.user._id, action: 'task_moved',
    description: `Task "${task.title}" moved from "${oldStatus}" to "${status}"`,
    project: task.project._id, task: task._id,
    meta: { from: oldStatus, to: status },
  });

  if (status === 'completed' && oldStatus !== 'completed') {
    const assigneeIds = task.assignees || [];
    await createBulkNotifications(assigneeIds, {
      sender: req.user._id, type: 'task_completed',
      title: 'Task completed!',
      message: `"${task.title}" has been marked as completed`,
      refModel: 'Task', refId: task._id, project: task.project._id,
    });
  }

  sendSuccess(res, 200, `Task moved to "${status}" successfully`, task);
});

// ─────────────────────────────────────────────────────────────
// @desc   Assign / update assignees
// @route  PATCH /api/v1/tasks/:id/assign
// @access Private
// ─────────────────────────────────────────────────────────────
const assignTask = asyncHandler(async (req, res) => {
  const { assignees } = req.body;

  const task = await Task.findById(req.params.id).populate('project', 'name _id');
  if (!task) return sendError(res, 404, 'Task not found.');

  const oldAssignees = task.assignees.map((a) => String(a));
  const newAssignees = assignees.map((a) => String(a));

  // Find newly added assignees (not in old list)
  const addedAssignees = newAssignees.filter((id) => !oldAssignees.includes(id));

  task.assignees = assignees;
  await task.save();

  await ActivityLog.log({
    actor: req.user._id, action: 'task_assigned',
    description: `Task "${task.title}" assignees were updated`,
    project: task.project._id, task: task._id,
    meta: { assignees },
  });

  // Notify newly added assignees
  if (addedAssignees.length > 0) {
    await createBulkNotifications(addedAssignees, {
      sender: req.user._id, type: 'task_assigned',
      title: 'New task assignment',
      message: `${req.user.name} assigned you to "${task.title}" in ${task.project.name}`,
      refModel: 'Task', refId: task._id, project: task.project._id,
    });
  }

  const updated = await Task.findById(task._id).populate('assignees', 'name email avatar');
  sendSuccess(res, 200, 'Task assignees updated', updated);
});

// ─────────────────────────────────────────────────────────────
// @desc   Add checklist item
// @route  POST /api/v1/tasks/:id/checklist
// @access Private
// ─────────────────────────────────────────────────────────────
const addChecklistItem = asyncHandler(async (req, res) => {
  const { text } = req.body;

  const task = await Task.findById(req.params.id);
  if (!task) return sendError(res, 404, 'Task not found.');

  task.checklist.push({ text, isCompleted: false });
  await task.save();

  await ActivityLog.log({
    actor: req.user._id, action: 'checklist_item_added',
    description: `Checklist item "${text}" added to task "${task.title}"`,
    project: task.project, task: task._id,
  });

  sendSuccess(res, 200, 'Checklist item added', task.checklist);
});

// ─────────────────────────────────────────────────────────────
// @desc   Toggle checklist item completion
// @route  PATCH /api/v1/tasks/:id/checklist/:itemId
// @access Private
// ─────────────────────────────────────────────────────────────
const toggleChecklistItem = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return sendError(res, 404, 'Task not found.');

  const item = task.checklist.id(req.params.itemId);
  if (!item) return sendError(res, 404, 'Checklist item not found.');

  item.isCompleted  = !item.isCompleted;
  item.completedAt  = item.isCompleted ? new Date() : null;
  item.completedBy  = item.isCompleted ? req.user._id : null;
  await task.save();

  sendSuccess(res, 200, `Checklist item marked as ${item.isCompleted ? 'completed' : 'incomplete'}`, task.checklist);
});

// ─────────────────────────────────────────────────────────────
// @desc   Delete checklist item
// @route  DELETE /api/v1/tasks/:id/checklist/:itemId
// @access Private
// ─────────────────────────────────────────────────────────────
const deleteChecklistItem = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return sendError(res, 404, 'Task not found.');

  const item = task.checklist.id(req.params.itemId);
  if (!item) return sendError(res, 404, 'Checklist item not found.');

  item.deleteOne();
  await task.save();

  sendSuccess(res, 200, 'Checklist item deleted', task.checklist);
});

// ─────────────────────────────────────────────────────────────
// @desc   Upload task attachment
// @route  POST /api/v1/tasks/:id/attachments
// @access Private
// ─────────────────────────────────────────────────────────────
const uploadAttachment = asyncHandler(async (req, res) => {
  if (!req.file) return sendError(res, 400, 'No file uploaded.');

  const task = await Task.findById(req.params.id);
  if (!task) return sendError(res, 404, 'Task not found.');

  const attachment = {
    filename:     req.file.filename,
    originalName: req.file.originalname,
    mimetype:     req.file.mimetype,
    size:         req.file.size,
    url:          `${process.env.APP_URL}/uploads/${req.file.filename}`,
    uploadedBy:   req.user._id,
  };

  task.attachments.push(attachment);
  await task.save();

  await ActivityLog.log({
    actor: req.user._id, action: 'attachment_added',
    description: `File "${req.file.originalname}" attached to task "${task.title}"`,
    project: task.project, task: task._id,
  });

  sendSuccess(res, 201, 'Attachment uploaded successfully', attachment);
});

// ─────────────────────────────────────────────────────────────
// @desc   Remove task attachment
// @route  DELETE /api/v1/tasks/:id/attachments/:attachmentId
// @access Private
// ─────────────────────────────────────────────────────────────
const removeAttachment = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return sendError(res, 404, 'Task not found.');

  const attachment = task.attachments.id(req.params.attachmentId);
  if (!attachment) return sendError(res, 404, 'Attachment not found.');

  // Only uploader or project admin can delete
  if (String(attachment.uploadedBy) !== String(req.user._id) && req.user.role !== 'admin') {
    return sendError(res, 403, 'You can only remove your own attachments.');
  }

  // Remove file from disk
  const fs   = require('fs');
  const path = require('path');
  const filePath = path.join(__dirname, '../uploads', attachment.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  attachment.deleteOne();
  await task.save();

  sendSuccess(res, 200, 'Attachment removed successfully');
});

// ─────────────────────────────────────────────────────────────
// @desc   Delete task
// @route  DELETE /api/v1/tasks/:id
// @access Private
// ─────────────────────────────────────────────────────────────
const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id).populate('project', 'name owner');
  if (!task) return sendError(res, 404, 'Task not found.');

  const isCreator     = String(task.createdBy) === String(req.user._id);
  const isProjectOwner= String(task.project.owner) === String(req.user._id);
  const isAdmin       = req.user.role === 'admin';

  if (!isCreator && !isProjectOwner && !isAdmin) {
    return sendError(res, 403, 'Only the task creator or project owner can delete tasks.');
  }

  const Comment = require('../models/Comment');
  await Comment.deleteMany({ task: task._id });
  await task.deleteOne();

  await ActivityLog.log({
    actor: req.user._id, action: 'task_deleted',
    description: `Task "${task.title}" was deleted from project "${task.project.name}"`,
    project: task.project._id, meta: { taskTitle: task.title },
  });

  sendSuccess(res, 200, 'Task deleted successfully');
});

module.exports = {
  createTask, getProjectTasks, getMyTasks, getTask,
  updateTask, moveTask, assignTask,
  addChecklistItem, toggleChecklistItem, deleteChecklistItem,
  uploadAttachment, removeAttachment, deleteTask,
};
