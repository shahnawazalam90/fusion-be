const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');
const PlaywrightManager = require('../utils/PlaywrightManager');

class ScheduleService {
  constructor(scheduleRepository) {
    this.scheduleRepository = scheduleRepository;
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
      if (!cron.validate(schedule.cronExpression)) {
        throw new Error('Invalid cron expression');
      }

      const job = cron.schedule(schedule.cronExpression, async () => {
        try {
          console.log(`Executing scheduled job: ${schedule.name} at ${new Date().toISOString()}`);
          
          const reportId = uuidv4();
          await PlaywrightManager.executeTest({
            reportId,
            dataFile: schedule.scenarioId.toString()
          });

          schedule.lastRun = new Date();
          schedule.nextRun = this.calculateNextRun(schedule.cronExpression);
          await this.scheduleRepository.update(schedule._id, {
            lastRun: schedule.lastRun,
            nextRun: schedule.nextRun
          });

        } catch (error) {
          console.error(`Error executing scheduled job ${schedule.name}:`, error);
        }
      }, {
        scheduled: true,
        timezone: schedule.timezone,
        recoverMissedExecutions: false
      });

      this.jobs.set(schedule._id.toString(), job);
      
      schedule.nextRun = this.calculateNextRun(schedule.cronExpression);
      await this.scheduleRepository.update(schedule._id, { nextRun: schedule.nextRun });

      console.log(`Scheduled job ${schedule.name} to run at ${schedule.nextRun}`);

      return job;
    } catch (error) {
      console.error(`Error scheduling job ${schedule.name}:`, error);
      throw error;
    }
  }

  calculateNextRun(cronExpression) {
    const nextDate = cron.schedule(cronExpression).nextDate();
    return nextDate.toDate();
  }

  async createSchedule(scheduleData) {
    try {
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

      if (this.jobs.has(scheduleId)) {
        this.jobs.get(scheduleId).stop();
        this.jobs.delete(scheduleId);
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

      if (this.jobs.has(scheduleId)) {
        this.jobs.get(scheduleId).stop();
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