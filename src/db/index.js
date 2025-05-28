const { Sequelize } = require('sequelize');
const { config } = require('../config');
const logger = require('../utils/logger');

// Initialize models
const UserModel = require('../models/User');
const FileModel = require('../models/File');
const ScenarioModel = require('../models/Scenario');
const ReportModel = require('../models/Report');
const SpecFileModel = require('../models/SpecFile');
const TenantModel = require('../models/Tenant');
const ScheduleModel = require('../models/Schedule');
const RequestModel = require('../models/Request');

// Create Sequelize instance
const sequelize = new Sequelize({
  dialect: 'mysql',
  host: config.db.host,
  port: config.db.port,
  username: config.db.username,
  password: config.db.password,
  database: config.db.database,
  logging: (msg) => logger.debug(msg),
  define: {
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    timestamps: true
  }
});

// Initialize models
const models = {
  User: UserModel(sequelize),
  File: FileModel(sequelize),
  Scenario: ScenarioModel(sequelize),
  Report: ReportModel(sequelize),
  SpecFile: SpecFileModel(sequelize),
  Tenant: TenantModel(sequelize),
  Schedule: ScheduleModel(sequelize),
  Request: RequestModel(sequelize)
};

// DB connection
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established');

    // Sync models with database in development (use migrations in production)
    if (config.nodeEnv === 'development') {
      try {
        // Use alter: true to modify existing tables and add new ones without dropping data
        await sequelize.sync({ alter: true });
        logger.info('Database schema synchronized successfully');
      } catch (syncError) {
        if (syncError.original && syncError.original.code === 'ER_TOO_MANY_KEYS') {
          logger.error('Too many indexes in the database. Please review and remove unnecessary indexes.');
          // Continue without syncing to prevent application crash
          logger.warn('Continuing without database sync. Please fix index issues manually.');
        } else {
          logger.error('Error during database sync:', syncError);
          throw syncError;
        }
      }
    }

    return { sequelize, models };
  } catch (error) {
    logger.error('Database connection error:', error);
    process.exit(1);
  }
};

module.exports = { connectDB, models, sequelize };
