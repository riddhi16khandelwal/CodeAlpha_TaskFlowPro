const mongoose = require('mongoose');

const ChecklistItemSchema = new mongoose.Schema({
  text: { type: String, required: true, maxlength: 200 },
  isCompleted: { type: Boolean, default: false },
  completedAt: { type: Date, default: null },
  completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { _id: true, timestamps: false });

const AttachmentSchema = new mongoose.Schema({
  filename:     { type: String, required: true },
  originalName: { type: String, required: true },
  mimetype:     { type: String, required: true },
  size:         { type: Number, required: true },
  url:          { type: String, required: true },
  uploadedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  uploadedAt:   { type: Date, default: Date.now },
}, { _id: true });

const TaskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      minlength: [2, 'Title must be at least 2 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
      default: '',
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Task must belong to a project'],
    },
    columnId: {
      type: String,
      default: 'todo',
    },
    status: {
      type: String,
      enum: ['todo', 'inprogress', 'review', 'completed'],
      default: 'todo',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    assignees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    startDate: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    order: {
      type: Number,
      default: 0,
    },
    labels: [
      {
        name:  { type: String, required: true, maxlength: 30 },
        color: { type: String, default: '#6C63FF' },
      },
    ],
    checklist: [ChecklistItemSchema],
    attachments: [AttachmentSchema],
    estimatedHours: {
      type: Number,
      min: 0,
      max: 999,
      default: null,
    },
    loggedHours: {
      type: Number,
      min: 0,
      default: 0,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    coverColor: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ───────────────────────────────────────────────────
TaskSchema.index({ project: 1 });
TaskSchema.index({ assignees: 1 });
TaskSchema.index({ status: 1 });
TaskSchema.index({ priority: 1 });
TaskSchema.index({ dueDate: 1 });
TaskSchema.index({ project: 1, status: 1 });
TaskSchema.index({ project: 1, order: 1 });

// ── Virtual: overdue ──────────────────────────────────────────
TaskSchema.virtual('isOverdue').get(function () {
  if (!this.dueDate || this.status === 'completed') return false;
  return new Date(this.dueDate) < new Date();
});

// ── Virtual: checklist progress ───────────────────────────────
TaskSchema.virtual('checklistProgress').get(function () {
  if (!this.checklist || this.checklist.length === 0) return null;
  const completed = this.checklist.filter((i) => i.isCompleted).length;
  return { completed, total: this.checklist.length, percent: Math.round((completed / this.checklist.length) * 100) };
});

// ── Pre-save: set completedAt when status flips ───────────────
TaskSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    if (this.status === 'completed' && !this.completedAt) {
      this.completedAt = new Date();
    } else if (this.status !== 'completed') {
      this.completedAt = null;
    }
  }
  next();
});

module.exports = mongoose.model('Task', TaskSchema);
