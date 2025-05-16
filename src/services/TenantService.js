const { NotFoundError } = require('../utils/errors');

class TenantService {
  constructor(tenantRepository) {
    this.tenantRepository = tenantRepository;
  }

  async createTenant(tenantData) {
    return this.tenantRepository.create(tenantData);
  }

  async getTenantById(id) {
    const tenant = await this.tenantRepository.findById(id);
    if (!tenant) {
      throw new NotFoundError('Tenant not found');
    }
    return tenant;
  }

  async listTenants() {
    return this.tenantRepository.findAll();
  }

  async updateTenant(id, tenantData) {
    const updatedTenant = await this.tenantRepository.update(id, tenantData);
    if (!updatedTenant) {
      throw new NotFoundError('Tenant not found');
    }
    return updatedTenant;
  }

  async deleteTenant(id) {
    const deleted = await this.tenantRepository.deleteById(id);
    if (!deleted) {
      throw new NotFoundError('Tenant not found');
    }
    return deleted;
  }
}

module.exports = TenantService;
