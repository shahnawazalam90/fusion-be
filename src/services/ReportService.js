const { UnauthorizedError, NotFoundError } = require('../utils/errors');
const { extractZipFile, generatePublicRoutes } = require('../utils/fileUtil');
const { formatScenarioMetadata } = require('../utils/metadataFormatter');
const processManager = require('../utils/ProcessManager');
const playwrightManager = require('../utils/PlaywrightManager');
const path = require('path');
const fs = require('fs');
const { sendEmail } = require('../utils/emailUtil'); // Add email utility import

class ReportService {
  constructor(reportRepository, scenarioRepository, userRepository) {
    this.reportRepository = reportRepository;
    this.scenarioRepository = scenarioRepository;
    this.userRepository = userRepository; // Add userRepository
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

  async executePlaywrightTest(reportId, dataFile) {
    try {
      const processInfo = await playwrightManager.executeTest({
        reportId,
        dataFile,
        onStatusUpdate: async (status) => {
          await this.updateReportStatus(reportId, status);
        }
      });

      return processInfo;
    } catch (error) {
      console.error('Error executing Playwright test:', error);
      await this.updateReportStatus(reportId, 'failed');
      throw error;
    }
  }

  async getScenariosMetaData(scenarioIds) {
    // Fetch all scenarios concurrently
    const scenarios = await Promise.all(
      scenarioIds.map((scenarioId) =>
        this.scenarioRepository.findById(scenarioId)
      )
    );

    // Process each scenario
    const scenarioData = scenarios
      .filter((scenario) => scenario) // Filter out null or undefined scenarios
      .map((scenario) => {
        let jsonData;
        try {
          jsonData = JSON.parse(scenario.jsonMetaData);
          jsonData = jsonData.map((screen) => {
            let newScreen = { ...screen };
            newScreen['actions'] = screen.actions.map((action) => {
              const objectPattern = /(\{[^}]+\})/g;
              if (objectPattern.test(action.raw)) {
                action.raw = action.raw.replace(objectPattern, (match) => {
                  // Replace properties like name: 'value' with "name": "value"
                  const formattedMatch = match
                    .replace(/(\w+):/g, '"$1":') // Add quotes to keys
                    .replace(/'([^']+)'/g, '"$1"'); // Replace single quotes with double quotes
                  return formattedMatch;
                });
              }
              return action;
            });
            return newScreen;
          });
        } catch (e) {
          // If it's not valid JSON, use it as a string
          jsonData = scenario.jsonMetaData;
        }

        return {
          id: scenario.id,
          scenario: scenario.name,
          screens: jsonData,
          url: scenario.url,
        };
      });

