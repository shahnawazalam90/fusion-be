import * as dotenv from "dotenv";
import {
  Browser,
  BrowserContext,
  BrowserContextOptions,
  chromium,
  devices,
  firefox,
  Page,
  webkit,
} from "@playwright/test";
import { log } from "./utils";
import * as path from 'path';

dotenv.config();
let browser: Browser | null = null;
let context: BrowserContext | null = null;

let downloadsPath: string = "./downloads";
export let page: Page;

dotenv.config({ path: path.resolve(__dirname, '..', 'config', '.env') });

const reportFolder = process.env.DATAFILE || '';

export const setupBrowser = async (): Promise<Page> => {
  const browserName = process.env.BROWSER || "chrome";
  let device: any;
  const headless = process.env.HEADLESS === "true";
  const isLocal = headless === true;
  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount < maxRetries) {
    try {
      switch (browserName.toLowerCase()) {
        case "firefox":
          browser = await firefox.launch({
            channel: "firefox",
            headless: headless,
            timeout: 30000,
          });
          device = devices["Desktop Firefox"];
          break;
        case "safari":
          browser = await webkit.launch({
            timeout: 30000,
          });
          break;
        case "webkit":
          browser = await webkit.launch({
            timeout: 30000,
          });
          break;
        case "edge":
          browser = await chromium.launch({
            channel: "msedge",
            headless: headless,
            timeout: 30000,
            args: [
              "--disable-features=InPrivateMode",
              "--start-maximized",
              "--deny-permission-prompts",
              "--disable-infobars",
            ],
          });
          break;
        case "chrome":
          browser = await chromium.launch({
            channel: "chrome",
            headless: headless,
            timeout: 30000,
            args: [
              "--start-maximized",
              "--disable-dev-shm-usage",
              "--no-sandbox",
              "--disable-setuid-sandbox",
              "--disable-gpu",
              "--disable-software-rasterizer",
            ],
          });
          break;
        case "chromium":
        default:
          browser = await chromium.launch({
            args: [
              "--start-maximized",
              "--disable-dev-shm-usage",
              "--no-sandbox",
              "--disable-setuid-sandbox",
              "--disable-gpu",
              "--disable-software-rasterizer",
            ],
            headless: headless,
            timeout: 30000,
          });
          break;
      }

      if (!browser) {
        throw new Error(`Browser ${browserName} could not be launched.`);
      }

      context = await browser.newContext({
        viewport: { width: 1366, height: 768 },
        acceptDownloads: true,
        deviceScaleFactor: 1,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
        recordVideo: {
          dir: './uploads/reports/' + reportFolder.replace(/\.[^/.]+$/, '') + '/videos',
          size: { width: 1280, height: 720 }
        }
      });

      const page = await context.newPage();
      await page.setDefaultTimeout(30000);
      await page.setDefaultNavigationTimeout(30000);

      log.info("Browser is maximized");
      return page;
    } catch (error) {
      retryCount++;
      log.error(`Failed to setup browser (attempt ${retryCount}/${maxRetries}): ${error.message}`);
      
      if (context) {
        try {
          await context.close();
        } catch (e) {
          log.error('Error closing context:', e);
        }
        context = null;
      }
      if (browser) {
        try {
          await browser.close();
        } catch (e) {
          log.error('Error closing browser:', e);
        }
        browser = null;
      }

      if (retryCount === maxRetries) {
        throw new Error(`Failed to setup browser after ${maxRetries} attempts: ${error.message}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
    }
  }
};

