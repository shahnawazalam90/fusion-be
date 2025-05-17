const express = require('express');
const auth = require('../../../middleware/auth');

module.exports = (scheduleController) => {
  const router = express.Router();

  // Create a new schedule
  router.post('/', auth, scheduleController.createSchedule);

  // Get all schedules
  router.get('/', auth, scheduleController.getAllSchedules);

  // Get a specific schedule
  router.get('/:id', auth, scheduleController.getSchedule);

  // Update a schedule
  router.put('/:id', auth, scheduleController.updateSchedule);

  // Delete a schedule
  router.delete('/:id', auth, scheduleController.deleteSchedule);

  // Get schedules by scenario
  router.get('/scenario/:scenarioId', auth, scheduleController.getSchedulesByScenario);

  return router;
}; 