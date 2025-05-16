class ScheduleController {
  constructor(scheduleService) {
    this.scheduleService = scheduleService;
  }

  createSchedule = async (req, res) => {
    try {
      const scheduleData = {
        ...req.body,
        createdBy: req.user._id
      };
      const schedule = await this.scheduleService.createSchedule(scheduleData);
      res.status(201).json(schedule);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  };

  getAllSchedules = async (req, res) => {
    try {
      const schedules = await this.scheduleService.getAllSchedules();
      res.json(schedules);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  getSchedule = async (req, res) => {
    try {
      const schedule = await this.scheduleService.getSchedule(req.params.id);
      if (!schedule) {
        return res.status(404).json({ error: 'Schedule not found' });
      }
      res.json(schedule);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  updateSchedule = async (req, res) => {
    try {
      const schedule = await this.scheduleService.updateSchedule(req.params.id, req.body);
      res.json(schedule);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  };

  deleteSchedule = async (req, res) => {
    try {
      await this.scheduleService.deleteSchedule(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  getSchedulesByScenario = async (req, res) => {
    try {
      const schedules = await this.scheduleService.getSchedulesByScenario(req.params.scenarioId);
      res.json(schedules);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
}

module.exports = ScheduleController; 