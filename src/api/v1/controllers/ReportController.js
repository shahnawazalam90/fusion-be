const { catchAsync } = require('../../../utils/catchAsync');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { extractZipFile, generatePublicRoutes } = require('../../../utils/fileUtil');
const { spawn } = require('child_process');

const upload = multer({ dest: 'uploads/reports/' });

class ReportController {
  constructor(reportService) {
    this.reportService = reportService;
  }

  getProcessedScenarioIds = (scenarioIds, res) => {
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

    return processedScenarioIds;
  };

  createReport = catchAsync(async (req, res) => {
    const { scenarioIds, status = 'pending' } = req.body;

    const reportData = {
      userId: req.userId,
      scenarioIds: this.getProcessedScenarioIds(scenarioIds),
      status
    };

    const report = await this.reportService.createReport(reportData);

    // Generate and save scenario metadata file
    try {
      const scenarioFilePath = await this.reportService.saveScenarioMetadata(report.id);
      report.scenarioFile = scenarioFilePath;

      // Extract filename from the full path
      const filename = path.basename(scenarioFilePath);

      console.log('Starting Playwright process with file:', filename);

      // Execute Playwright script
      const playwrightProcess = spawn('npx', [
        'playwright',
        'test',
        '--project=chromium',
        '--headed',
        'uploads/scripts/demo_latest.spec.ts'
      ], {
        env: {
          ...process.env,
          DATAFILE: filename
        },
        stdio: ['inherit', 'pipe', 'pipe'] // Capture stdout and stderr
      });

      // Store process information
      this.reportService.activeProcesses.set(report.id, {
        pid: playwrightProcess.pid,
        startTime: new Date().toISOString(),
        isRunning: true,
        exitCode: null
      });

      // Log process information
      console.log('Playwright Process ID:', playwrightProcess.pid);
      console.log('Process started at:', new Date().toISOString());

      let testOutput = '';
      let testError = '';

      // Handle stdout
      playwrightProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(`Playwright stdout: ${output}`);
        testOutput += output;

        // Check for timeout in the output
        if (output.includes('Test timeout') || output.includes('exceeded')) {
          console.log('Test timeout detected, marking report as failed');
          this.reportService.updateReportStatus(report.id, 'failed');
          // Update process information
          const processInfo = this.reportService.activeProcesses.get(report.id);
          if (processInfo) {
            processInfo.isRunning = false;
            processInfo.exitCode = -1;
          }
        }
      });

      // Handle stderr
      playwrightProcess.stderr.on('data', (data) => {
        const error = data.toString();
        console.error(`Playwright stderr: ${error}`);
        testError += error;

        // Check for timeout in the error output
        if (error.includes('Test timeout') || error.includes('exceeded')) {
          console.log('Test timeout detected in error output, marking report as failed');
          this.reportService.updateReportStatus(report.id, 'failed');
          // Update process information
          const processInfo = this.reportService.activeProcesses.get(report.id);
          if (processInfo) {
            processInfo.isRunning = false;
            processInfo.exitCode = -1;
          }
        }
      });

      playwrightProcess.on('error', (error) => {
        console.error('Failed to start Playwright process:', error);
        this.reportService.updateReportStatus(report.id, 'failed');
        // Update process information
        const processInfo = this.reportService.activeProcesses.get(report.id);
        if (processInfo) {
          processInfo.isRunning = false;
          processInfo.exitCode = -1;
        }
      });

      // Update report status to 'running' when test starts
      await this.reportService.updateReportStatus(report.id, 'running');

      // Handle test completion
      playwrightProcess.on('close', async (code, signal) => {
        console.log(`Playwright process exited with code ${code} and signal ${signal}`);
        console.log('Process ended at:', new Date().toISOString());

        // Update process information
        const processInfo = this.reportService.activeProcesses.get(report.id);
        if (processInfo) {
          processInfo.isRunning = false;
          processInfo.exitCode = code;
        }

        // Update report status based on test result
        const newStatus = code === 0 ? 'completed' : 'failed';
        await this.reportService.updateReportStatus(report.id, newStatus);
      });

      // Handle process termination
      playwrightProcess.on('exit', (code, signal) => {
        console.log(`Playwright process terminated with code ${code} and signal ${signal}`);
        // If the process exits with a non-zero code, mark as failed
        if (code !== 0) {
          this.reportService.updateReportStatus(report.id, 'failed');
        }
      });

    } catch (error) {
      console.error('Error saving scenario metadata or executing Playwright:', error);
      // Update status to failed if there's an error
      await this.reportService.updateReportStatus(report.id, 'failed');
    }

    res.status(201).json({
      status: 'success',
      data: report,
      message: 'Report created and test execution started',
      processInfo: {
        started: new Date().toISOString(),
        status: 'running'
      }
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
    try {
      const reports = await this.reportService.listReportsByUserId(req.userId);

      // Enhance reports with running status
      const enhancedReports = await Promise.all(reports.map(async (report) => {
        const reportData = report.toJSON();

        // Check if report is running by checking its process
        if (reportData.status === 'running') {
          try {
            // Check if process exists and is running
            const process = await this.reportService.getReportProcess(reportData.id);
            if (!process || !process.isRunning) {
              // Update status to failed if process is not running
              await this.reportService.updateReportStatus(reportData.id, 'failed');
              reportData.status = 'failed';
            } else {
              reportData.processInfo = {
                pid: process.pid,
                startTime: process.startTime,
                isRunning: true
              };
            }
          } catch (error) {
            console.error(`Error checking process for report ${reportData.id}:`, error);
            // Update status to failed if there's an error checking the process
            await this.reportService.updateReportStatus(reportData.id, 'failed');
            reportData.status = 'failed';
          }
        }

        return reportData;
      }));

      return res.status(200).json({
        status: 'success',
        data: {
          reports: enhancedReports
        }
      });
    } catch (error) {
      console.error('Error in listReports:', error);
      return res.status(500).json({
        status: 'error',
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
    const { scenarioIds } = req.body;

    if (!scenarioIds) {
      return res.status(400).json({
        status: 'error',
        message: 'scenarioIds are required',
      });
    }

    const processedScenarioIds = this.getProcessedScenarioIds(scenarioIds, res);
    const scenarioData = await this.reportService.getScenariosMetaData(processedScenarioIds);

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
}

module.exports = ReportController;
