import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */

const reportFolder = process.env.DATAFILE || '';

// dotenv.config({ path: path.resolve(__dirname, '..', 'config', '.env') });

export default defineConfig({
  testDir: './src/playwright',
  fullyParallel: !!process.env.isfullyparallel,
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.WORKERS ? Number(process.env.WORKERS) : undefined,
  reporter: [['html', { outputFolder: './uploads/reports/' + reportFolder.replace(/\.[^/.]+$/, '') }]],
  timeout: 10 * 60 * 1000,
  outputDir: "test-results",

  use: {
    trace: 'on-first-retry',
    video: 'on',
  },

});
