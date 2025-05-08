const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    username: process.env.DB_USERNAME || 'oracle',
    password: process.env.DB_PASSWORD || 'oracle',
    database: process.env.DB_DATABASE || 'oracle_fusion',
  },
  logDir: process.env.LOG_DIR || path.join(process.cwd(), 'logs'),
};

module.exports = { config };
