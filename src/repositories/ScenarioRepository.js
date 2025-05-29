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

  async updateScenario(id, updates) {
    const scenario = await this.Scenario.findByPk(id);
    if (!scenario) {
      return null;
    }

    if (updates.jsonMetaData !== undefined) {
      scenario.jsonMetaData = updates.jsonMetaData;
    }
    if (updates.dataExcel !== undefined) {
      scenario.dataExcel = updates.dataExcel;
    }
    if (updates.dataManual !== undefined) {
      scenario.dataManual = updates.dataManual;
    }
    if (updates.name !== undefined) {
      scenario.name = updates.name;
    }
    if (updates.url !== undefined) {
      scenario.url = updates.url;
    }

    await scenario.save();

    return scenario;
  }
}

module.exports = ScenarioRepository;
