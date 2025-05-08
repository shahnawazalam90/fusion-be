const express = require('express');
const { authenticateUser } = require('../../../middlewares/auth');
const router = express.Router();

module.exports = (reportController) => {
  // Create a new report (without file)
  router.post('/create', authenticateUser, reportController.createReport);
  
  // Upload file for an existing report
  router.post('/upload', authenticateUser, reportController.uploadReport);
  
  // Legacy endpoint for backward compatibility (create + upload in one step)
  router.post('/', authenticateUser, reportController.uploadReport);
  
  // List reports (filter by scenarioId and/or status using query params)
  router.get('/', authenticateUser, reportController.listReports);
  
  // Update report status
  router.patch('/status', authenticateUser, reportController.updateReportStatus);
  
  // View report files
  router.post('/view', authenticateUser, reportController.viewReport);

  // Get scenario metadata
  router.get('/scenario-metadata/:filename', reportController.getScenarioMetadata);
  
  return router;
};
