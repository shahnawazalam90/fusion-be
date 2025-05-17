class ScheduleRepository {
  constructor(models) {
    this.Schedule = models.Schedule;
    this.models = models;
  }

  async create(scheduleData) {
    return this.Schedule.create(scheduleData);
  }

  async findById(id) {
    return this.Schedule.findByPk(id, {
      include: [{
        model: this.models.User,
        as: 'creator',
        attributes: ['id', 'email', 'firstName', 'lastName']
      }]
    });
  }

  async findAll() {
    return this.Schedule.findAll({
      include: [{
        model: this.models.User,
        as: 'creator',
        attributes: ['id', 'email', 'firstName', 'lastName']
      }]
    });
  }

  async findActive() {
    return this.Schedule.findAll({
      where: { isActive: true },
      include: [{
        model: this.models.User,
        as: 'creator',
        attributes: ['id', 'email', 'firstName', 'lastName']
      }]
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
      },
      include: [{
        model: this.models.User,
        as: 'creator',
        attributes: ['id', 'email', 'firstName', 'lastName']
      }]
    });
  }
}

module.exports = ScheduleRepository; 