const { UnauthorizedError, NotFoundError } = require('../utils/errors');
const { extractZipFile, generatePublicRoutes } = require('../utils/fileUtil');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class ReportService {
  constructor(reportRepository, scenarioRepository) {
    this.reportRepository = reportRepository;
    this.scenarioRepository = scenarioRepository;
    this.activeProcesses = new Map(); // Store active processes
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

  async executePlaywrightScript(scenarioMetadataPath) {
    try {
      // Ensure the scripts directory exists
      const scriptsDir = 'uploads/scripts';
      if (!fs.existsSync(scriptsDir)) {
        throw new Error('Playwright scripts directory not found');
      }

      // Set the DATAFILE environment variable to point to our scenario metadata
      const env = {
        ...process.env,
        DATAFILE: path.basename(scenarioMetadataPath)
      };

      // Execute the Playwright script
      const { stdout, stderr } = await execPromise(
        'npx playwright test --project=chromium uploads/scripts/demo_latest.spec.js',
        { env }
      );

      console.log('Playwright script output:', stdout);
      if (stderr) {
        console.error('Playwright script errors:', stderr);
      }

      return { success: true, output: stdout };
    } catch (error) {
      console.error('Error executing Playwright script:', error);
      return { success: false, error: error.message };
    }
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
    
    // Get metadata for each scenario
    const scenarioData = [];
    for (const scenarioId of report.scenarioIds) {
      const scenario = await this.scenarioRepository.findById(scenarioId);
      if (scenario) {
        let jsonData;
        try {
          jsonData = JSON.parse(scenario.jsonMetaData);
          jsonData = jsonData.map((screen) => {
            let newScreen = {...screen}
            newScreen['actions'] = screen.actions.map((action) => {
              const objectPattern = /(\{[^}]+\})/g;
              if (objectPattern.test(action.raw)) {
                action.raw = action.raw.replace(objectPattern, (match) => {
                  // Replace properties like name: 'value' with "name": "value"
                  const formattedMatch = match
                    .replace(/(\w+):/g, '"$1":')  // Add quotes to keys
                    .replace(/'([^']+)'/g, '"$1"'); // Replace single quotes with double quotes
                  return formattedMatch;
                });
              }
              return action
            })
            return newScreen
          })
        } catch (e) {
          // If it's not valid JSON, use it as a string
          jsonData = scenario.jsonMetaData;
        }
        
        scenarioData.push({
          id: scenario.id,
          scenario: scenario.name,
          screens: jsonData,
          url: scenario.url
        });
      }
    }
    
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
      reports = reports.filter(report => report.status === status);
    } else {
      reports = await this.reportRepository.findAllByUserId(userId);
    }

    // Sort reports by createdAt in descending order
    reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Check pending reports for folder existence
    const pendingReports = reports.filter(report => report.filePath == null || report.filePath == '');
    for (const report of pendingReports) {
      if (report.scenarioFile) {
        // Get the basename without extension
        const folderName = path.basename(report.scenarioFile, path.extname(report.scenarioFile));
        const reportFolderPath = path.join('uploads', 'reports', folderName);

        // Check if folder exists
        if (fs.existsSync(reportFolderPath)) {
          // Update report status and filepath with just the folder name
          await this.updateReportStatus(report.id, report.status == 'pending' ? 'completed' : report.status);
          await this.updateReportFilePath(report.id, folderName);
        }
      }
    }

    // Get updated reports
    if (status) {
      reports = await this.reportRepository.findAllByUserId(userId);
      return reports.filter(report => report.status === status)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return this.reportRepository.findAllByUserId(userId)
      .then(reports => reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
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
    const process = this.activeProcesses.get(reportId);
    if (!process) {
      return null;
    }

    try {
      // Check if process is still running
      process.isRunning = process.pid && process.exitCode === null;
      return process;
    } catch (error) {
      console.error('Error checking process status:', error);
      return null;
    }
  }
}

module.exports = ReportService;
