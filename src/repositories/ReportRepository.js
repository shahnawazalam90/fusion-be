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
        scenarioIds: { [this.Report.sequelize.Op.contains]: [scenarioId] }
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
}

module.exports = ReportRepository;
