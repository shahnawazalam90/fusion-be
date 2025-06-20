const { UnauthorizedError, NotFoundError } = require('../utils/errors');
const { extractZipFile, generatePublicRoutes } = require('../utils/fileUtil');
const { formatScenarioMetadata } = require('../utils/metadataFormatter');
const processManager = require('../utils/ProcessManager');
const playwrightManager = require('../utils/PlaywrightManager');
const path = require('path');
const fs = require('fs');
const { sendEmail } = require('../utils/emailUtil'); // Add email utility import

class ReportService {
  constructor(reportRepository, scenarioRepository, userRepository, requestRepository) {
    this.reportRepository = reportRepository;
    this.scenarioRepository = scenarioRepository;
    this.userRepository = userRepository;
    this.requestRepository = requestRepository;
  }

  async createReport(reportData) {
    // Ensure scenarios is always an array of objects [{scenarioId, valuesType}]
    if (reportData.scenarioId && !reportData.scenarios) {
      reportData.scenarios = Array.isArray(reportData.scenarioId)
        ? reportData.scenarioId.map(id => ({ scenarioId: id, valuesType: 'manual' }))
        : [{ scenarioId: reportData.scenarioId, valuesType: 'manual' }];
      delete reportData.scenarioId;
    }
    // If scenarios is a string, parse it
    if (typeof reportData.scenarios === 'string') {
      try {
        reportData.scenarios = JSON.parse(reportData.scenarios);
      } catch (e) {
        throw new Error('scenarios must be an array of objects or a JSON string');
      }
    }
    // Set default status if not provided
    if (!reportData.status) {
      reportData.status = 'pending';
    }

    // Validate valuesType for each scenario
    if (Array.isArray(reportData.scenarios)) {
      for (const scenario of reportData.scenarios) {
        if (!['excel', 'manual'].includes(scenario.valuesType)) {
          throw new Error('valuesType must be either "excel" or "manual"');
        }
      }
    }

    return this.reportRepository.create(reportData);
  }

  async executePlaywrightTest(reportId, dataFile, browser) {
    try {
      // Set initial status to running
      await this.updateReportStatus(reportId, 'running');

      const processInfo = await playwrightManager.executeTest({
        reportId,
        dataFile,
        onStatusUpdate: async (status) => {
          await this.updateReportStatus(reportId, status);
        },
        browser
      });

      return processInfo;
    } catch (error) {
      console.error('Error executing Playwright test:', error);
      // Ensure status is set to failed on any error
      await this.updateReportStatus(reportId, 'failed');
      throw error;
    }
  }

