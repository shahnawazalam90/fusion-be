const express = require('express');
const router = express.Router();
const {
  validateRegister,
  validateLogin,
  validateUpdateProfile,
} = require('../validators/authValidator');
const { authenticateUser } = require('../../../middlewares/auth');

// This will be initialized in app.js with the controller
module.exports = (authController) => {
  // Public routes
  router.post('/register', validateRegister, authController.register);
  router.post('/login', validateLogin, authController.login);

  // Protected routes
  router.get('/profile', authenticateUser, authController.getProfile);
  router.put(
    '/profile',
    authenticateUser,
    validateUpdateProfile,
    authController.updateProfile
  );

  return router;
};
