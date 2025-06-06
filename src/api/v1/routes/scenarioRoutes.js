const express = require('express');
const { authenticateUser } = require('../../../middlewares/auth');
const router = express.Router();

module.exports = (scenarioController) => {
  router.post('/', authenticateUser, scenarioController.createScenario);
  router.get('/:id', authenticateUser, scenarioController.getScenario);
  router.get('/', authenticateUser, scenarioController.listScenarios);
  router.delete('/:id', authenticateUser, scenarioController.deleteScenario);
  router.put('/update', authenticateUser, scenarioController.updateScenario);
  
  // Get scenario metadata
  router.get('/:id/metadata', authenticateUser, scenarioController.getScenarioMetadata);

  return router;
};
