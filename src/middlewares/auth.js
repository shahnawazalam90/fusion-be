const jwt = require('jsonwebtoken');
const { config } = require('../config');
const { UnauthorizedError } = require('../utils/errors');
const { models } = require('../db'); // Import models to access User

const authenticateUser = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication required');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new UnauthorizedError('Authentication required');
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwtSecret);
    req.userId = decoded.id;

    // Fetch user and attach to req.user (including tenantId)
    const user = await models.User.findByPk(decoded.id);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    req.tenantId = user.tenantId;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      next(new UnauthorizedError('Invalid token'));
    } else if (error.name === 'TokenExpiredError') {
      next(new UnauthorizedError('Token expired'));
    } else {
      next(error);
    }
  }
};

module.exports = { authenticateUser };
