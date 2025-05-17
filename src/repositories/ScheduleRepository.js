class ScheduleRepository {
  constructor(models) {
    this.Schedule = models.Schedule;
  }

  async create(scheduleData) {
    return this.Schedule.create(scheduleData);
  }

  async findById(id) {
    return this.Schedule.findByPk(id);
  }

  async findAll() {
    return this.Schedule.findAll();
  }

  async findActive() {
    return this.Schedule.findAll({
      where: { isActive: true }
    });
  }

  async update(id, updateData) {
    const [updatedCount, [updatedSchedule]] = await this.Schedule.update(
      updateData,
      {
        where: { id },
        returning: true
      }
    );
    return updatedSchedule;
  }

  async delete(id) {
    return this.Schedule.destroy({
      where: { id }
    });
  }

  async findByScenarioId(scenarioId) {
    return this.Schedule.findAll({
      where: {
        scenarioIds: {
          [this.Schedule.sequelize.Op.like]: `%${scenarioId}%`
        }
      }
    });
  }
}

module.exports = ScheduleRepository; 