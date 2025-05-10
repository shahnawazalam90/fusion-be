const { spawn } = require('child_process');
const processManager = require('./ProcessManager');

/**
 * Utility class to manage Playwright test execution
 */
class PlaywrightManager {
  /**
   * Execute a Playwright test
   * @param {Object} options - Execution options
   * @param {string} options.reportId - The ID of the report
   * @param {string} options.dataFile - Path to the data file
   * @param {Function} options.onStatusUpdate - Callback for status updates
   * @returns {Promise<Object>} Process information
   */
  async executeTest({ reportId, dataFile, onStatusUpdate }) {
    return new Promise((resolve, reject) => {
      try {
        console.log('Starting Playwright process with file:', dataFile);

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
            DATAFILE: dataFile
          },
          stdio: ['inherit', 'pipe', 'pipe']
        });

        // Store process information
        const processInfo = {
          pid: playwrightProcess.pid,
          startTime: new Date().toISOString(),
          isRunning: true,
          exitCode: null
        };
        processManager.addProcess(reportId, processInfo);

        // Log process information
        console.log('Playwright Process ID:', playwrightProcess.pid);
        console.log('Process started at:', processInfo.startTime);

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
            processManager.updateProcessStatus(reportId, false, -1);
            onStatusUpdate('failed');
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
            processManager.updateProcessStatus(reportId, false, -1);
            onStatusUpdate('failed');
          }
        });

        // Handle process errors
        playwrightProcess.on('error', (error) => {
          console.error('Failed to start Playwright process:', error);
          processManager.updateProcessStatus(reportId, false, -1);
          onStatusUpdate('failed');
          reject(error);
        });

        // Handle test completion
        playwrightProcess.on('close', async (code, signal) => {
          console.log(`Playwright process exited with code ${code} and signal ${signal}`);
          console.log('Process ended at:', new Date().toISOString());

          processManager.updateProcessStatus(reportId, false, code);
          const newStatus = code === 0 ? 'completed' : 'failed';
          onStatusUpdate(newStatus);
          resolve(processInfo);
        });

        // Handle process termination
        playwrightProcess.on('exit', (code, signal) => {
          console.log(`Playwright process terminated with code ${code} and signal ${signal}`);
          if (code !== 0) {
            processManager.updateProcessStatus(reportId, false, code);
            onStatusUpdate('failed');
          }
        });

        resolve(processInfo);
      } catch (error) {
        console.error('Error executing Playwright test:', error);
        processManager.updateProcessStatus(reportId, false, -1);
        onStatusUpdate('failed');
        reject(error);
      }
    });
  }
}

module.exports = new PlaywrightManager(); 