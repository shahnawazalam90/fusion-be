const { spawn } = require('child_process');
const processManager = require('./ProcessManager');

/**
 * Utility class to manage Playwright test execution
 */
class PlaywrightManager {
  constructor() {
    this.clients = new Map(); // Map of reportId to Set of SSE clients
  }

  /**
   * Add a new SSE client for a report
   * @param {string} reportId - The ID of the report
   * @param {Object} res - Express response object
   */
  addClient(reportId, res) {
    // Set headers for SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    // Send initial connection message
    res.write(`event: connected\ndata: ${JSON.stringify({ message: 'Connected to test stream' })}\n\n`);

    // Create heartbeat interval (every 5 seconds)
    const heartbeat = setInterval(() => {
      if (res.writableEnded) {
        clearInterval(heartbeat);
        return;
      }
      res.write(':\n\n');
    }, 5000);

    // Store client
    if (!this.clients.has(reportId)) {
      this.clients.set(reportId, new Set());
    }
    this.clients.get(reportId).add({ res, heartbeat });

    // Handle client disconnect
    res.on('close', () => {
      this.removeClient(reportId, res);
    });

    // Handle errors
    res.on('error', (error) => {
      console.error('SSE connection error:', error);
      this.removeClient(reportId, res);
    });
  }

  /**
   * Remove a client
   * @param {string} reportId - The ID of the report
   * @param {Object} res - Express response object
   */
  removeClient(reportId, res) {
    const clients = this.clients.get(reportId);
    if (clients) {
      const client = Array.from(clients).find(c => c.res === res);
      if (client) {
        clearInterval(client.heartbeat);
        clients.delete(client);
        if (clients.size === 0) {
          this.clients.delete(reportId);
        }
      }
    }
  }

  /**
   * Send an event to all clients for a report
   * @param {string} reportId - The ID of the report
   * @param {string} type - Event type (status/output/error)
   * @param {Object} data - Event data
   */
  sendEvent(reportId, type, data) {
    const clients = this.clients.get(reportId);
    if (clients) {
      const event = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
      clients.forEach(client => {
        client.res.write(event);
      });
    }
  }

  /**
   * Execute a Playwright test
   * @param {Object} options - Execution options
   * @param {string} options.reportId - The ID of the report
   * @param {string} options.dataFile - Path to the data file
   * @returns {Promise<Object>} Process information
   */
  async executeTest({ reportId, dataFile }) {
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

        // Send initial status
        this.sendEvent(reportId, 'status', { status: 'running', ...processInfo });

        // Handle stdout
        playwrightProcess.stdout.on('data', (data) => {
          const output = data.toString();
          console.log(`Playwright stdout: ${output}`);
          this.sendEvent(reportId, 'output', { output });
        });

        // Handle stderr
        playwrightProcess.stderr.on('data', (data) => {
          const error = data.toString();
          console.error(`Playwright stderr: ${error}`);
          this.sendEvent(reportId, 'error', { error });
        });

        // Handle process errors
        playwrightProcess.on('error', (error) => {
          console.error('Failed to start Playwright process:', error);
          processManager.updateProcessStatus(reportId, false, -1);
          this.sendEvent(reportId, 'error', { error: error.message });
          this.sendEvent(reportId, 'status', { status: 'failed' });
          reject(error);
        });

        // Handle test completion
        playwrightProcess.on('close', async (code, signal) => {
          console.log(`Playwright process exited with code ${code} and signal ${signal}`);
          processManager.updateProcessStatus(reportId, false, code);
          const status = code === 0 ? 'completed' : 'failed';
          this.sendEvent(reportId, 'status', { status, exitCode: code });
          resolve(processInfo);
        });

        resolve(processInfo);
      } catch (error) {
        console.error('Error executing Playwright test:', error);
        processManager.updateProcessStatus(reportId, false, -1);
        this.sendEvent(reportId, 'error', { error: error.message });
        this.sendEvent(reportId, 'status', { status: 'failed' });
        reject(error);
      }
    });
  }
}

module.exports = new PlaywrightManager(); 