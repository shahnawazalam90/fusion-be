const express = require('express');
const multer = require('multer');
const { parseSpecSteps } = require('../../../utils/specUtil');
const router = express.Router();

const upload = multer({ dest: 'uploads/' });

module.exports = (fileController) => {
  router.post('/upload', upload.single('file'), fileController.uploadFile);
  router.get('/:id', fileController.getFile);
  router.get('/', fileController.listFiles);
  router.delete('/:id', fileController.deleteFile);

  router.post('/parseSpec', (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          status: 'error',
          message: err.message || 'File upload error',
        });
      }
      next();
    });
  }, async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          status: 'error',
          message: 'No file uploaded',
        });
      }

      const filePath = req.file.path;
      const steps = parseSpecSteps(filePath);
      res.status(200).json({
        status: 'success',
        data: steps,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
};
