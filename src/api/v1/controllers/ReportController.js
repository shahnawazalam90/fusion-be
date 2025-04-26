const { catchAsync } = require('../../../utils/catchAsync');
const path = require('path');
const fs = require('fs');

class ReportController {
  constructor(reportService) {
    this.reportService = reportService;
  }

  uploadReport = catchAsync(async (req, res) => {
    const { scenarioId } = req.body;

    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No file uploaded',
      });
    }

    const filePath = path.join('uploads/reports', req.file.filename);

    const reportData = {
      userId: req.userId,
      scenarioId,
      filePath,
    };

    const report = await this.reportService.createReport(reportData);

    res.status(201).json({
      status: 'success',
      data: report,
    });
  });

  listReports = catchAsync(async (req, res) => {
    const reports = await this.reportService.listReportsByUserId(req.userId);

    res.status(200).json({
      status: 'success',
      data: reports,
    });
  });
}

module.exports = ReportController;
