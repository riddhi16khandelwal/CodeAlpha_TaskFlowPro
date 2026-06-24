const { body } = require('express-validator');
const validate  = require('../middleware/validate');

const addCommentRules = [
  body('content')
    .trim()
    .notEmpty().withMessage('Comment content is required')
    .isLength({ min: 1, max: 2000 }).withMessage('Comment must be 1–2000 characters'),

  body('mentions')
    .optional()
    .isArray().withMessage('Mentions must be an array')
    .custom((arr) => {
      const { isValidObjectId } = require('mongoose');
      return arr.every((id) => isValidObjectId(id));
    }).withMessage('All mention IDs must be valid MongoDB IDs'),

  body('parentComment')
    .optional()
    .isMongoId().withMessage('Invalid parent comment ID'),
];

const editCommentRules = [
  body('content')
    .trim()
    .notEmpty().withMessage('Comment content is required')
    .isLength({ min: 1, max: 2000 }).withMessage('Comment must be 1–2000 characters'),
];

module.exports = {
  validateAddComment:  [...addCommentRules,  validate],
  validateEditComment: [...editCommentRules, validate],
};
