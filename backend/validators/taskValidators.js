const { body } = require('express-validator');
const validate  = require('../middleware/validate');

const createTaskRules = [
  body('title')
    .trim()
    .notEmpty().withMessage('Task title is required')
    .isLength({ min: 2, max: 200 }).withMessage('Title must be 2–200 characters'),

  body('project')
    .notEmpty().withMessage('Project ID is required')
    .isMongoId().withMessage('Invalid project ID'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 }).withMessage('Description cannot exceed 5000 characters'),

  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent']).withMessage('Priority must be low, medium, high, or urgent'),

  body('status')
    .optional()
    .isIn(['todo', 'inprogress', 'review', 'completed']).withMessage('Invalid status value'),

  body('dueDate')
    .optional()
    .isISO8601().withMessage('Due date must be a valid ISO 8601 date'),

  body('assignees')
    .optional()
    .isArray().withMessage('Assignees must be an array')
    .custom((arr) => {
      const { isValidObjectId } = require('mongoose');
      return arr.every((id) => isValidObjectId(id));
    }).withMessage('All assignee IDs must be valid MongoDB IDs'),

  body('estimatedHours')
    .optional()
    .isFloat({ min: 0, max: 999 }).withMessage('Estimated hours must be between 0 and 999'),
];

const updateTaskRules = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 }).withMessage('Title must be 2–200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 }).withMessage('Description cannot exceed 5000 characters'),

  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),

  body('status')
    .optional()
    .isIn(['todo', 'inprogress', 'review', 'completed']).withMessage('Invalid status'),

  body('dueDate')
    .optional({ nullable: true })
    .isISO8601().withMessage('Due date must be a valid ISO 8601 date'),
];

const moveTaskRules = [
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['todo', 'inprogress', 'review', 'completed']).withMessage('Invalid status'),

  body('columnId')
    .optional()
    .trim()
    .notEmpty().withMessage('Column ID cannot be empty'),

  body('order')
    .optional()
    .isInt({ min: 0 }).withMessage('Order must be a non-negative integer'),
];

const assignTaskRules = [
  body('assignees')
    .notEmpty().withMessage('Assignees array is required')
    .isArray({ min: 0 }).withMessage('Assignees must be an array')
    .custom((arr) => {
      const { isValidObjectId } = require('mongoose');
      return arr.every((id) => isValidObjectId(id));
    }).withMessage('All assignee IDs must be valid MongoDB IDs'),
];

const addChecklistItemRules = [
  body('text')
    .trim()
    .notEmpty().withMessage('Checklist item text is required')
    .isLength({ max: 200 }).withMessage('Checklist item cannot exceed 200 characters'),
];

module.exports = {
  validateCreateTask:       [...createTaskRules,       validate],
  validateUpdateTask:       [...updateTaskRules,        validate],
  validateMoveTask:         [...moveTaskRules,          validate],
  validateAssignTask:       [...assignTaskRules,        validate],
  validateAddChecklistItem: [...addChecklistItemRules,  validate],
};
