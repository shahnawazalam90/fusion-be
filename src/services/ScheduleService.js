const { v4: uuidv4 } = require('uuid');
const PlaywrightManager = require('../utils/PlaywrightManager');
const ReportService = require('./ReportService');
const path = require('path');
const fs = require('fs');

class ScheduleService {
  constructor(scheduleRepository, reportService) {
    this.scheduleRepository = scheduleRepository;
    this.reportService = reportService;
    this.jobs = new Map();
    this.initializeScheduler();
  }

  async initializeScheduler() {
    try {
      const schedules = await this.scheduleRepository.findActive();
      for (const schedule of schedules) {
        await this.scheduleJob(schedule);
      }
      console.log('Scheduler initialized successfully');
    } catch (error) {
      console.error('Error initializing scheduler:', error);
    }
  }

  async scheduleJob(schedule) {
    try {
      const now = new Date();
      const scheduleTime = new Date(schedule.scheduleTime);

      // If schedule time is in the past, don't schedule it
      if (scheduleTime <= now) {
        console.log(`Schedule ${schedule.name} is in the past, skipping`);
        return;
      }

      // Calculate delay until schedule time
      const delay = scheduleTime.getTime() - now.getTime();

      // Create timeout for the schedule
      const timeoutId = setTimeout(async () => {
        try {
          console.log(`Executing scheduled job: ${schedule.name} at ${new Date().toISOString()}`);
          
          // Create report with all scenarios
          const reportId = uuidv4();
          const report = await this.reportService.createReport({
            id: reportId,
            userId: schedule.createdBy,
            scenarioIds: schedule.scenarioIds,
            status: 'pending'
          });

          if (!report) {
            throw new Error('Failed to create report');
          }

          // Generate and save scenario metadata
          const scenarioFilePath = await this.reportService.saveScenarioMetadata(report.id);
          if (!scenarioFilePath) {
            throw new Error('Failed to save scenario metadata');
          }

          // Ensure the scenarios directory exists
          const scenariosDir = path.join(process.cwd(), 'uploads', 'scenarios');
          if (!fs.existsSync(scenariosDir)) {
            fs.mkdirSync(scenariosDir, { recursive: true });
          }

          // Copy the scenario file to the correct location
          const targetPath = path.join(scenariosDir, path.basename(scenarioFilePath));
          fs.copyFileSync(scenarioFilePath, targetPath);

          // Execute Playwright test
          await this.reportService.executePlaywrightTest(report.id, path.basename(targetPath));

          // Update last run time and deactivate
          await this.scheduleRepository.update(schedule.id, {
            lastRun: new Date(),
            isActive: false
          });

        } catch (error) {
          console.error(`Error executing scheduled job ${schedule.name}:`, error);
        }
      }, delay);

      // Store the timeout
      this.jobs.set(schedule.id, timeoutId);
      
      console.log(`Scheduled job ${schedule.name} to run at ${schedule.scheduleTime}`);

      return timeoutId;
    } catch (error) {
      console.error(`Error scheduling job ${schedule.name}:`, error);
      throw error;
    }
  }

  async createSchedule(scheduleData) {
    try {
      // Ensure scenarioIds is an array
      if (typeof scheduleData.scenarioIds === 'string') {
        try {
          // Try to parse as JSON array
          const parsed = JSON.parse(scheduleData.scenarioIds);
          if (Array.isArray(parsed)) {
            scheduleData.scenarioIds = parsed;
          } else {
            // Try to split by comma if not a JSON array
            scheduleData.scenarioIds = scheduleData.scenarioIds.split(',').map(s => s.trim()).filter(Boolean);
          }
        } catch (e) {
          // Try to split by comma if JSON.parse fails
          if (scheduleData.scenarioIds.includes(',')) {
            scheduleData.scenarioIds = scheduleData.scenarioIds.split(',').map(s => s.trim()).filter(Boolean);
          } else {
            throw new Error('scenarioIds must be an array or a comma-separated string');
          }
        }
      }
      if (!Array.isArray(scheduleData.scenarioIds)) {
        throw new Error('scenarioIds must be an array');
      }

      // Convert schedule time to UTC
      const scheduleTime = new Date(scheduleData.scheduleTime);
      scheduleData.scheduleTime = scheduleTime;

      const schedule = await this.scheduleRepository.create(scheduleData);
      if (schedule.isActive) {
        await this.scheduleJob(schedule);
      }
      return schedule;
    } catch (error) {
      console.error('Error creating schedule:', error);
      throw error;
    }
  }

  async updateSchedule(scheduleId, updateData) {
    try {
      const schedule = await this.scheduleRepository.findById(scheduleId);
      if (!schedule) {
        throw new Error('Schedule not found');
      }

      // Clear existing timeout if it exists
      if (this.jobs.has(scheduleId)) {
        clearTimeout(this.jobs.get(scheduleId));
        this.jobs.delete(scheduleId);
      }

      // Convert schedule time to UTC if it's being updated
      if (updateData.scheduleTime) {
        updateData.scheduleTime = new Date(updateData.scheduleTime);
      }

      const updatedSchedule = await this.scheduleRepository.update(scheduleId, updateData);

      if (updatedSchedule.isActive) {
        await this.scheduleJob(updatedSchedule);
      }

      return updatedSchedule;
    } catch (error) {
      console.error('Error updating schedule:', error);
      throw error;
    }
  }

  async deleteSchedule(scheduleId) {
    try {
      const schedule = await this.scheduleRepository.findById(scheduleId);
      if (!schedule) {
        throw new Error('Schedule not found');
      }

      // Clear timeout if it exists
      if (this.jobs.has(scheduleId)) {
        clearTimeout(this.jobs.get(scheduleId));
        this.jobs.delete(scheduleId);
      }

      await this.scheduleRepository.delete(scheduleId);
    } catch (error) {
      console.error('Error deleting schedule:', error);
      throw error;
    }
  }

  async getSchedule(scheduleId) {
    return this.scheduleRepository.findById(scheduleId);
  }

  async getAllSchedules() {
    return this.scheduleRepository.findAll();
  }

  async getSchedulesByScenario(scenarioId) {
    return this.scheduleRepository.findByScenarioId(scenarioId);
  }
}

module.exports = ScheduleService;