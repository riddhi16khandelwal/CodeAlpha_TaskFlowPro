/**
 * TaskFlow Pro — Database Seeder
 * Generates: 1 Admin, 3 Users, 5 Projects, 20 Tasks, Comments, Notifications, ActivityLogs
 *
 * Run:  npm run seed
 * Destroy: npm run seed:destroy
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const User         = require('../models/User');
const Project      = require('../models/Project');
const Task         = require('../models/Task');
const Comment      = require('../models/Comment');
const Notification = require('../models/Notification');
const ActivityLog  = require('../models/ActivityLog');

// ─── Seed Data ────────────────────────────────────────────────

const USERS_DATA = [
  {
    name: 'Admin User',
    email: 'admin@taskflow.com',
    password: 'Admin@1234',
    role: 'admin',
    bio: 'System administrator with full access.',
  },
  {
    name: 'Alice Johnson',
    email: 'alice@taskflow.com',
    password: 'Alice@1234',
    role: 'user',
    bio: 'Frontend developer passionate about UX.',
  },
  {
    name: 'Bob Smith',
    email: 'bob@taskflow.com',
    password: 'Bob@1234',
    role: 'user',
    bio: 'Backend engineer specializing in Node.js.',
  },
  {
    name: 'Carol White',
    email: 'carol@taskflow.com',
    password: 'Carol@1234',
    role: 'user',
    bio: 'Full-stack developer and team lead.',
  },
];

const PROJECTS_DATA = [
  {
    name: 'E-Commerce Platform',
    description: 'Build a complete e-commerce solution with React and Node.js. Includes payment integration, inventory management, and admin dashboard.',
    color: '#6C63FF',
    icon: '🛒',
    tags: ['react', 'nodejs', 'mongodb', 'stripe'],
  },
  {
    name: 'Mobile Banking App',
    description: 'Develop a secure mobile banking application with biometric authentication, real-time transactions, and expense tracking.',
    color: '#10B981',
    icon: '🏦',
    tags: ['flutter', 'nodejs', 'security', 'fintech'],
  },
  {
    name: 'AI Content Generator',
    description: 'SaaS platform that uses GPT to generate marketing copy, blog posts, and social media content for businesses.',
    color: '#F59E0B',
    icon: '🤖',
    tags: ['python', 'openai', 'saas', 'react'],
  },
  {
    name: 'Real-Time Chat App',
    description: 'WhatsApp-like chat application with group chats, file sharing, voice messages, and end-to-end encryption.',
    color: '#EF4444',
    icon: '💬',
    tags: ['websocket', 'nodejs', 'redis', 'mongodb'],
  },
  {
    name: 'HR Management System',
    description: 'Complete HR system with employee onboarding, leave management, payroll, performance reviews, and analytics.',
    color: '#8B5CF6',
    icon: '👥',
    tags: ['enterprise', 'nodejs', 'postgresql', 'charts'],
  },
];

const TASKS_TEMPLATES = [
  // E-Commerce tasks
  { title: 'Design product listing page UI', description: 'Create responsive Figma designs for the product grid, filters sidebar, and search bar. Include mobile breakpoints.', priority: 'high', status: 'completed' },
  { title: 'Implement JWT authentication', description: 'Set up JWT login, register, refresh token, and logout endpoints. Include bcrypt for password hashing.', priority: 'urgent', status: 'completed' },
  { title: 'Integrate Stripe payment gateway', description: 'Connect Stripe API for card payments, handle webhooks for payment confirmation and refunds.', priority: 'urgent', status: 'inprogress' },
  { title: 'Build shopping cart functionality', description: 'Implement add to cart, remove, update quantity, and persist cart in localStorage and DB for logged-in users.', priority: 'high', status: 'inprogress' },
  { title: 'Set up MongoDB product schema', description: 'Create Mongoose schema for products with variants, images, pricing, inventory, and categories.', priority: 'medium', status: 'completed' },

  // Mobile Banking tasks
  { title: 'Implement biometric authentication', description: 'Integrate fingerprint and face ID authentication using device native APIs. Fallback to PIN.', priority: 'urgent', status: 'inprogress' },
  { title: 'Design transaction history screen', description: 'Create clean transaction list with filters by date range, type, and amount. Include CSV export.', priority: 'medium', status: 'todo' },
  { title: 'Build fund transfer flow', description: 'Step-by-step transfer wizard: select account, enter amount, confirm, 2FA verification, receipt.', priority: 'high', status: 'review' },

  // AI Content Generator tasks
  { title: 'Integrate OpenAI GPT-4 API', description: 'Set up OpenAI SDK, build prompt templates, handle streaming responses, implement rate limiting.', priority: 'urgent', status: 'completed' },
  { title: 'Build credit system for API usage', description: 'Implement token-based credit system: free tier (100 credits), pro tier (1000 credits), usage tracking.', priority: 'high', status: 'inprogress' },
  { title: 'Create content templates library', description: 'Build 50 pre-built prompt templates for blog posts, ads, emails, social media, and product descriptions.', priority: 'medium', status: 'todo' },
  { title: 'Implement content history and export', description: 'Save all generated content with tags, allow export to PDF, DOCX, and copy to clipboard.', priority: 'low', status: 'todo' },

  // Chat App tasks
  { title: 'Set up WebSocket server with Socket.io', description: 'Initialize Socket.io, handle connect/disconnect, rooms for group chats, and private messaging.', priority: 'urgent', status: 'completed' },
  { title: 'Implement end-to-end encryption', description: 'Use Signal Protocol for E2E encryption. Generate key pairs per user, encrypt messages client-side.', priority: 'urgent', status: 'inprogress' },
  { title: 'Build file sharing feature', description: 'Allow image, video, audio, and document sharing. Compress images, stream videos, preview in chat.', priority: 'high', status: 'review' },
  { title: 'Add push notifications', description: 'Implement FCM for Android and APNs for iOS push notifications. Handle background message delivery.', priority: 'medium', status: 'todo' },

  // HR System tasks
  { title: 'Design employee onboarding workflow', description: 'Multi-step onboarding: document upload, IT setup requests, team introduction, policy acknowledgement.', priority: 'high', status: 'inprogress' },
  { title: 'Build leave management module', description: 'Leave types (annual, sick, maternity), approval workflow, calendar integration, balance tracking.', priority: 'high', status: 'todo' },
  { title: 'Implement payroll calculation engine', description: 'Calculate gross/net salary, tax deductions, allowances, bonuses. Generate payslips as PDF.', priority: 'urgent', status: 'review' },
  { title: 'Create analytics dashboard', description: 'Charts for headcount trends, attrition rate, leave utilization, performance ratings. Export reports.', priority: 'medium', status: 'todo' },
];

const COMMENTS_DATA = [
  "Great progress! The implementation looks solid. Let's make sure we handle edge cases for expired tokens.",
  "I've reviewed the designs and they look clean. One suggestion: add a loading skeleton for the product cards.",
  "Pushed the latest changes to the feature branch. Please review when you get a chance @alice",
  "The Stripe integration is working locally. Need to test with actual card numbers in staging.",
  "Found a bug in the authentication flow — when the refresh token expires, users get a blank screen instead of redirect to login.",
  "Added unit tests for all the utility functions. Coverage is at 87% now.",
  "The performance on mobile is much better after the lazy loading implementation.",
  "We need to discuss the database schema changes in tomorrow's standup. The current approach won't scale.",
  "Documentation has been updated. All API endpoints are now in the README with examples.",
  "Excellent work on the payment integration! The webhook handling is particularly well done.",
];

// ─── Connect & Run ────────────────────────────────────────────

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅  Connected to MongoDB');
  } catch (err) {
    console.error('❌  MongoDB connection failed:', err.message);
    process.exit(1);
  }
}

async function destroyData() {
  await connectDB();
  await Promise.all([
    User.deleteMany(),
    Project.deleteMany(),
    Task.deleteMany(),
    Comment.deleteMany(),
    Notification.deleteMany(),
    ActivityLog.deleteMany(),
  ]);
  console.log('🗑️   All data destroyed');
  process.exit(0);
}

async function seedData() {
  await connectDB();

  // ── 1. Clear existing data ──────────────────────────────────
  await Promise.all([
    User.deleteMany(),
    Project.deleteMany(),
    Task.deleteMany(),
    Comment.deleteMany(),
    Notification.deleteMany(),
    ActivityLog.deleteMany(),
  ]);
  console.log('🗑️   Cleared existing data');

  // ── 2. Create Users ─────────────────────────────────────────
  const createdUsers = await User.create(USERS_DATA);
  const admin = createdUsers[0];
  const users = createdUsers.slice(1); // [alice, bob, carol]
  console.log(`✅  Created ${createdUsers.length} users`);

  // ── 3. Create Projects ──────────────────────────────────────
  const projectDocs = PROJECTS_DATA.map((p, i) => ({
    ...p,
    owner: i % 2 === 0 ? admin._id : users[i % users.length]._id,
    members: [
      { user: users[0]._id, role: 'admin',  joinedAt: new Date() },
      { user: users[1]._id, role: 'member', joinedAt: new Date() },
      { user: users[2]._id, role: 'member', joinedAt: new Date() },
    ],
    startDate: new Date(),
    dueDate: new Date(Date.now() + (30 + i * 10) * 24 * 60 * 60 * 1000),
  }));

  const createdProjects = await Project.create(projectDocs);
  console.log(`✅  Created ${createdProjects.length} projects`);

  // Update users' project arrays
  const allUserIds = createdUsers.map((u) => u._id);
  await User.updateMany(
    { _id: { $in: allUserIds } },
    { $set: { projects: createdProjects.map((p) => p._id) } }
  );

  // ── 4. Create Tasks (4 per project = 20 total) ──────────────
  const allTasks = [];
  for (let pi = 0; pi < createdProjects.length; pi++) {
    const project = createdProjects[pi];
    const tasksBatch = TASKS_TEMPLATES.slice(pi * 4, pi * 4 + 4);

    for (let ti = 0; ti < tasksBatch.length; ti++) {
      const tpl     = tasksBatch[ti];
      const due     = new Date(Date.now() + ((ti + 1) * 7 - 3) * 24 * 60 * 60 * 1000);
      const assignee = users[ti % users.length];

      allTasks.push({
        ...tpl,
        project: project._id,
        columnId: tpl.status,
        createdBy: project.owner,
        assignees: [assignee._id],
        dueDate: due,
        order: ti,
        labels: ti % 2 === 0
          ? [{ name: 'frontend', color: '#6C63FF' }]
          : [{ name: 'backend', color: '#10B981' }],
        checklist: [
          { text: 'Review requirements',    isCompleted: true  },
          { text: 'Initial implementation', isCompleted: tpl.status !== 'todo' },
          { text: 'Write unit tests',        isCompleted: tpl.status === 'completed' },
          { text: 'Code review',             isCompleted: tpl.status === 'completed' },
        ],
        estimatedHours: (ti + 1) * 2,
        loggedHours: tpl.status === 'completed' ? (ti + 1) * 2 : Math.floor((ti + 1) * Math.random()),
      });
    }
  }

  const createdTasks = await Task.create(allTasks);
  console.log(`✅  Created ${createdTasks.length} tasks`);

  // ── 5. Create Comments ──────────────────────────────────────
  const commentDocs = [];
  createdTasks.slice(0, 10).forEach((task, i) => {
    const numComments = (i % 3) + 1;
    for (let c = 0; c < numComments; c++) {
      const authorIndex = (i + c) % createdUsers.length;
      commentDocs.push({
        content: COMMENTS_DATA[(i + c) % COMMENTS_DATA.length],
        task: task._id,
        project: task.project,
        author: createdUsers[authorIndex]._id,
        mentions: c === 0 ? [users[0]._id] : [],
      });
    }
  });

  const createdComments = await Comment.create(commentDocs);
  console.log(`✅  Created ${createdComments.length} comments`);

  // ── 6. Create Notifications ─────────────────────────────────
  const notifDocs = [];
  users.forEach((user) => {
    // Task assigned notifications
    notifDocs.push({
      recipient: user._id,
      sender: admin._id,
      type: 'task_assigned',
      title: 'New task assigned to you',
      message: `You have been assigned to "${createdTasks[0].title}" in ${createdProjects[0].name}`,
      refModel: 'Task',
      refId: createdTasks[0]._id,
      project: createdProjects[0]._id,
    });

    // Project invitation notification
    notifDocs.push({
      recipient: user._id,
      sender: admin._id,
      type: 'project_invitation',
      title: 'Project invitation',
      message: `You have been added to the project "${createdProjects[1].name}"`,
      refModel: 'Project',
      refId: createdProjects[1]._id,
      project: createdProjects[1]._id,
      isRead: true,
      readAt: new Date(),
    });

    // Comment mention notification
    notifDocs.push({
      recipient: user._id,
      sender: users.find((u) => String(u._id) !== String(user._id))?._id || admin._id,
      type: 'comment_mention',
      title: 'You were mentioned in a comment',
      message: `Someone mentioned you in a comment on "${createdTasks[1].title}"`,
      refModel: 'Comment',
      refId: createdComments[0]._id,
      project: createdProjects[0]._id,
    });
  });

  await Notification.insertMany(notifDocs);
  console.log(`✅  Created ${notifDocs.length} notifications`);

  // ── 7. Create Activity Logs ─────────────────────────────────
  const activityDocs = [
    {
      actor: admin._id,
      action: 'user_registered',
      description: 'Admin account was created',
      meta: { email: admin.email },
    },
    ...createdProjects.map((p) => ({
      actor: p.owner,
      action: 'project_created',
      description: `Project "${p.name}" was created`,
      project: p._id,
      meta: { projectName: p.name },
    })),
    ...createdTasks.slice(0, 5).map((t) => ({
      actor: t.createdBy,
      action: 'task_created',
      description: `Task "${t.title}" was created`,
      project: t.project,
      task: t._id,
      meta: { taskTitle: t.title, status: t.status },
    })),
    ...createdTasks.slice(0, 3).map((t) => ({
      actor: users[0]._id,
      action: 'task_assigned',
      description: `Task "${t.title}" was assigned`,
      project: t.project,
      task: t._id,
      meta: { assignee: users[0].name },
    })),
  ];

  await ActivityLog.insertMany(activityDocs);
  console.log(`✅  Created ${activityDocs.length} activity logs`);

  // ── Summary ─────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════');
  console.log('🎉  Database seeded successfully!');
  console.log('══════════════════════════════════════════════════');
  console.log('\n📋  CREDENTIALS\n');
  console.log('  👑 Admin');
  console.log('     Email   : admin@taskflow.com');
  console.log('     Password: Admin@1234');
  console.log('\n  👤 Users');
  console.log('     alice@taskflow.com  / Alice@1234');
  console.log('     bob@taskflow.com    / Bob@1234');
  console.log('     carol@taskflow.com  / Carol@1234');
  console.log('\n  🌐 Base URL : http://localhost:5000/api/v1');
  console.log('  📚 Docs     : See README.md for all endpoints');
  console.log('══════════════════════════════════════════════════\n');

  process.exit(0);
}

// ─── Entry Point ──────────────────────────────────────────────
if (process.argv.includes('--destroy')) {
  destroyData();
} else {
  seedData();
}
