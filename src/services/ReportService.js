const { UnauthorizedError, NotFoundError } = require('../utils/errors');
const { extractZipFile, generatePublicRoutes } = require('../utils/fileUtil');
const path = require('path');
const fs = require('fs');

class ReportService {
  constructor(reportRepository) {
    this.reportRepository = reportRepository;
  }

  async createReport(reportData) {
    // Ensure scenarioIds is always an array
    if (reportData.scenarioId && !reportData.scenarioIds) {
      reportData.scenarioIds = Array.isArray(reportData.scenarioId) 
        ? reportData.scenarioId 
        : [reportData.scenarioId];
      delete reportData.scenarioId;
    }
    
    // Set default status if not provided
    if (!reportData.status) {
      reportData.status = 'pending';
    }
    
    return this.reportRepository.create(reportData);
  }

  async listReportsByUserId(userId, status = null) {
    if (status) {
      const reports = await this.reportRepository.findAllByUserId(userId);
      return reports.filter(report => report.status === status);
    }
    return this.reportRepository.findAllByUserId(userId);
  }

  async listReportsByScenarioId(scenarioId) {
    return this.reportRepository.findByScenarioId(scenarioId);
  }

  async listReportsByStatus(status) {
    return this.reportRepository.findByStatus(status);
  }

  async updateReportStatus(reportId, status, executedAt = null) {
    if (status === 'completed' && !executedAt) {
      executedAt = new Date();
    }
    
    await this.reportRepository.updateStatus(reportId, status, executedAt);
    return this.reportRepository.findById(reportId);
  }

  async updateReportFilePath(reportId, filePath) {
    await this.reportRepository.updateFilePath(reportId, filePath);
    return this.reportRepository.findById(reportId);
  }

  async extractReport(userId, reportId) {
    const report = await this.reportRepository.findById(reportId);

    if (!report) {
      throw new NotFoundError('Report not found');
    }

    if (report.userId !== userId) {
      throw new UnauthorizedError('You are not authorized to access this report');
    }

    if (!report.filePath) {
      throw new NotFoundError('Report file not generated yet');
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
