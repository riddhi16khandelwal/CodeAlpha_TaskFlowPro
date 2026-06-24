const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      minlength: [2, 'Project name must be at least 2 characters'],
      maxlength: [100, 'Project name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: '',
    },
    color: {
      type: String,
      default: '#6C63FF',
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Provide a valid hex color'],
    },
    icon: {
      type: String,
      default: '📋',
    },
    status: {
      type: String,
      enum: ['active', 'archived', 'completed'],
      default: 'active',
    },
    visibility: {
      type: String,
      enum: ['private', 'team'],
      default: 'team',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        role: {
          type: String,
          enum: ['admin', 'member', 'viewer'],
          default: 'member',
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // Kanban columns / task lists
    columns: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true },
        order: { type: Number, default: 0 },
        color: { type: String, default: '#E5E7EB' },
      },
    ],
    dueDate: {
      type: Date,
      default: null,
    },
    startDate: {
      type: Date,
      default: null,
    },
    tags: [
      {
        type: String,
        trim: true,
        maxlength: 30,
      },
    ],
    isArchived: {
      type: Boolean,
      default: false,
    },
    archivedAt: {
      type: Date,
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
ProjectSchema.index({ owner: 1 });
ProjectSchema.index({ 'members.user': 1 });
ProjectSchema.index({ status: 1 });

// ── Virtual: member count ─────────────────────────────────────
ProjectSchema.virtual('memberCount').get(function () {
  return this.members ? this.members.length + 1 : 1; // +1 for owner
});

// ── Pre-save: generate unique slug ───────────────────────────
ProjectSchema.pre('save', async function (next) {
  if (!this.isModified('name') && this.slug) return next();

  // Create slug from name + random suffix
  const base = this.name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();

  const suffix = Math.random().toString(36).substring(2, 7);
  this.slug = `${base}-${suffix}`;
  next();
});

// ── Default columns on create ─────────────────────────────────
ProjectSchema.pre('save', function (next) {
  if (this.isNew && this.columns.length === 0) {
    this.columns = [
      { id: 'todo',        name: 'To Do',       order: 0, color: '#E5E7EB' },
      { id: 'inprogress',  name: 'In Progress', order: 1, color: '#DBEAFE' },
      { id: 'review',      name: 'Review',      order: 2, color: '#FEF3C7' },
      { id: 'completed',   name: 'Completed',   order: 3, color: '#D1FAE5' },
    ];
  }
  next();
});

module.exports = mongoose.model('Project', ProjectSchema);
