const express = require('express');
const { authenticateUser } = require('../../../middlewares/auth');
const router = express.Router();

module.exports = (requestController) => {
  router.post('/', authenticateUser, requestController.createRequest);
  router.get('/', authenticateUser, requestController.listRequests);
  router.get('/:id', authenticateUser, requestController.getRequest);
  router.put('/:id', authenticateUser, requestController.updateRequest);
  router.delete('/:id', authenticateUser, requestController.deleteRequest);
  return router;
};
