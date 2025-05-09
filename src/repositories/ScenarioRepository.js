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

  async updateScenario(id, jsonMetaData) {
    const scenario = await this.Scenario.findByPk(id);
    if (!scenario) {
      return null;
    }

    scenario.jsonMetaData = jsonMetaData;
    await scenario.save();

    return scenario;
  }
}

module.exports = ScenarioRepository;
