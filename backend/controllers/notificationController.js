const asyncHandler   = require('../utils/asyncHandler');
const Notification   = require('../models/Notification');
const { sendSuccess, sendError, paginationMeta } = require('../utils/ApiResponse');

// ─────────────────────────────────────────────────────────────
// @desc   Get all notifications for logged-in user
// @route  GET /api/v1/notifications
// @access Private
// ─────────────────────────────────────────────────────────────
const getNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, unreadOnly = 'false' } = req.query;

  const filter = { recipient: req.user._id };
  if (unreadOnly === 'true') filter.isRead = false;

  const skip  = (parseInt(page) - 1) * parseInt(limit);
  const total = await Notification.countDocuments(filter);
  const unreadCount = await Notification.countDocuments({ recipient: req.user._id, isRead: false });

  const notifications = await Notification.find(filter)
    .populate('sender', 'name avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  sendSuccess(
    res, 200, 'Notifications fetched successfully',
    notifications,
    { ...paginationMeta(total, parseInt(page), parseInt(limit)), unreadCount }
  );
});

// ─────────────────────────────────────────────────────────────
// @desc   Mark a single notification as read
// @route  PATCH /api/v1/notifications/:id/read
// @access Private
// ─────────────────────────────────────────────────────────────
const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) return sendError(res, 404, 'Notification not found.');

  if (String(notification.recipient) !== String(req.user._id)) {
    return sendError(res, 403, 'You can only mark your own notifications as read.');
  }

  notification.isRead = true;
  notification.readAt = new Date();
  await notification.save();

  sendSuccess(res, 200, 'Notification marked as read', notification);
});

// ─────────────────────────────────────────────────────────────
// @desc   Mark ALL notifications as read
// @route  PATCH /api/v1/notifications/read-all
// @access Private
// ─────────────────────────────────────────────────────────────
const markAllAsRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    { recipient: req.user._id, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );

  sendSuccess(res, 200, `${result.modifiedCount} notifications marked as read`);
});

// ─────────────────────────────────────────────────────────────
// @desc   Delete a single notification
// @route  DELETE /api/v1/notifications/:id
// @access Private
// ─────────────────────────────────────────────────────────────
const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) return sendError(res, 404, 'Notification not found.');

  if (String(notification.recipient) !== String(req.user._id) && req.user.role !== 'admin') {
    return sendError(res, 403, 'You can only delete your own notifications.');
  }

  await notification.deleteOne();
  sendSuccess(res, 200, 'Notification deleted successfully');
});

// ─────────────────────────────────────────────────────────────
// @desc   Delete ALL read notifications for the user
// @route  DELETE /api/v1/notifications/clear-read
// @access Private
// ─────────────────────────────────────────────────────────────
const clearReadNotifications = asyncHandler(async (req, res) => {
  const result = await Notification.deleteMany({ recipient: req.user._id, isRead: true });
  sendSuccess(res, 200, `${result.deletedCount} read notifications cleared`);
});

// ─────────────────────────────────────────────────────────────
// @desc   Get unread notification count only (lightweight poll)
// @route  GET /api/v1/notifications/unread-count
// @access Private
// ─────────────────────────────────────────────────────────────
const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
  sendSuccess(res, 200, 'Unread count fetched', { unreadCount: count });
});

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearReadNotifications,
  getUnreadCount,
};
