const { config } = require('../config');
const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  // Log error
  logger.error(`${err.name}: ${err.message}`, { stack: err.stack });

  // Operational, trusted error: send message to client
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
  }

  // Programming or other unknown error: don't leak error details
  console.error('ERROR 💥', err);

  // Send generic message
  return res.status(500).json({
    status: 'error',
    message:
      config.nodeEnv === 'production'
        ? 'Something went wrong'
        : err.message || 'Internal server error',
  });
};

module.exports = errorHandler;
