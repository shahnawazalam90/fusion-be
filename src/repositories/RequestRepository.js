class RequestRepository {
  constructor(models) {
    this.Request = models.Request;
  }

  async create(requestData) {
    return this.Request.create(requestData);
  }

  async findById(id) {
    return this.Request.findByPk(id);
  }

  async findAllByTenantId(tenantId) {
    return this.Request.findAll({ where: { tenantId } });
  }

  async update(id, updateData) {
    const request = await this.findById(id);
    if (!request) return null;
    return request.update(updateData);
  }

  async delete(id) {
    return this.Request.destroy({ where: { id } });
  }
}

module.exports = RequestRepository;
