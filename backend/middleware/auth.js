const jwt          = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const User         = require('../models/User');
const { sendError } = require('../utils/ApiResponse');

/**
 * protect — verifies the Bearer JWT and attaches req.user
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // 1. Try Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  // 2. Fallback: cookie (optional)
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return sendError(res, 401, 'Access denied. No token provided. Please login.');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return sendError(res, 401, 'User belonging to this token no longer exists.');
    }

    if (!user.isActive) {
      return sendError(res, 401, 'Your account has been deactivated. Contact support.');
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return sendError(res, 401, 'Your session has expired. Please login again.');
    }
    if (err.name === 'JsonWebTokenError') {
      return sendError(res, 401, 'Invalid token. Please login again.');
    }
    return sendError(res, 401, 'Authentication failed.');
  }
});

/**
 * adminOnly — must come after protect middleware
 */
const adminOnly = (req, res, next) => {
  if (!req.user) {
    return sendError(res, 401, 'Not authenticated.');
  }
  if (req.user.role !== 'admin') {
    return sendError(res, 403, 'Access denied. Admins only.');
  }
  next();
};

/**
 * authorize — allows specific roles
 * Usage: router.get('/route', protect, authorize('admin', 'user'), handler)
 */
const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    return sendError(res, 401, 'Not authenticated.');
  }
  if (!roles.includes(req.user.role)) {
    return sendError(res, 403, `Role '${req.user.role}' is not authorized to access this route.`);
  }
  next();
};

module.exports = { protect, adminOnly, authorize };
