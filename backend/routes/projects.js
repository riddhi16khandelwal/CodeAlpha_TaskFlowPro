const express = require('express');
const router  = express.Router();

const {
  createProject,
  getMyProjects,
  getProject,
  updateProject,
  archiveProject,
  deleteProject,
  inviteMember,
  removeMember,
  getProjectActivity,
} = require('../controllers/projectController');

const { getProjectTasks } = require('../controllers/taskController');

const { protect }                    = require('../middleware/auth');
const { projectAccess, projectAdmin } = require('../middleware/projectAccess');
const {
  validateCreateProject,
  validateUpdateProject,
  validateInviteMember,
} = require('../validators/projectValidators');

// All routes require login
router.use(protect);

// ── Project CRUD ──────────────────────────────────────────────
router.get  ('/',    getMyProjects);
router.post ('/',    validateCreateProject, createProject);

router.get   ('/:id',          projectAccess, getProject);
router.put   ('/:id',          projectAccess, projectAdmin, validateUpdateProject, updateProject);
router.patch ('/:id/archive',  projectAccess, projectAdmin, archiveProject);
router.delete('/:id',          projectAccess, projectAdmin, deleteProject);

// ── Member management ─────────────────────────────────────────
router.post  ('/:id/members',            projectAccess, projectAdmin, validateInviteMember, inviteMember);
router.delete('/:id/members/:userId',    projectAccess, removeMember);

// ── Tasks for a project ───────────────────────────────────────
router.get('/:projectId/tasks', projectAccess, getProjectTasks);

// ── Activity log ──────────────────────────────────────────────
router.get('/:id/activity', projectAccess, getProjectActivity);

module.exports = router;
