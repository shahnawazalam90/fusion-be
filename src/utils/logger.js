const winston = require('winston');
const { createLogger, format, transports } = winston;
const { combine, timestamp, printf, colorize } = format;
const path = require('path');
const fs = require('fs');
const { config } = require('../config');

// Create logs directory if it doesn't exist
if (!fs.existsSync(config.logDir)) {
  fs.mkdirSync(config.logDir);
}

// Define log format
const logFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaString = Object.keys(meta).length ? JSON.stringify(meta) : '';
  return `${timestamp} ${level}: ${message} ${metaString}`;
});

// Create the logger
const logger = createLogger({
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
  format: combine(timestamp(), logFormat),
  transports: [
    // Write all logs with importance level of `error` or less to error.log
    new transports.File({
      filename: path.join(config.logDir, 'error.log'),
      level: 'error',
    }),
    // Write all logs to combined.log
    new transports.File({
      filename: path.join(config.logDir, 'combined.log'),
    }),
  ],
});

// If we're not in production, log to the console with colors
if (config.nodeEnv !== 'production') {
  logger.add(
    new transports.Console({
      format: combine(colorize(), logFormat),
    })
  );
}

module.exports = logger;
