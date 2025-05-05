class SpecFileController {
  constructor(specFileService) {
    this.specFileService = specFileService;
  }

  uploadSpecFile = async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          status: 'error',
          message: 'No spec file uploaded',
        });
      }

      const specFile = await this.specFileService.uploadAndParseSpecFile(req.file);
      
      return res.status(201).json({
        status: 'success',
        message: 'Spec file uploaded and processed successfully',
        data: {
          specFile,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  getAllSpecFiles = async (req, res, next) => {
    try {
      const specFiles = await this.specFileService.getAllSpecFiles();
      
      return res.status(200).json({
        status: 'success',
        results: specFiles.length,
        data: {
          specFiles,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  getSpecFileById = async (req, res, next) => {
    try {
      const { id } = req.params;
      const specFile = await this.specFileService.getSpecFileById(id);
      
      if (!specFile) {
        return res.status(404).json({
          status: 'error',
          message: 'Spec file not found',
        });
      }
      
      return res.status(200).json({
        status: 'success',
        data: {
          specFile,
        },
      });
    } catch (error) {
      next(error);
    }
  };
  
  getLatestSpecFile = async (req, res, next) => {
    try {
      const specFile = await this.specFileService.getLatestSpecFile();
      
      return res.status(200).json({
        status: 'success',
        data: {
          specFile,
        },
      });
    } catch (error) {
      if (error.message === 'No spec files found in database') {
        return res.status(404).json({
          status: 'error',
          message: error.message,
        });
      }
      next(error);
    }
  };
}

module.exports = SpecFileController; 