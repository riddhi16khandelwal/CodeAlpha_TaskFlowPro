const { sendError } = require('../utils/ApiResponse');

/**
 * 404 Handler — route not found
 */
const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

/**
 * Global Error Handler
 * Must have 4 parameters to be recognised as error middleware by Express.
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message    = err.message || 'Internal Server Error';

  // ── Mongoose: bad ObjectId (CastError) ───────────────────
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    message    = `Resource not found with id: ${err.value}`;
    statusCode = 404;
  }

  // ── Mongoose: duplicate key (unique constraint) ───────────
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    message    = `${field.charAt(0).toUpperCase() + field.slice(1)} '${value}' already exists.`;
    statusCode = 400;
  }

  // ── Mongoose: validation errors ───────────────────────────
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    message    = messages.join('. ');
    statusCode = 400;
  }

  // ── JWT errors (fallback, normally caught in auth middleware) ─
  if (err.name === 'JsonWebTokenError') {
    message    = 'Invalid token.';
    statusCode = 401;
  }

  if (err.name === 'TokenExpiredError') {
    message    = 'Token expired.';
    statusCode = 401;
  }

  // ── Multer file size error ────────────────────────────────
  if (err.code === 'LIMIT_FILE_SIZE') {
    message    = `File too large. Maximum size is ${process.env.MAX_FILE_SIZE / 1024 / 1024}MB.`;
    statusCode = 400;
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    message    = 'Unexpected field in file upload.';
    statusCode = 400;
  }

  // ── Log in development ────────────────────────────────────
  if (process.env.NODE_ENV === 'development') {
    console.error('\n🔴 ERROR ─────────────────────────────────────');
    console.error(`  Status : ${statusCode}`);
    console.error(`  Message: ${message}`);
    console.error(`  Route  : ${req.method} ${req.originalUrl}`);
    if (err.stack) console.error('\n  Stack:\n', err.stack);
    console.error('──────────────────────────────────────────────\n');
  }

  return sendError(res, statusCode, message);
};

module.exports = { notFound, errorHandler };
