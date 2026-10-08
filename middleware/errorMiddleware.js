/**
 * 404 Not Found Middleware
 */
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/**
 * Global Error Handler Middleware
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message || 'Internal Server Error';

  // Handle PostgreSQL / Supabase Invalid UUID syntax (22P02) or CastError
  if (err.code === '22P02' || (err.name === 'CastError' && err.kind === 'ObjectId')) {
    statusCode = 400;
    message = 'Resource not found (Invalid ID format)';
  }

  // Handle PostgreSQL Duplicate Key (23505) or Mongoose 11000
  if (err.code === '23505' || err.code === 11000) {
    statusCode = 400;
    message = 'An account with this email address already exists.';
  }

  // Handle PostgreSQL Foreign Key Violation (23503)
  if (err.code === '23503') {
    statusCode = 400;
    message = 'Referenced resource does not exist.';
  }

  // Handle Mongoose / Supabase Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = err.errors
      ? Object.values(err.errors).map((val) => val.message).join(', ')
      : err.message;
  }

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
};

module.exports = { notFound, errorHandler };
