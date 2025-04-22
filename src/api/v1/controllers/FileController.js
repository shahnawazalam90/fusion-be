const { catchAsync } = require('../../../utils/catchAsync');

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
}

module.exports = FileController;
