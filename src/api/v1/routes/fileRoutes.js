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

  router.post('/parseSpec', upload.single('file'), async (req, res, next) => {
    try {
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
