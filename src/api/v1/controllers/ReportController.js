const { catchAsync } = require('../../../utils/catchAsync');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { extractZipFile, generatePublicRoutes } = require('../../../utils/fileUtil');

const upload = multer({ dest: 'uploads/reports/' });

class ReportController {
  constructor(reportService) {
    this.reportService = reportService;
  }

  uploadReport = catchAsync(async (req, res, next) => {
    upload.single('file')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          status: 'error',
          message: err.message || 'File upload error',
        });
      }

      const { scenarioId } = req.body;

      if (!req.file) {
        return res.status(400).json({
          status: 'error',
          message: 'No file uploaded',
        });
      }

      const newFileName = `${scenarioId}${path.extname(req.file.originalname)}`;
      const newFilePath = path.join('uploads/reports', newFileName);

      fs.renameSync(req.file.path, newFilePath);

      const reportData = {
        userId: req.userId,
        scenarioId,
        filePath: newFilePath,
      };

      const report = await this.reportService.createReport(reportData);

      res.status(201).json({
        status: 'success',
        data: report,
      });

      // Extract the zip file asynchronously after sending the response
      const extractDir = newFilePath.replace('.zip', '');
      try {
        await extractZipFile(newFilePath, extractDir);
      } catch (extractionError) {
        console.error('Error extracting zip file:', extractionError);
      }
    });
  });

  listReports = catchAsync(async (req, res) => {
    const reports = await this.reportService.listReportsByUserId(req.userId);

    res.status(200).json({
      status: 'success',
      data: reports,
    });
  });

  viewReport = catchAsync(async (req, res) => {
    const { reportId } = req.body;

    if (!reportId) {
      return res.status(400).json({
        status: 'error',
        message: 'Report ID is required',
      });
    }

    // Check user access and retrieve the report
    const report = await this.reportService.getReportById(req.userId, reportId);

    if (!report) {
      console.error(`Report not found for ID: ${reportId}, User ID: ${req.userId}`);
      return res.status(404).json({
        status: 'error',
        message: 'Report not found',
      });
    }

    const extractDir = report.filePath.replace('.zip', '');
    if (!fs.existsSync(extractDir)) {
      return res.status(404).json({
        status: 'error',
        message: 'Extracted files not found',
      });
    }

    // Generate public routes for the extracted files
    const publicUrls = generatePublicRoutes(extractDir);

    res.status(200).json({
      status: 'success',
      data: publicUrls,
    });
  });
}

module.exports = ReportController;
