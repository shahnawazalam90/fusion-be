const express = require('express');
const { authenticateUser } = require('../../../middlewares/auth');
const router = express.Router();

module.exports = (reportController) => {
  router.post('/', authenticateUser, reportController.uploadReport);
  router.get('/', authenticateUser, reportController.listReports);
  router.post('/view', authenticateUser, reportController.viewReport);

  return router;
};
