const { body, param } = require('express-validator');
const validate         = require('../middleware/validate');

const createProjectRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Project name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Project name must be 2–100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),

  body('color')
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).withMessage('Provide a valid hex color (e.g. #6C63FF)'),

  body('visibility')
    .optional()
    .isIn(['private', 'team']).withMessage('Visibility must be private or team'),

  body('dueDate')
    .optional()
    .isISO8601().withMessage('Due date must be a valid ISO 8601 date'),
];

const updateProjectRules = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Project name must be 2–100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),

  body('color')
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).withMessage('Provide a valid hex color'),

  body('status')
    .optional()
    .isIn(['active', 'archived', 'completed']).withMessage('Status must be active, archived, or completed'),
];

const inviteMemberRules = [
  body('userId')
    .notEmpty().withMessage('User ID is required')
    .isMongoId().withMessage('Invalid user ID format'),

  body('role')
    .optional()
    .isIn(['admin', 'member', 'viewer']).withMessage('Role must be admin, member, or viewer'),
];

module.exports = {
  validateCreateProject: [...createProjectRules, validate],
  validateUpdateProject: [...updateProjectRules, validate],
  validateInviteMember:  [...inviteMemberRules,  validate],
};
