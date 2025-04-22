class FileRepository {
  constructor(models) {
    this.File = models.File;
  }

  async create(fileData) {
    return this.File.create(fileData);
  }

  async findById(id) {
    return this.File.findByPk(id);
  }

  async findAll() {
    return this.File.findAll();
  }

  async deleteById(id) {
    return this.File.destroy({ where: { id } });
  }
}

module.exports = FileRepository;
