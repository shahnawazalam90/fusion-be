const { catchAsync } = require('../../../utils/catchAsync');

class TenantController {
  constructor(tenantService) {
    this.tenantService = tenantService;
  }

  createTenant = catchAsync(async (req, res) => {
    const tenant = await this.tenantService.createTenant(req.body);

    res.status(201).json({
      status: 'success',
      data: tenant,
    });
  });

  getTenant = catchAsync(async (req, res) => {
    const tenant = await this.tenantService.getTenantById(req.params.id);

    res.status(200).json({
      status: 'success',
      data: tenant,
    });
  });

  listTenants = catchAsync(async (req, res) => {
    const tenants = await this.tenantService.listTenants();

    res.status(200).json({
      status: 'success',
      data: tenants,
    });
  });

  updateTenant = catchAsync(async (req, res) => {
    const updatedTenant = await this.tenantService.updateTenant(req.params.id, req.body);

    res.status(200).json({
      status: 'success',
      data: updatedTenant,
    });
  });

  deleteTenant = catchAsync(async (req, res) => {
    await this.tenantService.deleteTenant(req.params.id);

    res.status(204).send();
  });
}

module.exports = TenantController;
