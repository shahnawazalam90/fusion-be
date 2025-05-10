/**
 * Utility class to manage active processes
 */
class ProcessManager {
  constructor() {
    this.activeProcesses = new Map();
  }

  /**
   * Add a new process to the active processes map
   * @param {string} reportId - The ID of the report associated with the process
   * @param {Object} processInfo - Process information including pid, startTime, etc.
   */
  addProcess(reportId, processInfo) {
    this.activeProcesses.set(reportId, {
      ...processInfo,
      isRunning: true,
      exitCode: null
    });
  }

  /**
   * Get process information for a specific report
   * @param {string} reportId - The ID of the report
   * @returns {Object|null} Process information or null if not found
   */
  getProcess(reportId) {
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

  /**
   * Update the status of a process
   * @param {string} reportId - The ID of the report
   * @param {boolean} isRunning - Whether the process is running
   * @param {number} exitCode - The exit code of the process
   */
  updateProcessStatus(reportId, isRunning, exitCode) {
    const process = this.activeProcesses.get(reportId);
    if (process) {
      process.isRunning = isRunning;
      process.exitCode = exitCode;
    }
  }

  /**
   * Remove a process from the active processes map
   * @param {string} reportId - The ID of the report
   */
  removeProcess(reportId) {
    this.activeProcesses.delete(reportId);
  }

  /**
   * Get all active processes
   * @returns {Map} Map of all active processes
   */
  getAllProcesses() {
    return this.activeProcesses;
  }
}

module.exports = new ProcessManager(); 