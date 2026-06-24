const { validationResult } = require('express-validator');
const { sendError } = require('../utils/ApiResponse');

/**
 * Runs after express-validator chains.
 * If there are errors, sends a 422 response with all messages.
 * Otherwise calls next().
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
    }));
    return sendError(res, 422, 'Validation failed. Please check the errors below.', errorMessages);
  }
  next();
};

module.exports = validate;
