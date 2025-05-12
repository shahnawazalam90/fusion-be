const { catchAsync } = require('../../../utils/catchAsync');
const path = require('path');
const fs = require('fs');
const { formatScenario } = require('../../../utils/metadataFormatter');

class ScenarioController {
  constructor(scenarioService) {
    this.scenarioService = scenarioService;
  }

  createScenario = catchAsync(async (req, res) => {
    const scenarioData = { ...req.body, userId: req.userId };
    const scenario = await this.scenarioService.createScenario(scenarioData);

    res.status(201).json({
      status: 'success',
      data: scenario,
    });
  });

  getScenario = catchAsync(async (req, res) => {
    const scenario = await this.scenarioService.getScenarioById(req.params.id);

    res.status(200).json({
      status: 'success',
      data: scenario,
    });
  });

  listScenarios = catchAsync(async (req, res) => {
    const scenarios = await this.scenarioService.listScenarios(req.userId);

    res.status(200).json({
      status: 'success',
      data: scenarios,
    });
  });

  updateScenario = catchAsync(async (req, res) => {
    const { id, jsonMetaData } = req.body;

    if (!id || !jsonMetaData) {
      return res.status(400).json({
        status: 'error',
        message: 'Scenario ID and jsonMetaData are required',
      });
    }

    const updatedScenario = await this.scenarioService.updateScenario(id, jsonMetaData);

    res.status(200).json({
      status: 'success',
      data: updatedScenario,
    });
  });

  deleteScenario = catchAsync(async (req, res) => {
    await this.scenarioService.deleteScenario(req.params.id);

    res.status(204).send();
  });

  getScenarioMetadata = catchAsync(async (req, res) => {
    try {
      const { id } = req.params;
      const scenario = await this.scenarioService.getScenarioById(id);

      if (!scenario) {
        return res.status(404).json({
          status: 'error',
          message: 'Scenario not found'
        });
      }

      const formattedScenario = formatScenario(scenario);

      return res.status(200).json({
        status: 'success',
        data: formattedScenario
      });
    } catch (error) {
      console.error('Error getting scenario metadata:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Error retrieving scenario metadata',
        error: error.message
      });
    }
  });
}

module.exports = ScenarioController;
