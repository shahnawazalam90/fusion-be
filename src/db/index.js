const { Sequelize } = require('sequelize');
const { config } = require('../config');
const logger = require('../utils/logger');

// Initialize models
const UserModel = require('../models/User');

// Create Sequelize instance
const sequelize = new Sequelize({
  dialect: 'postgres',
  host: config.db.host,
  port: config.db.port,
  username: config.db.username,
  password: config.db.password,
  database: config.db.database,
  logging: (msg) => logger.debug(msg),
});

// Initialize models
const models = {
  User: UserModel(sequelize),
};

// DB connection
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established');

    // Sync models with database in development (use migrations in production)
    if (config.nodeEnv === 'development') {
      await sequelize.sync({ alter: true });
      logger.info('Database synchronized');
    }

    return { sequelize, models };
  } catch (error) {
    logger.error('Database connection error:', error);
    process.exit(1);
  }
};

module.exports = { connectDB, models, sequelize };
