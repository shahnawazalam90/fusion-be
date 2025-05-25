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
    await this.Schedule.update(updateData, {
      where: { id }
    });
    return this.findById(id);
  }

  async delete(id) {
    return this.Schedule.destroy({
      where: { id }
    });
  }

  async findByScenarioId(scenarioId) {
    // Find schedules where scenarios contains an object with scenarioId
    return this.Schedule.findAll({
      where: {
        scenarios: {
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