const express = require('express');
const router  = express.Router();

const {
  createTask,
  getMyTasks,
  getTask,
  updateTask,
  moveTask,
  assignTask,
  addChecklistItem,
  toggleChecklistItem,
  deleteChecklistItem,
  uploadAttachment,
  removeAttachment,
  deleteTask,
} = require('../controllers/taskController');

const { addComment, getComments } = require('../controllers/commentController');

const { protect }    = require('../middleware/auth');
const { upload }     = require('../middleware/upload');
const {
  validateCreateTask,
  validateUpdateTask,
  validateMoveTask,
  validateAssignTask,
  validateAddChecklistItem,
} = require('../validators/taskValidators');
const {
  validateAddComment,
} = require('../validators/commentValidators');

// All routes require login
router.use(protect);

// ── Task CRUD ─────────────────────────────────────────────────
router.get ('/my',  getMyTasks);           // My assigned tasks
router.post('/',    validateCreateTask, createTask);

router.get   ('/:id', getTask);
router.put   ('/:id', validateUpdateTask, updateTask);
router.delete('/:id', deleteTask);

// ── Task actions ──────────────────────────────────────────────
router.patch('/:id/move',   validateMoveTask,   moveTask);
router.patch('/:id/assign', validateAssignTask, assignTask);

// ── Checklist ─────────────────────────────────────────────────
router.post  ('/:id/checklist',          validateAddChecklistItem, addChecklistItem);
router.patch ('/:id/checklist/:itemId',  toggleChecklistItem);
router.delete('/:id/checklist/:itemId',  deleteChecklistItem);

// ── Attachments ───────────────────────────────────────────────
router.post  ('/:id/attachments',                 upload.single('file'), uploadAttachment);
router.delete('/:id/attachments/:attachmentId',   removeAttachment);

// ── Comments (nested under tasks) ────────────────────────────
router.get ('/:taskId/comments', getComments);
router.post('/:taskId/comments', validateAddComment, addComment);

module.exports = router;
