const fs = require('fs');
const path = require('path');
const { convertTestFileToJson } = require('../utils/testToJson');

class SpecFileService {
  constructor(specFileRepository) {
    this.specFileRepository = specFileRepository;
  }

  async uploadAndParseSpecFile(file) {
    try {
      const filePath = file.path;
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const parsedJson = convertTestFileToJson(fileContent);

      const specFile = await this.specFileRepository.create({
        originalName: file.originalname,
        uploadPath: filePath,
        parsedJson
      });

      return specFile;
    } catch (error) {
      throw new Error(`Failed to process spec file: ${error.message}`);
    }
  }

  async getAllSpecFiles() {
    return await this.specFileRepository.findAll();
  }

  async getSpecFileById(id) {
    return await this.specFileRepository.findById(id);
  }
  
  async getLatestSpecFile() {
    const specFile = await this.specFileRepository.findLatest();
    if (!specFile) {
      throw new Error('No spec files found in database');
    }
    return specFile;
  }
}

module.exports = SpecFileService; 