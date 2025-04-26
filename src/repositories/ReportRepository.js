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
}

module.exports = ReportRepository;
