const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        // Project actions
        'project_created',
        'project_updated',
        'project_deleted',
        'project_archived',
        'project_restored',
        'member_invited',
        'member_removed',
        'member_role_changed',
        // Task actions
        'task_created',
        'task_updated',
        'task_deleted',
        'task_assigned',
        'task_unassigned',
        'task_moved',
        'task_completed',
        'task_reopened',
        'task_archived',
        'checklist_item_added',
        'checklist_item_completed',
        'attachment_added',
        'attachment_removed',
        // Comment actions
        'comment_added',
        'comment_edited',
        'comment_deleted',
        // User actions
        'user_registered',
        'user_login',
        'user_updated',
        'user_deleted',
      ],
    },
    description: {
      type: String,
      required: true,
      maxlength: 500,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      default: null,
    },
    // What changed (before/after snapshot for auditing)
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ───────────────────────────────────────────────────
ActivityLogSchema.index({ actor: 1, createdAt: -1 });
ActivityLogSchema.index({ project: 1, createdAt: -1 });
ActivityLogSchema.index({ task: 1, createdAt: -1 });
ActivityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days TTL

// ── Static helper to create a log entry ──────────────────────
ActivityLogSchema.statics.log = async function (data) {
  try {
    await this.create(data);
  } catch (err) {
    // Never throw — logging should never break the main flow
    console.error('ActivityLog error:', err.message);
  }
};

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);
