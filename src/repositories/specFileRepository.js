class SpecFileRepository {
  constructor(models) {
    this.specFileModel = models.SpecFile;
  }

  async create(data) {
    return await this.specFileModel.create(data);
  }

  async findById(id) {
    return await this.specFileModel.findByPk(id);
  }

  async findAll() {
    return await this.specFileModel.findAll();
  }
}

module.exports = SpecFileRepository; 