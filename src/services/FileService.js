const { NotFoundError } = require('../utils/errors');

class FileService {
  constructor(fileRepository) {
    this.fileRepository = fileRepository;
  }

  async uploadFile(fileData) {
    return this.fileRepository.create(fileData);
  }

  async getFileById(id) {
    const file = await this.fileRepository.findById(id);
    if (!file) {
      throw new NotFoundError('File not found');
    }
    return file;
  }

  async listFiles() {
    return this.fileRepository.findAll();
  }

  async deleteFile(id) {
    const deleted = await this.fileRepository.deleteById(id);
    if (!deleted) {
      throw new NotFoundError('File not found');
    }
    return deleted;
  }
}

module.exports = FileService;
