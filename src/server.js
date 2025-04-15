const http = require('http');
const { config } = require('./config');
const logger = require('./utils/logger');
const { connectDB } = require('./db');
const { createApp } = require('./app');

const startServer = async () => {
  try {
    // Connect to database
    const { models } = await connectDB();

    // Create Express app
    const app = await createApp(models);

    // Create HTTP server
    const server = http.createServer(app);

    // Start server
    server.listen(config.port, () => {
      logger.info(
        `Server running in ${config.nodeEnv} mode on port ${config.port}`
      );
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
      logger.error(err);
      server.close(() => {
        process.exit(1);
      });
    });

    // Handle SIGTERM signal
    process.on('SIGTERM', () => {
      logger.info('SIGTERM RECEIVED. Shutting down gracefully');
      server.close(() => {
        logger.info('Process terminated!');
      });
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();
