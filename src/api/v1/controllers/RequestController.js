const { catchAsync } = require('../../../utils/catchAsync');

class RequestController {
  constructor(requestService) {
    this.requestService = requestService;
  }

  createRequest = catchAsync(async (req, res) => {
    const request = await this.requestService.createRequest(req.body, { tenantId: req.tenantId });
    res.status(201).json({ status: 'success', data: request });
  });

  listRequests = catchAsync(async (req, res) => {
    const requests = await this.requestService.getRequests({ tenantId: req.tenantId });
    res.status(200).json({ status: 'success', data: requests });
  });

  getRequest = catchAsync(async (req, res) => {
    const request = await this.requestService.getRequestById(req.params.id, { tenantId: req.tenantId });
    res.status(200).json({ status: 'success', data: request });
  });

  updateRequest = catchAsync(async (req, res) => {
    const updated = await this.requestService.updateRequest(req.params.id, req.body, { tenantId: req.tenantId });
    res.status(200).json({ status: 'success', data: updated });
  });

  deleteRequest = catchAsync(async (req, res) => {
    await this.requestService.deleteRequest(req.params.id, { tenantId: req.tenantId });
    res.status(204).send();
  });
}

module.exports = RequestController;
