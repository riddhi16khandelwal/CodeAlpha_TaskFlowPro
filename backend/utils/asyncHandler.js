/**
 * Wraps an async route handler and passes errors to next().
 * Eliminates the need for try/catch in every controller.
 *
 * Usage:
 *   router.get('/route', asyncHandler(async (req, res, next) => { ... }));
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
