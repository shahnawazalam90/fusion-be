const express = require('express');
const { authenticateUser } = require('../../../middlewares/auth');

module.exports = (scheduleController) => {
  const router = express.Router();

  // Create a new schedule
  router.post('/', authenticateUser, scheduleController.createSchedule);

  // Get all schedules
  router.get('/', authenticateUser, scheduleController.getAllSchedules);

  // Get a specific schedule
  router.get('/:id', authenticateUser, scheduleController.getSchedule);

  // Update a schedule
  router.put('/:id', authenticateUser, scheduleController.updateSchedule);

  // Delete a schedule
  router.delete('/:id', authenticateUser, scheduleController.deleteSchedule);

  // Get schedules by scenario
  router.get('/scenario/:scenarioId', authenticateUser, scheduleController.getSchedulesByScenario);

  return router;
};