const { NotFoundError } = require('../utils/errors');

class ScenarioService {
  constructor(scenarioRepository) {
    this.scenarioRepository = scenarioRepository;
  }

  async createScenario(scenarioData) {
    return this.scenarioRepository.create(scenarioData);
  }

  async getScenarioById(id) {
    const scenario = await this.scenarioRepository.findById(id);
    if (!scenario) {
      throw new NotFoundError('Scenario not found');
    }
    return scenario;
  }

  async listScenarios(userId) {
    return this.scenarioRepository.findAllByUserId(userId);
  }

  async deleteScenario(id) {
    const deleted = await this.scenarioRepository.deleteById(id);
    if (!deleted) {
      throw new NotFoundError('Scenario not found');
    }
    return deleted;
  }

  async updateScenario(id, jsonMetaData) {
    const scenario = await this.scenarioRepository.findById(id);
    if (!scenario) {
      throw new NotFoundError('Scenario not found');
    }

    scenario.jsonMetaData = jsonMetaData;
    await scenario.save();

    return scenario;
  }
}

module.exports = ScenarioService;
