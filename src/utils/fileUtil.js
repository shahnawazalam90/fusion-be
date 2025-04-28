const fs = require('fs');
const path = require('path');
const unzipper = require('unzipper');

async function extractZipFile(zipFilePath, extractDir) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(zipFilePath)
      .pipe(unzipper.Extract({ path: extractDir }))
      .on('close', resolve)
      .on('error', reject);
  });
}

function generatePublicRoutes(directory) {
  const files = [];

  function readDirRecursive(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    entries.forEach((entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        readDirRecursive(fullPath);
      } else if (entry.name.endsWith('.html')) {
        files.push({
          fileName: entry.name,
          publicUrl: `/public/${path.basename(directory)}/${path.relative(directory, fullPath).replace(/\\/g, '/')}`,
        });
      }
    });
  }

  readDirRecursive(directory);
  return files;
}

module.exports = { extractZipFile, generatePublicRoutes };
