class ScenarioRepository {
  constructor(models) {
    this.Scenario = models.Scenario;
  }

  async create(scenarioData) {
    return this.Scenario.create(scenarioData);
  }

  async findById(id) {
    return this.Scenario.findByPk(id);
  }

  async findAll() {
    return this.Scenario.findAll();
  }

  async findAllByUserId(userId) {
    return this.Scenario.findAll({ 
      where: { userId },
      order: [['createdAt', 'DESC']]
    });
  }

  async deleteById(id) {
    return this.Scenario.destroy({ where: { id } });
  }
}

module.exports = ScenarioRepository;
