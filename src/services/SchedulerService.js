const cron = require('node-cron');
const Schedule = require('../models/Schedule');
const PlaywrightManager = require('../utils/PlaywrightManager');
const { v4: uuidv4 } = require('uuid');

class SchedulerService {
  constructor() {
    this.jobs = new Map();
    this.initializeScheduler();
  }

  async initializeScheduler() {
    try {
      // Load all active schedules from database
      const schedules = await Schedule.find({ isActive: true });
      
      // Schedule each active job
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
      // Validate cron expression
      if (!cron.validate(schedule.cronExpression)) {
        throw new Error('Invalid cron expression');
      }

      // Create a unique job ID
      const jobId = uuidv4();

      // Schedule the job with precise timing
      const job = cron.schedule(schedule.cronExpression, async () => {
        try {
          console.log(`Executing scheduled job: ${schedule.name} at ${new Date().toISOString()}`);
          
          // Generate a unique report ID
          const reportId = uuidv4();
          
          // Execute the test
          await PlaywrightManager.executeTest({
            reportId,
            dataFile: schedule.scenarioId.toString()
          });

          // Update last run time
          schedule.lastRun = new Date();
          schedule.nextRun = this.calculateNextRun(schedule.cronExpression);
          await schedule.save();

        } catch (error) {
          console.error(`Error executing scheduled job ${schedule.name}:`, error);
        }
      }, {
        scheduled: true,
        timezone: schedule.timezone,
        recoverMissedExecutions: false // Don't execute missed schedules
      });

      // Store the job
      this.jobs.set(schedule._id.toString(), job);
      
      // Calculate and store next run time
      schedule.nextRun = this.calculateNextRun(schedule.cronExpression);
      await schedule.save();

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

  // ... rest of the service methods ...
}

module.exports = new SchedulerService(); 