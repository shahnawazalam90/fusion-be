const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { config } = require('./config');
const errorHandler = require('./middlewares/errorHandler');
const logger = require('./utils/logger');

// Repositories
const UserRepository = require('./repositories/UserRepository');
const FileRepository = require('./repositories/FileRepository');

// Services
const AuthService = require('./services/AuthService');
const FileService = require('./services/FileService');

// Controllers
const AuthController = require('./api/v1/controllers/authController');
const FileController = require('./api/v1/controllers/FileController');

// Create Express app
const createApp = async (models) => {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Logging middleware
  if (config.nodeEnv === 'development') {
    app.use(morgan('dev'));
  } else {
    app.use(
      morgan('combined', {
        stream: { write: (message) => logger.info(message.trim()) },
      })
    );
  }

  // Initialize repositories
  const userRepository = new UserRepository(models);
  const fileRepository = new FileRepository(models);

  // Initialize services
  const authService = new AuthService(userRepository);
  const fileService = new FileService(fileRepository);

  // Initialize controllers
  const authController = new AuthController(authService);
  const fileController = new FileController(fileService);

  // API routes
  app.use(
    '/api/v1/auth',
    require('./api/v1/routes/authRoutes')(authController)
  );
  app.use('/api/v1/files', require('./api/v1/routes/fileRoutes')(fileController));

  // Root route
  app.get('/', (req, res) => {
    res.json({ message: 'Auth API Service' });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      status: 'error',
      message: 'Not found',
    });
  });

  // Global error handler
  app.use(errorHandler);

  return app;
};

module.exports = { createApp };
