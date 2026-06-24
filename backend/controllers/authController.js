const asyncHandler  = require('../utils/asyncHandler');
const User          = require('../models/User');
const ActivityLog   = require('../models/ActivityLog');
const { sendSuccess, sendError } = require('../utils/ApiResponse');

// ── Helper: send JWT in response ──────────────────────────────
const sendTokenResponse = (res, user, statusCode, message) => {
  const token = user.getSignedJwt();

  const safeUser = {
    _id:       user._id,
    name:      user.name,
    email:     user.email,
    role:      user.role,
    avatar:    user.avatar,
    bio:       user.bio,
    isActive:  user.isActive,
    createdAt: user.createdAt,
  };

  return sendSuccess(res, statusCode, message, { token, user: safeUser });
};

// ─────────────────────────────────────────────────────────────
// @desc   Register a new user
// @route  POST /api/v1/auth/register
// @access Public
// ─────────────────────────────────────────────────────────────
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    return sendError(res, 400, 'Email is already registered. Please login or use a different email.');
  }

  const user = await User.create({ name, email, password });

  await ActivityLog.log({
    actor:       user._id,
    action:      'user_registered',
    description: `User "${user.name}" registered`,
    meta:        { email: user.email },
    ipAddress:   req.ip,
  });

  sendTokenResponse(res, user, 201, 'Account created successfully. Welcome to TaskFlow Pro!');
});

// ─────────────────────────────────────────────────────────────
// @desc   Login
// @route  POST /api/v1/auth/login
// @access Public
// ─────────────────────────────────────────────────────────────
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Explicitly select password (it's excluded by default)
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.matchPassword(password))) {
    return sendError(res, 401, 'Invalid email or password.');
  }

  if (!user.isActive) {
    return sendError(res, 403, 'Your account has been deactivated. Contact support.');
  }

  // Update last login timestamp
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  await ActivityLog.log({
    actor:       user._id,
    action:      'user_login',
    description: `User "${user.name}" logged in`,
    ipAddress:   req.ip,
  });

  sendTokenResponse(res, user, 200, `Welcome back, ${user.name}!`);
});

// ─────────────────────────────────────────────────────────────
// @desc   Logout (client-side token removal — response confirms it)
// @route  POST /api/v1/auth/logout
// @access Private
// ─────────────────────────────────────────────────────────────
const logout = asyncHandler(async (req, res) => {
  sendSuccess(res, 200, 'Logged out successfully. Please remove your token on the client.');
});

// ─────────────────────────────────────────────────────────────
// @desc   Get logged-in user profile
// @route  GET /api/v1/auth/me
// @access Private
// ─────────────────────────────────────────────────────────────
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('projects', 'name color icon status');
  sendSuccess(res, 200, 'Profile fetched successfully', user);
});

// ─────────────────────────────────────────────────────────────
// @desc   Update profile (name, bio, avatar)
// @route  PUT /api/v1/auth/profile
// @access Private
// ─────────────────────────────────────────────────────────────
const updateProfile = asyncHandler(async (req, res) => {
  const { name, bio } = req.body;

  const updates = {};
  if (name) updates.name = name.trim();
  if (bio  !== undefined) updates.bio  = bio.trim();

  // Avatar uploaded via multer
  if (req.file) {
    updates.avatar = `/uploads/${req.file.filename}`;
  }

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true, runValidators: true,
  });

  await ActivityLog.log({
    actor:       user._id,
    action:      'user_updated',
    description: `User "${user.name}" updated their profile`,
    meta:        updates,
  });

  sendSuccess(res, 200, 'Profile updated successfully', user);
});

// ─────────────────────────────────────────────────────────────
// @desc   Change password
// @route  PUT /api/v1/auth/change-password
// @access Private
// ─────────────────────────────────────────────────────────────
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');

  if (!(await user.matchPassword(currentPassword))) {
    return sendError(res, 401, 'Current password is incorrect.');
  }

  if (currentPassword === newPassword) {
    return sendError(res, 400, 'New password must be different from the current password.');
  }

  user.password = newPassword;
  await user.save();

  sendTokenResponse(res, user, 200, 'Password changed successfully. Please login with your new password.');
});

// ─────────────────────────────────────────────────────────────
// @desc   Delete own account
// @route  DELETE /api/v1/auth/account
// @access Private
// ─────────────────────────────────────────────────────────────
const deleteAccount = asyncHandler(async (req, res) => {
  const { password } = req.body;
  if (!password) return sendError(res, 400, 'Please provide your password to confirm deletion.');

  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.matchPassword(password))) {
    return sendError(res, 401, 'Password is incorrect.');
  }

  // Soft-delete: deactivate instead of hard delete to preserve data integrity
  user.isActive = false;
  user.email    = `deleted_${user._id}@deleted.com`; // free up the email
  await user.save({ validateBeforeSave: false });

  sendSuccess(res, 200, 'Account deleted successfully. We are sorry to see you go.');
});

module.exports = { register, login, logout, getMe, updateProfile, changePassword, deleteAccount };
