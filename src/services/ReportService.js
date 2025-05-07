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

    // Execute the Playwright script with the generated metadata file
    // const executionResult = await this.executePlaywrightScript(filePath);
    
    // // Update the report status based on the execution result
    // if (executionResult.success) {
    //   await this.updateReportStatus(reportId, 'completed');
    // } else {
    //   await this.updateReportStatus(reportId, 'failed');
    // }
    
    return filePath;
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
}

module.exports = ReportService;
