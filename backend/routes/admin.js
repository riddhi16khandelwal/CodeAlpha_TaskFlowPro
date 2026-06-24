const express = require('express');
const router  = express.Router();

const {
  getAdminDashboard,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getAllProjects,
  getAllTasks,
  getAnalytics,
} = require('../controllers/adminController');

const { protect, adminOnly } = require('../middleware/auth');

// Every admin route needs to be logged-in AND be an admin
router.use(protect, adminOnly);

router.get('/',                  getAdminDashboard);
router.get('/dashboard',         getAdminDashboard);
router.get('/analytics',         getAnalytics);

router.get   ('/users',          getAllUsers);
router.get   ('/users/:id',      getUserById);
router.put   ('/users/:id',      updateUser);
router.delete('/users/:id',      deleteUser);

router.get   ('/projects',       getAllProjects);
router.get   ('/tasks',          getAllTasks);

module.exports = router;
