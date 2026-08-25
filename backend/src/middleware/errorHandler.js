const logger = require('../config/logger');

class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

function notFoundHandler(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;

  if (statusCode >= 500) {
    logger.error(err.stack || err.message);
  } else {
    logger.warn(`${statusCode} - ${err.message}`);
  }

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
    details: err.details || undefined
  });
}

module.exports = { ApiError, notFoundHandler, errorHandler };
