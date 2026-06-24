const Notification = require('../models/Notification');

/**
 * Creates a notification document in the DB.
 * Call this from controllers — never throws, just logs errors.
 *
 * @param {object} opts
 * @param {ObjectId}  opts.recipient  - User ID who receives the notification
 * @param {ObjectId}  [opts.sender]   - User ID who triggered it (null = system)
 * @param {string}    opts.type       - Notification type enum value
 * @param {string}    opts.title
 * @param {string}    opts.message
 * @param {string}    [opts.refModel] - 'Task' | 'Project' | 'Comment'
 * @param {ObjectId}  [opts.refId]
 * @param {ObjectId}  [opts.project]
 * @param {string}    [opts.actionUrl]
 */
const createNotification = async (opts) => {
  try {
    // Never notify yourself
    if (opts.sender && String(opts.sender) === String(opts.recipient)) return;

    await Notification.create({
      recipient:  opts.recipient,
      sender:     opts.sender   || null,
      type:       opts.type,
      title:      opts.title,
      message:    opts.message,
      refModel:   opts.refModel || null,
      refId:      opts.refId    || null,
      project:    opts.project  || null,
      actionUrl:  opts.actionUrl || null,
    });
  } catch (err) {
    console.error('Notification creation failed:', err.message);
  }
};

/**
 * Sends a notification to multiple recipients.
 */
const createBulkNotifications = async (recipientIds, opts) => {
  const promises = recipientIds.map((recipientId) =>
    createNotification({ ...opts, recipient: recipientId })
  );
  await Promise.allSettled(promises);
};

module.exports = { createNotification, createBulkNotifications };
