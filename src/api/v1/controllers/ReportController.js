const { catchAsync } = require('../../../utils/catchAsync');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { extractZipFile, generatePublicRoutes } = require('../../../utils/fileUtil');

const upload = multer({ dest: 'uploads/reports/' });

class ReportController {
  constructor(reportService) {
    this.reportService = reportService;
  }

  createReport = catchAsync(async (req, res) => {
    const { scenarioIds, status = 'pending' } = req.body;

    // Handle both string and array formats for scenarioIds
    let processedScenarioIds;
    if (typeof scenarioIds === 'string') {
      try {
        // Try to parse as JSON array
        processedScenarioIds = JSON.parse(scenarioIds);
      } catch (e) {
        // If not valid JSON, treat as comma-separated string
        processedScenarioIds = scenarioIds.split(',').map(id => id.trim());
      }
    } else if (Array.isArray(scenarioIds)) {
      processedScenarioIds = scenarioIds;
    } else {
      return res.status(400).json({
        status: 'error',
        message: 'scenarioIds must be provided as an array or comma-separated string',
      });
    }

    const reportData = {
      userId: req.userId,
      scenarioIds: processedScenarioIds,
      status
    };

    const report = await this.reportService.createReport(reportData);
    
    // Generate and save scenario metadata file
    try {
      const scenarioFilePath = await this.reportService.saveScenarioMetadata(report.id);
      report.scenarioFile = scenarioFilePath;
    } catch (error) {
      console.error('Error saving scenario metadata:', error);
      // Continue even if metadata saving fails
    }

    res.status(201).json({
      status: 'success',
      data: report,
    });
  });

  uploadReport = catchAsync(async (req, res, next) => {
    upload.single('file')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          status: 'error',
          message: err.message || 'File upload error',
        });
      }

      const { reportId } = req.body;

      if (!reportId) {
        return res.status(400).json({
          status: 'error',
          message: 'Report ID is required',
        });
      }

      if (!req.file) {
        return res.status(400).json({
          status: 'error',
          message: 'No file uploaded',
        });
      }

      // Generate a unique filename
      const timestamp = new Date().getTime();
      const newFileName = `report-${timestamp}${path.extname(req.file.originalname)}`;
      const newFilePath = path.join('uploads/reports', newFileName);

      fs.renameSync(req.file.path, newFilePath);

      // Get the report first to check authorization
      const report = await this.reportService.getReportById(req.userId, reportId);
      
      // Update file path and status
      const updatedReport = await this.reportService.updateReportFilePath(reportId, newFilePath);
      const completedReport = await this.reportService.updateReportStatus(reportId, 'completed', new Date());

      res.status(200).json({
        status: 'success',
        data: completedReport,
      });

      // Extract the zip file asynchronously after sending the response
      const extractDir = newFilePath.replace('.zip', '');
      try {
        await extractZipFile(newFilePath, extractDir);
      } catch (extractionError) {
        console.error('Error extracting zip file:', extractionError);
      }
    });
  });

  listReports = catchAsync(async (req, res) => {
    const { scenarioId, status } = req.query;
    
    let reports;
    if (scenarioId) {
      reports = await this.reportService.listReportsByScenarioId(scenarioId);
      // Filter by status if provided
      if (status) {
        reports = reports.filter(report => report.status === status);
      }
    } else if (status) {
      reports = await this.reportService.listReportsByUserId(req.userId, status);
    } else {
      reports = await this.reportService.listReportsByUserId(req.userId);
    }

    res.status(200).json({
      status: 'success',
      data: reports,
    });
  });

  updateReportStatus = catchAsync(async (req, res) => {
    const { reportId, status } = req.body;

    if (!reportId || !status) {
      return res.status(400).json({
        status: 'error',
        message: 'Report ID and status are required',
      });
    }

    const validStatuses = ['pending', 'running', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: `Status must be one of: ${validStatuses.join(', ')}`,
      });
    }

    // First verify that the user has access to this report
    await this.reportService.getReportById(req.userId, reportId);
    
    const executedAt = status === 'completed' ? new Date() : null;
    const updatedReport = await this.reportService.updateReportStatus(reportId, status, executedAt);

    res.status(200).json({
      status: 'success',
      data: updatedReport,
    });
  });

  viewReport = catchAsync(async (req, res) => {
    const { reportId } = req.body;

    if (!reportId) {
      return res.status(400).json({
        status: 'error',
        message: 'Report ID is required',
      });
    }

    // Check user access and retrieve the report
    const report = await this.reportService.getReportById(req.userId, reportId);

    if (!report) {
      console.error(`Report not found for ID: ${reportId}, User ID: ${req.userId}`);
      return res.status(404).json({
        status: 'error',
        message: 'Report not found',
      });
    }

    if (!report.filePath) {
      return res.status(404).json({
        status: 'error',
        message: 'Report file not generated yet',
      });
    }

    const reportFolderPath = path.join('uploads', 'reports', report.filePath);
    console.log(reportFolderPath, '===========>>>>>EXTRACT DIR+')
    console.log(report.filePath, '===========>>>>>REPORT FILE PATH+')
    if (!fs.existsSync(reportFolderPath)) {
      return res.status(404).json({
        status: 'error',
        message: 'Extracted files not found',
      });
    }

    // Generate public routes for the extracted files
    const publicUrls = generatePublicRoutes(reportFolderPath);

    res.status(200).json({
      status: 'success',
      data: publicUrls,
    });
  });
}

module.exports = ReportController;
