class TenantRepository {
  constructor(models) {
    this.Tenant = models.Tenant;
  }

  async create(tenantData) {
    return this.Tenant.create(tenantData);
  }

  async findById(id) {
    return this.Tenant.findByPk(id);
  }

  async findAll() {
    return this.Tenant.findAll();
  }

  async update(id, tenantData) {
    const tenant = await this.findById(id);
    if (!tenant) return null;

    return tenant.update(tenantData);
  }

  async deleteById(id) {
    return this.Tenant.destroy({ where: { id } });
  }
}

module.exports = TenantRepository;
