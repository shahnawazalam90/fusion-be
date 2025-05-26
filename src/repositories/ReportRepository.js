class ReportRepository {
  constructor(models) {
    this.Report = models.Report;
  }

  async create(reportData) {
    return this.Report.create(reportData);
  }

  async findAllByUserId(userId) {
    return this.Report.findAll({ where: { userId } });
  }

  async findById(reportId) {
    return this.Report.findByPk(reportId);
  }

  async findByScenarioId(scenarioId) {
    return this.Report.findAll({
      where: {
        scenarios: { [this.Report.sequelize.Op.like]: `%${scenarioId}%` }
      }
    });
  }

  async findByStatus(status) {
    return this.Report.findAll({ where: { status } });
  }

  async updateStatus(reportId, status, executedAt = null) {
    const updateData = { status };
    if (executedAt) {
      updateData.executedAt = executedAt;
    }

    return this.Report.update(updateData, {
      where: { id: reportId }
    });
  }

  async updateFilePath(reportId, filePath) {
    return this.Report.update({ filePath }, {
      where: { id: reportId }
    });
  }

  async updateScenarioFile(reportId, scenarioFile) {
    return this.Report.update({ scenarioFile }, {
      where: { id: reportId }
    });
  }

  async delete(reportId) {
    try {
      const result = await this.Report.destroy({
        where: {
          id: reportId
        }
      });
      return result;
    } catch (error) {
      console.error('Error in ReportRepository delete:', error);
      throw error;
    }
  }
}

module.exports = ReportRepository;
