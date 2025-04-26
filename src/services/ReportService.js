class ReportService {
  constructor(reportRepository) {
    this.reportRepository = reportRepository;
  }

  async createReport(reportData) {
    return this.reportRepository.create(reportData);
  }

  async listReportsByUserId(userId) {
    return this.reportRepository.findAllByUserId(userId);
  }
}

module.exports = ReportService;
