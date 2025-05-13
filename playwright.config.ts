  import { defineConfig, devices } from '@playwright/test';

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
  export default defineConfig({
    testDir: './uploads/scripts',
    /* Run tests in files in parallel */
    fullyParallel: false,
    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env.CI,
    /* Retry on CI only */
    retries: process.env.CI ? 2 : 0,
    /* Opt out of parallel tests on CI. */
    workers: 1,
    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: [['html', { outputFolder: './uploads/reports/' + reportFolder.replace(/\.[^/.]+$/, '') }]],
    timeout: 10 * 60 * 1000,



    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
      browserName: 'chromium',
      trace: 'on-first-retry',
      viewport: null,
      video: 'on',
      screenshot: 'on',
      headless: true,
      launchOptions: {
        slowMo: 500,
        args: ['--start-maximized']
      },
      navigationTimeout: 10 * 60 * 1000,
    },


    /* Configure projects for major browsers */
    projects: [
      {
        name: 'chromium',
        use: {
          ...devices['Desktop Chrome']
        },
      },

      {
        name: 'firefox',
        use: { ...devices['Desktop Firefox'] },
      },

      {
        name: 'webkit',
        use: { ...devices['Desktop Safari'] },
      },
    ],
  });
