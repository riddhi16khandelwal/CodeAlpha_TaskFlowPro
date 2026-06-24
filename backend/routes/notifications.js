const express = require('express');
const router  = express.Router();

const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearReadNotifications,
  getUnreadCount,
} = require('../controllers/notificationController');

const { protect } = require('../middleware/auth');

router.use(protect);

router.get   ('/',               getNotifications);
router.get   ('/unread-count',   getUnreadCount);
router.patch ('/read-all',       markAllAsRead);
router.delete('/clear-read',     clearReadNotifications);
router.patch ('/:id/read',       markAsRead);
router.delete('/:id',            deleteNotification);

module.exports = router;