  async getScenariosMetaData(scenarios) {
    const scenarioValuesType = Object.fromEntries(scenarios.map(s => [s.scenarioId, s.valuesType]));
    const scenariosData = await Promise.all(
      Object.keys(scenarioValuesType).map((scenarioId) =>
        this.scenarioRepository.findById(scenarioId)
      )
    ).then((results) => results.filter((scenario) => scenario));

    const requests = {};

    const scenariosDataParsed = scenariosData.map((scenario) => {
      try {
        scenario.jsonMetaData = JSON.parse(scenario.jsonMetaData);

        scenario.jsonMetaData = scenario.jsonMetaData.map((screen) => {
          screen.actions = screen.actions.map((action) => {
            const objectPattern = /(\{[^}]+\})/g;
            if (objectPattern.test(action.raw)) {
              action.raw = action.raw.replace(objectPattern, (match) => {
                const formattedMatch = match
                  .replace(/(\w+):/g, '"$1":')
                  .replace(/'([^']+)'/g, '"$1"');
                return formattedMatch;
              });
            }

            return action;
          });

          if (screen.requestId) {
            requests[screen.requestId] = requests[screen.requestId] || {};
          }

          return screen;
        });
      } catch (e) {
        console.error(`Error parsing JSON for scenario ${scenario.id}:`, e);
        scenario.jsonMetaData = scenario.jsonMetaData || [];
      }

      return scenario;
    });

    await Promise.all(Object.keys(requests).map(async (requestId) =>
      this.requestRepository.findById(requestId)
        .then((request) => {
          if (request) {
            requests[requestId] = {
              name: request.name,
              url: request.url,
              method: request.method,
              headers: JSON.parse(request.headers || '{}'),
              body: JSON.parse(request.payload || '{}'),
              type: request.type,
              expected_body: JSON.parse(request.expectedResponse || '{}'),
              expected_status: request.expectedStatus,
            };

            if (request.type === 'polling') {
              const pollingOptions = JSON.parse(request.pollingOptions);
              requests[requestId].polling_interval = Number(pollingOptions.pollingInterval);
              requests[requestId].polling_timeout = Number(pollingOptions.pollingTimeout);
            }
          } else {
            console.log(`No request found for ID: ${requestId}`);
            requests[requestId] = null; // Set to null if no request found
          }

          return;
        })
    ));

    return scenariosDataParsed.map(scenario => {
      if (typeof scenario.jsonMetaData === 'string') return ({
        id: scenario.id,
        scenario: scenario.name,
        screens: scenario.jsonMetaData,
        url: scenario.url,
      });

      const jsonData = [];

      const jsonMetaData = JSON.parse(JSON.stringify(scenario.jsonMetaData)).map((screen) => {
        const newScreen = { ...screen };

        newScreen.external_services = requests[screen.requestId] ? [requests[screen.requestId]] : [];

        return newScreen;
      });

      if (scenarioValuesType[scenario.id] === 'manual') {
        JSON.parse(scenario.dataManual).forEach(([id, value]) => {
          const [i, j] = id.split(',').map(Number);
          jsonMetaData[i].actions[j].value = value;
        });

        jsonData.push(jsonMetaData);
      } else if (scenarioValuesType[scenario.id] === 'excel') {
        JSON.parse(scenario.dataExcel).forEach(([id, ...value]) => {
          const [i, j] = id.split(',').map(Number);

          value.forEach((val, index) => {
            if (!jsonData[index]) {
              jsonData[index] = JSON.parse(JSON.stringify(jsonMetaData));
            }

            jsonData[index][i].actions[j].value = typeof val !== 'string' ? String(val) : val;
          });
        });
      }

      return jsonData.map((data) => ({
        id: scenario.id,
        scenario: scenario.name,
        screens: data,
        url: scenario.url,
      }));
    }).flat(1);
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

    const scenarioData = await this.getScenariosMetaData(report.scenarios);

    console.log('Scenario data:', scenarioData);

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
            // If process exists and is running, keep it as pending
            if (process.isRunning) {
              newStatus = 'pending';
            } else {
              // Only update status if process has completed
              newStatus = process.exitCode === 0 ? 'completed' : 'failed';
            }
          } else if (report.status === 'pending') {
            // If no process exists but folder exists, check for test results
            const testResultsPath = path.join(reportFolderPath, 'test-results');
            if (fs.existsSync(testResultsPath)) {
              // Check if there are any failed tests in the results
              const hasFailedTests = await this.checkForFailedTests(testResultsPath);
              newStatus = hasFailedTests ? 'failed' : 'completed';
            } else {
              // If no test results exist but process is gone, mark as failed
              newStatus = 'failed';
            }
          }

          // Always update filepath if folder exists
          await this.updateReportFilePath(report.id, folderName);
          
          // Only update status if it has changed
          if (newStatus !== report.status) {
            await this.updateReportStatus(report.id, newStatus);
          }
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
      const user = await this.userRepository.findById(updatedReport.userId);
      if (!user) {
        throw new Error('User not found');
      }
      // Fetch scenario names
      const scenarioIds = updatedReport.scenarios.map(s => s.scenarioId);
      const scenarios = await Promise.all(
        scenarioIds.map((id) => this.scenarioRepository.findById(id))
      );
      const scenarioNames = scenarios
        .filter(scenario => scenario !== null) // Filter out null scenarios
        .map((scenario) => scenario.name)
        .join(', ');

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

  getProcessedScenarioIds = (scenarios, res) => {
    // Accepts array of objects or JSON string
    let processedScenarios;
    if (typeof scenarios === 'string') {
      try {
        processedScenarios = JSON.parse(scenarios);
      } catch (e) {
        return res.status(400).json({
          status: 'error',
          message: 'scenarios must be provided as an array of objects or JSON string',
        });
      }
    } else if (Array.isArray(scenarios)) {
      processedScenarios = scenarios;
    } else {
      return res.status(400).json({
        status: 'error',
        message: 'scenarios must be provided as an array of objects or JSON string',
      });
    }
    return processedScenarios;
  };

  getReportJSON = async (req, res) => {
    const { scenarios } = req.body;

    if (!scenarios) {
      return res.status(400).json({
        status: 'error',
        message: 'scenarios are required',
      });
    }

    const processedScenarios = this.getProcessedScenarioIds(scenarios, res);
    const scenarioData = await this.getScenariosMetaData(processedScenarios);

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
