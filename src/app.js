const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { config } = require('./config');
const errorHandler = require('./middlewares/errorHandler');
const logger = require('./utils/logger');

// Repositories
const UserRepository = require('./repositories/UserRepository');
const FileRepository = require('./repositories/FileRepository');
const ScenarioRepository = require('./repositories/ScenarioRepository');
const ReportRepository = require('./repositories/ReportRepository');
const SpecFileRepository = require('./repositories/specFileRepository');
const ScheduleRepository = require('./repositories/ScheduleRepository');
const TenantRepository = require('./repositories/TenantRepository');
const RequestRepository = require('./repositories/RequestRepository');

// Services
const AuthService = require('./services/AuthService');
const FileService = require('./services/FileService');
const ScenarioService = require('./services/ScenarioService');
const ReportService = require('./services/ReportService');
const SpecFileService = require('./services/specFileService');
const ScheduleService = require('./services/ScheduleService');
const TenantService = require('./services/TenantService');
const RequestService = require('./services/RequestService');

// Controllers
const AuthController = require('./api/v1/controllers/authController');
const FileController = require('./api/v1/controllers/FileController');
const ScenarioController = require('./api/v1/controllers/ScenarioController');
const ReportController = require('./api/v1/controllers/ReportController');
const SpecFileController = require('./api/v1/controllers/SpecFileController');
const ScheduleController = require('./api/v1/controllers/ScheduleController');
const TenantController = require('./api/v1/controllers/TenantController');
const RequestController = require('./api/v1/controllers/RequestController');

// Create Express app
const createApp = async (models) => {
  const app = express();

  // Initialize model associations
  Object.keys(models).forEach(modelName => {
    if (models[modelName].associate) {
      models[modelName].associate(models);
    }
  });

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Serve static files
  app.use('/public', express.static('uploads/reports'));

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
  const scenarioRepository = new ScenarioRepository(models);
  const reportRepository = new ReportRepository(models);
  const specFileRepository = new SpecFileRepository(models);
  const scheduleRepository = new ScheduleRepository(models);
  const tenantRepository = new TenantRepository(models);
  const requestRepository = new RequestRepository(models);

  // Initialize services
  const authService = new AuthService(userRepository);
  const fileService = new FileService(fileRepository);
  const scenarioService = new ScenarioService(scenarioRepository);
  const reportService = new ReportService(reportRepository, scenarioRepository, userRepository, requestRepository);
  const specFileService = new SpecFileService(specFileRepository);
  const scheduleService = new ScheduleService(scheduleRepository, reportService);
  const tenantService = new TenantService(tenantRepository);
  const requestService = new RequestService(requestRepository);

  // Initialize controllers
  const authController = new AuthController(authService);
  const fileController = new FileController(fileService);
  const scenarioController = new ScenarioController(scenarioService);
  const reportController = new ReportController(reportService);
  const specFileController = new SpecFileController(specFileService);
  const scheduleController = new ScheduleController(scheduleService);
  const tenantController = new TenantController(tenantService);
  const requestController = new RequestController(requestService);

  // API routes
  app.use('/api/v1/auth', require('./api/v1/routes/authRoutes')(authController));
  app.use('/api/v1/files', require('./api/v1/routes/fileRoutes')(fileController));
  app.use('/api/v1/scenarios', require('./api/v1/routes/scenarioRoutes')(scenarioController));
  app.use('/api/v1/reports', require('./api/v1/routes/reportRoutes')(reportController));
  app.use('/api/v1/specs', require('./api/v1/routes/specFileRoutes')(specFileController));
  app.use('/api/v1/schedules', require('./api/v1/routes/scheduleRoutes')(scheduleController));
  app.use('/api/v1/tenants', require('./api/v1/routes/tenantRoutes')(tenantController));
  app.use('/api/v1/requests', require('./api/v1/routes/requestRoutes')(requestController));

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
