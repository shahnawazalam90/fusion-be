const { catchAsync } = require('../../../utils/catchAsync');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { extractZipFile, generatePublicRoutes } = require('../../../utils/fileUtil');
const playwrightManager = require('../../../utils/PlaywrightManager');

const upload = multer({ dest: 'uploads/reports/' });

class ReportController {
  constructor(reportService) {
    this.reportService = reportService;
  }

  getProcessedScenarioIds = (scenarios) => {
    // Accepts array of objects or JSON string
    let processedScenarios;
    if (typeof scenarios === 'string') {
      try {
        processedScenarios = JSON.parse(scenarios);
      } catch (e) {
        throw new Error('scenarios must be provided as an array of objects or JSON string');
      }
    } else if (Array.isArray(scenarios)) {
      processedScenarios = scenarios;
    } else {
      throw new Error('scenarios must be provided as an array of objects or JSON string');
    }

    // Validate valuesType for each scenario
    if (Array.isArray(processedScenarios)) {
      for (const scenario of processedScenarios) {
        if (!['excel', 'manual'].includes(scenario.valuesType)) {
          throw new Error('valuesType must be either "excel" or "manual"');
        }
      }
    }
    return processedScenarios;
  };

  createReport = catchAsync(async (req, res) => {
    const { scenarios, status = 'pending', browser } = req.body;

    let processedScenarios;
    try {
      processedScenarios = this.getProcessedScenarioIds(scenarios);
    } catch (err) {
      return res.status(400).json({
        status: 'error',
        message: err.message,
      });
    }

    const reportData = {
      userId: req.userId,
      scenarios: processedScenarios,
      status
    };

    const report = await this.reportService.createReport(reportData);

    // Generate and save scenario metadata file
    try {
      const scenarioFilePath = await this.reportService.saveScenarioMetadata(report.id);
      report.scenarioFile = scenarioFilePath;

      // Extract filename from the full path
      const filename = path.basename(scenarioFilePath);

      // Execute Playwright test
      const processInfo = await this.reportService.executePlaywrightTest(
        report.id,
        filename
      );

      res.status(201).json({
        status: 'success',
        data: report,
        message: 'Report created and test execution started',
        processInfo: {
          started: processInfo.startTime,
          status: 'running'
        }
      });
    } catch (error) {
      console.error('Error saving scenario metadata or executing Playwright:', error);
      // Update status to failed if there's an error
      await this.reportService.updateReportStatus(report.id, 'failed');
      throw error;
    }
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
    try {
      const reports = await this.reportService.listReportsByUserId(req.userId);
      
      // Check for running reports and update their status if needed
      const updatedReports = await Promise.all(reports.map(async (report) => {
        if (report.status === 'running') {
          const process = await this.reportService.getReportProcess(report.id);
          if (process && !process.isRunning) {
            await this.reportService.updateReportStatus(report.id, process.exitCode === 0 ? 'completed' : 'failed');
            return { ...report, status: process.exitCode === 0 ? 'completed' : 'failed' };
          }
        }
        return report;
      }));

      res.json({
        success: true,
        data: updatedReports
      });
    } catch (error) {
      console.error('Error in listReports:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to list reports',
        error: error.message
      });
    }
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

  async getScenarioMetadata(req, res) {
    try {
      const { filename } = req.params;
      const scenariosDir = path.join(__dirname, '../../../../uploads/scenarios');
      const filePath = path.join(scenariosDir, filename);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: `Scenario metadata file ${filename} not found`
        });
      }

      // Read and parse the JSON file
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const metadata = JSON.parse(fileContent);

      return res.status(200).json({
        success: true,
        data: metadata
      });
    } catch (error) {
      console.error('Error getting scenario metadata:', error);
      return res.status(500).json({
        success: false,
        message: 'Error retrieving scenario metadata',
        error: error.message
      });
    }
  }

  getReportJSON = catchAsync(async (req, res) => {
    const { scenarios } = req.body;

    if (!scenarios) {
      return res.status(400).json({
        status: 'error',
        message: 'scenarios are required',
      });
    }

    let processedScenarios;
    try {
      processedScenarios = this.getProcessedScenarioIds(scenarios);
    } catch (err) {
      return res.status(400).json({
        status: 'error',
        message: err.message,
      });
    }
    const scenarioData = await this.reportService.getScenariosMetaData(processedScenarios);

    res.status(200).json({
      status: 'success',
      data: scenarioData,
    });
  });

  deleteAllReports = catchAsync(async (req, res) => {
    try {
      // Get all reports for the current user
      const reports = await this.reportService.listReportsByUserId(req.userId);

      // Delete associated files
      for (const report of reports) {
        if (report.filePath) {
          const filePath = path.join('uploads/reports', report.filePath);
          const extractDir = filePath.replace('.zip', '');

          // Delete the zip file if it exists
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Deleted file: ${filePath}`);
          }

          // Delete the extracted directory if it exists
          if (fs.existsSync(extractDir)) {
            fs.rmSync(extractDir, { recursive: true, force: true });
            console.log(`Deleted directory: ${extractDir}`);
          }
        }

        // Delete scenario metadata file if it exists
        if (report.scenarioFile) {
          const scenarioPath = path.join('uploads/scenarios', path.basename(report.scenarioFile));
          if (fs.existsSync(scenarioPath)) {
            fs.unlinkSync(scenarioPath);
            console.log(`Deleted scenario file: ${scenarioPath}`);
          }
        }
      }

      // Delete all reports from database
      const deletedCount = await this.reportService.deleteAllReports(req.userId);

      return res.status(200).json({
        status: 'success',
        message: `Successfully deleted ${deletedCount} reports and their associated files`,
        data: {
          deletedReports: deletedCount,
          deletedFiles: reports.length
        }
      });
    } catch (error) {
      console.error('Error deleting reports:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Error deleting reports',
        error: error.message
      });
    }
  });

  /**
   * Stream test execution updates using Server-Sent Events
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  streamTestExecution = catchAsync(async (req, res) => {
    const { reportId } = req.params;
    
    // Add client to PlaywrightManager for SSE
    playwrightManager.addClient(reportId, res);
  });
}

module.exports = ReportController;
