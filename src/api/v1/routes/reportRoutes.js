const express = require('express');
const multer = require('multer');
const { authenticateUser } = require('../../../middlewares/auth');
const router = express.Router();

const upload = multer({ dest: 'uploads/reports/' });

module.exports = (reportController) => {
  router.post(
    '/',
    authenticateUser,
    upload.single('file'),
    reportController.uploadReport
  );
  router.get('/', authenticateUser, reportController.listReports);

  return router;
};
