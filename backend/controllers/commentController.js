const asyncHandler  = require('../utils/asyncHandler');
const Comment       = require('../models/Comment');
const Task          = require('../models/Task');
const ActivityLog   = require('../models/ActivityLog');
const { createNotification, createBulkNotifications } = require('../utils/notificationHelper');
const { sendSuccess, sendError, paginationMeta } = require('../utils/ApiResponse');


const addComment = asyncHandler(async (req, res) => {
  const { content, mentions = [], parentComment = null } = req.body;
  const { taskId } = req.params;

  const task = await Task.findById(taskId).populate('project', 'name _id members owner');
  if (!task) return sendError(res, 404, 'Task not found.');

  // Verify parentComment exists if provided
  if (parentComment) {
    const parent = await Comment.findById(parentComment);
    if (!parent || String(parent.task) !== String(taskId)) {
      return sendError(res, 404, 'Parent comment not found on this task.');
    }
  }

  const comment = await Comment.create({
    content,
    task:          taskId,
    project:       task.project._id,
    author:        req.user._id,
    mentions,
    parentComment: parentComment || null,
  });

  await ActivityLog.log({
    actor:       req.user._id,
    action:      'comment_added',
    description: `${req.user.name} commented on task "${task.title}"`,
    project:     task.project._id,
    task:        task._id,
    meta:        { commentId: comment._id },
  });

  // Notify task assignees (exclude commenter)
  const notifyIds = (task.assignees || [])
    .map(String)
    .filter((id) => id !== String(req.user._id));

  if (notifyIds.length > 0) {
    await createBulkNotifications(notifyIds, {
      sender:   req.user._id,
      type:     'comment_added',
      title:    'New comment on your task',
      message:  `${req.user.name} commented on "${task.title}"`,
      refModel: 'Comment',
      refId:    comment._id,
      project:  task.project._id,
    });
  }

  // Notify mentioned users
  const mentionIds = mentions.map(String).filter((id) => id !== String(req.user._id));
  if (mentionIds.length > 0) {
    await createBulkNotifications(mentionIds, {
      sender:   req.user._id,
      type:     'comment_mention',
      title:    'You were mentioned in a comment',
      message:  `${req.user.name} mentioned you on task "${task.title}"`,
      refModel: 'Comment',
      refId:    comment._id,
      project:  task.project._id,
    });
  }

  const populated = await Comment.findById(comment._id)
    .populate('author', 'name email avatar')
    .populate('mentions', 'name email avatar')
    .populate('parentComment', 'content author');

  sendSuccess(res, 201, 'Comment added successfully', populated);
});

// ─────────────────────────────────────────────────────────────
// @desc   Get all comments for a task
// @route  GET /api/v1/tasks/:taskId/comments
// @access Private
// ─────────────────────────────────────────────────────────────
const getComments = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { page = 1, limit = 50 } = req.query;

  const task = await Task.findById(taskId);
  if (!task) return sendError(res, 404, 'Task not found.');

  const filter = { task: taskId, isDeleted: false, parentComment: null };
  const skip   = (parseInt(page) - 1) * parseInt(limit);
  const total  = await Comment.countDocuments(filter);

  // Get top-level comments
  const comments = await Comment.find(filter)
    .populate('author',  'name email avatar')
    .populate('mentions','name email avatar')
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(parseInt(limit));

  // Attach replies for each top-level comment
  const commentsWithReplies = await Promise.all(
    comments.map(async (c) => {
      const replies = await Comment.find({ parentComment: c._id, isDeleted: false })
        .populate('author',  'name email avatar')
        .populate('mentions','name email avatar')
        .sort({ createdAt: 1 });
      const obj = c.toObject();
      obj.replies = replies;
      return obj;
    })
  );

  sendSuccess(res, 200, 'Comments fetched successfully', commentsWithReplies,
    paginationMeta(total, parseInt(page), parseInt(limit)));
});

// ─────────────────────────────────────────────────────────────
// @desc   Edit a comment
// @route  PUT /api/v1/comments/:id
// @access Private (author only)
// ─────────────────────────────────────────────────────────────
const editComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment)         return sendError(res, 404, 'Comment not found.');
  if (comment.isDeleted)return sendError(res, 404, 'Comment has been deleted.');

  if (String(comment.author) !== String(req.user._id) && req.user.role !== 'admin') {
    return sendError(res, 403, 'You can only edit your own comments.');
  }

  comment.content  = req.body.content;
  comment.mentions = req.body.mentions || comment.mentions;
  // isEdited + editedAt set automatically by pre-save hook
  await comment.save();

  const populated = await Comment.findById(comment._id)
    .populate('author',  'name email avatar')
    .populate('mentions','name email avatar');

  await ActivityLog.log({
    actor:       req.user._id,
    action:      'comment_edited',
    description: `Comment was edited on task`,
    task:        comment.task,
    project:     comment.project,
  });

  sendSuccess(res, 200, 'Comment updated successfully', populated);
});

// ─────────────────────────────────────────────────────────────
// @desc   Delete a comment (soft delete)
// @route  DELETE /api/v1/comments/:id
// @access Private (author or admin)
// ─────────────────────────────────────────────────────────────
const deleteComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment)         return sendError(res, 404, 'Comment not found.');
  if (comment.isDeleted)return sendError(res, 404, 'Comment already deleted.');

  if (String(comment.author) !== String(req.user._id) && req.user.role !== 'admin') {
    return sendError(res, 403, 'You can only delete your own comments.');
  }

  // Soft delete — keeps thread intact
  comment.isDeleted = true;
  comment.content   = '[This comment has been deleted]';
  await comment.save();

  // Hard delete its replies
  await Comment.deleteMany({ parentComment: comment._id });

  await ActivityLog.log({
    actor:       req.user._id,
    action:      'comment_deleted',
    description: 'A comment was deleted',
    task:        comment.task,
    project:     comment.project,
  });

  sendSuccess(res, 200, 'Comment deleted successfully');
});

// ─────────────────────────────────────────────────────────────
// @desc   Add/remove a reaction on a comment
// @route  POST /api/v1/comments/:id/reactions
// @access Private
// ─────────────────────────────────────────────────────────────
const reactToComment = asyncHandler(async (req, res) => {
  const { emoji } = req.body;
  if (!emoji) return sendError(res, 400, 'Emoji is required.');

  const comment = await Comment.findById(req.params.id);
  if (!comment || comment.isDeleted) return sendError(res, 404, 'Comment not found.');

  const existing = comment.reactions.find((r) => r.emoji === emoji);
  if (existing) {
    const userIndex = existing.users.findIndex((u) => String(u) === String(req.user._id));
    if (userIndex !== -1) {
      // Remove reaction
      existing.users.splice(userIndex, 1);
      if (existing.users.length === 0) {
        comment.reactions = comment.reactions.filter((r) => r.emoji !== emoji);
      }
    } else {
      existing.users.push(req.user._id);
    }
  } else {
    comment.reactions.push({ emoji, users: [req.user._id] });
  }

  await comment.save();
  sendSuccess(res, 200, 'Reaction updated', comment.reactions);
});

module.exports = { addComment, getComments, editComment, deleteComment, reactToComment };
