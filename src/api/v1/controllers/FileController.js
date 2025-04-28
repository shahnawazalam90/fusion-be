const { catchAsync } = require('../../../utils/catchAsync');
const fs = require('fs');
const { parseSpecSteps } = require('../../../utils/specUtil');

class FileController {
  constructor(fileService) {
    this.fileService = fileService;
  }

  uploadFile = catchAsync(async (req, res) => {
    const fileData = {
      name: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      type: req.file.mimetype,
    };
    const file = await this.fileService.uploadFile(fileData);

    res.status(201).json({
      status: 'success',
      data: file,
    });
  });

  getFile = catchAsync(async (req, res) => {
    const file = await this.fileService.getFileById(req.params.id);

    res.status(200).json({
      status: 'success',
      data: file,
    });
  });

  listFiles = catchAsync(async (req, res) => {
    const files = await this.fileService.listFiles();

    res.status(200).json({
      status: 'success',
      data: files,
    });
  });

  deleteFile = catchAsync(async (req, res) => {
    await this.fileService.deleteFile(req.params.id);

    res.status(204).send();
  });

  parseSpec = catchAsync(async (req, res, next) => {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No file uploaded',
      });
    }

    const filePath = req.file.path;

    try {
      const steps = parseSpecSteps(filePath);
      res.status(200).json({
        status: 'success',
        data: steps,
      });
    } finally {
      // Delete the uploaded file
      fs.unlinkSync(filePath);
    }
  });
}

module.exports = FileController;
