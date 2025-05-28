const { NotFoundError, UnauthorizedError } = require('../utils/errors');

class RequestService {
  constructor(requestRepository) {
    this.requestRepository = requestRepository;
  }

  async createRequest(requestData, user) {
    if (!user || !user.tenantId) throw new UnauthorizedError('User not authenticated');
    // Always use user's tenantId
    return this.requestRepository.create({
      ...requestData,
      tenantId: user.tenantId
    });
  }

  async getRequests(user) {
    if (!user || !user.tenantId) throw new UnauthorizedError('User not authenticated');
    return this.requestRepository.findAllByTenantId(user.tenantId);
  }

  async getRequestById(id, user) {
    if (!user || !user.tenantId) throw new UnauthorizedError('User not authenticated');
    const req = await this.requestRepository.findById(id);
    if (!req || req.tenantId !== user.tenantId) {
      throw new NotFoundError('Request not found');
    }
    return req;
  }

  async updateRequest(id, updateData, user) {
    if (!user || !user.tenantId) throw new UnauthorizedError('User not authenticated');
    const req = await this.requestRepository.findById(id);
    if (!req) throw new NotFoundError('Request not found');
    if (req.tenantId !== user.tenantId) throw new UnauthorizedError('Forbidden');
    return this.requestRepository.update(id, updateData);
  }

  async deleteRequest(id, user) {
    if (!user || !user.tenantId) throw new UnauthorizedError('User not authenticated');
    const req = await this.requestRepository.findById(id);
    if (!req) throw new NotFoundError('Request not found');
    if (req.tenantId !== user.tenantId) throw new UnauthorizedError('Forbidden');
    return this.requestRepository.delete(id);
  }
}

module.exports = RequestService;
