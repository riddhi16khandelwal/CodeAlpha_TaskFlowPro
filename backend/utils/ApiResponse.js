/**
 * Sends a standardised success JSON response.
 *
 * @param {object} res      - Express response object
 * @param {number} statusCode
 * @param {string} message
 * @param {*}      data     - Payload (object, array, null)
 * @param {object} meta     - Optional: pagination, counts, etc.
 */
const sendSuccess = (res, statusCode = 200, message = 'Success', data = null, meta = null) => {
  const response = {
    success: true,
    message,
  };

  if (data !== null && data !== undefined) {
    response.data = data;
  }

  if (meta) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
};

/**
 * Sends a standardised error JSON response.
 *
 * @param {object} res
 * @param {number} statusCode
 * @param {string} message
 * @param {*}      errors    - Optional validation errors array
 */
const sendError = (res, statusCode = 500, message = 'Server Error', errors = null) => {
  const response = {
    success: false,
    message,
  };

  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

/**
 * Builds a pagination meta object.
 *
 * @param {number} total   - Total documents matching filter
 * @param {number} page    - Current page (1-based)
 * @param {number} limit   - Items per page
 */
const paginationMeta = (total, page, limit) => ({
  total,
  page,
  limit,
  pages: Math.ceil(total / limit),
  hasNextPage: page < Math.ceil(total / limit),
  hasPrevPage: page > 1,
});

module.exports = { sendSuccess, sendError, paginationMeta };
