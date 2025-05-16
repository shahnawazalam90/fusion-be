const express = require('express');
const {
  validateRegisterTenant,
  validateGetTenant,
  validateUpdateTenant,
  validateDeleteTenant,
} = require('../validators/tenantValidator');
const router = express.Router();

module.exports = (tenantController) => {
  router.post('/', validateRegisterTenant, tenantController.createTenant);
  router.get('/:id', validateGetTenant, tenantController.getTenant);
  router.get('/', tenantController.listTenants);
  router.put('/:id', validateUpdateTenant, tenantController.updateTenant);
  router.delete('/:id', validateDeleteTenant, tenantController.deleteTenant);

  return router;
};
