const express = require('express');
const multer = require('multer');
const path = require('path');

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), 'uploads', 'specs'));
  },
  filename: (req, file, cb) => {
    // Use timestamp to prevent filename conflicts
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage });

module.exports = (controller) => {
  const router = express.Router();

  // Upload a spec file
  router.post(
    '/upload',
    upload.single('specFile'),
    controller.uploadSpecFile
  );

  // Get all spec files
  router.get('/', controller.getAllSpecFiles);

  // Get a specific spec file by ID
  router.get('/:id', controller.getSpecFileById);

  return router;
}; 