    return scenarioData;
  }

  async saveScenarioMetadata(reportId) {
    const report = await this.reportRepository.findById(reportId);
    if (!report) {
      throw new NotFoundError('Report not found');
    }

    // Make sure the uploads/scenarios directory exists
    const scenariosDir = 'uploads/scenarios';
    if (!fs.existsSync(scenariosDir)) {
      fs.mkdirSync(scenariosDir, { recursive: true });
    }

    const scenarioData = await this.getScenariosMetaData(report.scenarioIds);

    // Generate a unique filename
    const timestamp = new Date().getTime();
    const fileName = `scenario-metadata-${reportId}-${timestamp}.json`;
    const filePath = path.join(scenariosDir, fileName);

    // Write the data to the file
    fs.writeFileSync(filePath, JSON.stringify(scenarioData, null, 2));

    // Update the report with the file path
    await this.reportRepository.updateScenarioFile(reportId, filePath);

    return filePath;
  }

  async listReportsByUserId(userId, status = null) {
    let reports;
    if (status) {
      reports = await this.reportRepository.findAllByUserId(userId);
      reports = reports.filter((report) => report.status === status);
    } else {
      reports = await this.reportRepository.findAllByUserId(userId);
    }

    // Sort reports by createdAt in descending order
    reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Check pending reports for folder existence and process status
    const pendingReports = reports.filter(
      (report) => report.filePath == null || report.filePath == ''
    );
    for (const report of pendingReports) {
      if (report.scenarioFile) {
        // Get the basename without extension
        const folderName = path.basename(
          report.scenarioFile,
          path.extname(report.scenarioFile)
        );
        const reportFolderPath = path.join('uploads', 'reports', folderName);

        // Check if folder exists
        if (fs.existsSync(reportFolderPath)) {
          // Get process status before updating report status
          const process = await this.getReportProcess(report.id);
          let newStatus = report.status;
          
          if (process) {
            // If process exists, use its status
            newStatus = process.exitCode === 0 ? 'completed' : 'failed';
          } else if (report.status === 'pending') {
            // If no process exists but folder exists, check for test results
            const testResultsPath = path.join(reportFolderPath, 'test-results');
            if (fs.existsSync(testResultsPath)) {
              // Check if there are any failed tests in the results
              const hasFailedTests = await this.checkForFailedTests(testResultsPath);
              newStatus = hasFailedTests ? 'failed' : 'completed';
            }
          }

          // Update report status and filepath
          await this.updateReportStatus(report.id, newStatus);
          await this.updateReportFilePath(report.id, folderName);
        }
      }
    }

    // Get updated reports
    if (status) {
      reports = await this.reportRepository.findAllByUserId(userId);
      return reports
        .filter((report) => report.status === status)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return this.reportRepository
      .findAllByUserId(userId)
      .then((reports) =>
        reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      );
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
    const updatedReport = await this.reportRepository.findById(reportId);

    if (status === 'completed' || status === 'failed') {
      // Fetch user email
      const user = await this.userRepository.findById(updatedReport.userId); // Use userRepository directly
      if (!user) {
        throw new Error('User not found');
      }

      // Fetch scenario names
      const scenarioIds = updatedReport.scenarioIds;
      const scenarios = await Promise.all(
        scenarioIds.map((id) => this.scenarioRepository.findById(id))
      );
      const scenarioNames = scenarios.map((scenario) => scenario.name).join(', ');

      // Send email
      const emailBody = `The report you've executed for ${scenarioNames} is complete.`;
      try {
        await sendEmail(user.email, 'Report Execution Complete', emailBody);
      } catch (err) {
        console.log('Error send mail: ', err);
      }
    }

    return updatedReport;
  }

  async updateReportFilePath(reportId, filePath) {
    const newPath = `/public/${filePath}/index.html`;
    await this.reportRepository.updateFilePath(reportId, newPath);
    return this.reportRepository.findById(reportId);
  }

  async updateScenarioFile(reportId, scenarioFile) {
    await this.reportRepository.updateScenarioFile(reportId, scenarioFile);
    return this.reportRepository.findById(reportId);
  }

  async extractReport(userId, reportId) {
    const report = await this.reportRepository.findById(reportId);

    if (!report) {
      throw new NotFoundError('Report not found');
    }

    if (report.userId !== userId) {
      throw new UnauthorizedError(
        'You are not authorized to access this report'
      );
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
      throw new UnauthorizedError(
        'You are not authorized to access this report'
      );
    }

    return report;
  }

  async deleteAllReports(userId) {
    try {
      // First get all reports for the user
      const reports = await this.reportRepository.findAllByUserId(userId);

      // Delete each report
      for (const report of reports) {
        await this.reportRepository.delete(report.id);
      }

      return reports.length; // Return the number of deleted reports
    } catch (error) {
      console.error('Error in deleteAllReports service:', error);
      throw error;
    }
  }

  async getReportProcess(reportId) {
    return processManager.getProcess(reportId);
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

  getReportJSON = async (req, res) => {
    const { scenarioIds } = req.body;

    if (!scenarioIds) {
      return res.status(400).json({
        status: 'error',
        message: 'scenarioIds are required',
      });
    }

    const processedScenarioIds = this.getProcessedScenarioIds(scenarioIds, res);
    const scenarioData = await this.reportService.getScenariosMetaData(
      processedScenarioIds
    );

    res.status(200).json({
      status: 'success',
      data: scenarioData,
    });
  };

  // Helper method to check for failed tests in test results
  async checkForFailedTests(testResultsPath) {
    try {
      const files = await fs.promises.readdir(testResultsPath);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.promises.readFile(path.join(testResultsPath, file), 'utf-8');
          const result = JSON.parse(content);
          if (result.status === 'failed' || result.status === 'timedOut') {
            return true;
          }
        }
      }
      return false;
    } catch (error) {
      console.error('Error checking test results:', error);
      return false;
    }
  }
}

module.exports = ReportService;
