// ─── Load environment variables FIRST ────────────────────────
require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');
const path    = require('path');

const connectDB              = require('./config/db');
const { notFound, errorHandler } = require('./middleware/error');

// ─── Connect to MongoDB ───────────────────────────────────────
connectDB();

// ─── Initialise Express ───────────────────────────────────────
const app = express();

// ─── Core Middleware ──────────────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:3000',   // React / Next.js frontend
    'http://localhost:5173',   // Vite frontend
    'http://127.0.0.1:5500',  // Live Server
    '*',                       // Allow all during development
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── HTTP Request Logger ──────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ─── Serve uploaded files as static ──────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Health Check ─────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🚀 TaskFlow Pro API is running!',
    version: '1.0.0',
    env:     process.env.NODE_ENV,
    docs:    'See README.md for all API endpoints',
    endpoints: {
      health:        'GET /',
      auth:          '/api/v1/auth',
      dashboard:     '/api/v1/dashboard',
      projects:      '/api/v1/projects',
      tasks:         '/api/v1/tasks',
      comments:      '/api/v1/comments',
      notifications: '/api/v1/notifications',
      admin:         '/api/v1/admin',
    },
  });
});

app.get('/api/v1/health', (req, res) => {
  res.json({
    success: true,
    status:  'healthy',
    uptime:  process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ───────────────────────────────────────────────
app.use('/api/v1/auth',          require('./routes/auth'));
app.use('/api/v1/dashboard',     require('./routes/dashboard'));
app.use('/api/v1/projects',      require('./routes/projects'));
app.use('/api/v1/tasks',         require('./routes/tasks'));
app.use('/api/v1/comments',      require('./routes/comments'));
app.use('/api/v1/notifications', require('./routes/notifications'));
app.use('/api/v1/admin',         require('./routes/admin'));

// ─── Error Handling Middleware (MUST be last) ─────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log('\n══════════════════════════════════════════════════');
  console.log(`🚀  TaskFlow Pro API`);
  console.log(`    URL  : http://localhost:${PORT}`);
  console.log(`    Mode : ${process.env.NODE_ENV || 'development'}`);
  console.log(`    Time : ${new Date().toLocaleTimeString()}`);
  console.log('══════════════════════════════════════════════════\n');
});

// ─── Unhandled Promise Rejections ─────────────────────────────
process.on('unhandledRejection', (err) => {
  console.error(`\n💥  Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

// ─── Uncaught Exceptions ──────────────────────────────────────
process.on('uncaughtException', (err) => {
  console.error(`\n💥  Uncaught Exception: ${err.message}`);
  process.exit(1);
});

module.exports = app;
