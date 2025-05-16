class ScheduleRepository {
  constructor(models) {
    this.Schedule = models.Schedule;
  }

  async create(scheduleData) {
    const schedule = new this.Schedule(scheduleData);
    return schedule.save();
  }

  async findById(id) {
    return this.Schedule.findById(id);
  }

  async findAll() {
    return this.Schedule.find();
  }

  async findActive() {
    return this.Schedule.find({ isActive: true });
  }

  async update(id, updateData) {
    return this.Schedule.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );
  }

  async delete(id) {
    return this.Schedule.findByIdAndDelete(id);
  }

  async findByScenarioId(scenarioId) {
    return this.Schedule.find({ scenarioId });
  }
}

module.exports = ScheduleRepository; 