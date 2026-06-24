const express = require('express');
const router  = express.Router();

const {
  editComment,
  deleteComment,
  reactToComment,
} = require('../controllers/commentController');

const { protect }            = require('../middleware/auth');
const { validateEditComment }= require('../validators/commentValidators');

// All routes require login
router.use(protect);

router.put   ('/:id',            validateEditComment, editComment);
router.delete('/:id',            deleteComment);
router.post  ('/:id/reactions',  reactToComment);

module.exports = router;
