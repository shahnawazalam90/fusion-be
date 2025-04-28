const express = require('express');
const multer = require('multer');
const router = express.Router();

const upload = multer({ dest: 'uploads/' });

module.exports = (fileController) => {
  router.post('/upload', upload.single('file'), fileController.uploadFile);
  router.get('/:id', fileController.getFile);
  router.get('/', fileController.listFiles);
  router.delete('/:id', fileController.deleteFile);

  router.post('/parseSpec', upload.single('file'), fileController.parseSpec);

  return router;
};
