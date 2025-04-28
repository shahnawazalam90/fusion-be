const { UnauthorizedError, NotFoundError } = require('../utils/errors');
const { extractZipFile, generatePublicRoutes } = require('../utils/fileUtil');
const path = require('path');
const fs = require('fs');

class ReportService {
  constructor(reportRepository) {
    this.reportRepository = reportRepository;
  }

  async createReport(reportData) {
    return this.reportRepository.create(reportData);
  }

  async listReportsByUserId(userId) {
    return this.reportRepository.findAllByUserId(userId);
  }

  async extractReport(userId, reportId) {
    const report = await this.reportRepository.findById(reportId);

    if (!report) {
      throw new NotFoundError('Report not found');
    }

    if (report.userId !== userId) {
      throw new UnauthorizedError('You are not authorized to access this report');
    }

    const zipFilePath = report.filePath;
    const extractDir = zipFilePath.replace('.zip', '');

    // Check if the folder already exists
    if (!fs.existsSync(extractDir)) {
      await extractZipFile(zipFilePath, extractDir);
    }

    // Generate public routes for the extracted files
    return generatePublicRoutes(extractDir);
  }

  async getReportById(userId, reportId) {
    const report = await this.reportRepository.findById(reportId);

    if (!report) {
      throw new NotFoundError('Report not found');
    }

    if (report.userId !== userId) {
      throw new UnauthorizedError('You are not authorized to access this report');
    }

    return report;
  }
}

module.exports = ReportService;
