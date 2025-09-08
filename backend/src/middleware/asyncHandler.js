/**
 * A higher-order function to wrap async route handlers.
 * It catches any errors from rejected promises and passes them to the `next`
 * middleware (which should be your global error handler).
 * This avoids having to write try/catch blocks in every async controller.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;