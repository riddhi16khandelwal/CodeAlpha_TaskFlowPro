const express = require('express');
const router  = express.Router();

const {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  changePassword,
  deleteAccount,
} = require('../controllers/authController');

const { protect }                  = require('../middleware/auth');
const { avatarUpload }             = require('../middleware/upload');
const {
  validateRegister,
  validateLogin,
  validateChangePassword,
  validateUpdateProfile,
} = require('../validators/authValidators');

// ── Public routes ─────────────────────────────────────────────
router.post('/register', validateRegister, register);
router.post('/login',    validateLogin,    login);

// ── Protected routes ──────────────────────────────────────────
router.post  ('/logout',          protect, logout);
router.get   ('/me',              protect, getMe);
router.put   ('/profile',         protect, avatarUpload.single('avatar'), validateUpdateProfile, updateProfile);
router.put   ('/change-password', protect, validateChangePassword, changePassword);
router.delete('/account',         protect, deleteAccount);

module.exports = router;
