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

export const setupBrowser = async (): Promise<Page> => {
  const browserName = process.env.BROWSER || "chrome";
  let device: any;
  const headless = process.env.HEADLESS === "true";
  const isLocal = headless === true;

  switch (browserName.toLowerCase()) {
    case "firefox":
      browser = await firefox.launch({
        channel: "firefox",
        headless: headless,
      });
      device = devices["Desktop Firefox"];
      break;
    case "safari":
      browser = await webkit.launch();
      break;
    case "edge":
      browser = await chromium.launch({
        channel: "msedge",
        headless: headless,
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
        args: [
          "--start-maximized",
        ],
      });
      break;
    case "chromium":
    default:
      browser = await chromium.launch({
        args: [
          "--start-maximized",
        ],
        headless: headless,
      });
      break;
  }

  if (!browser) {
    throw new Error(`Browser ${browserName} could not be launched.`);
  }

  context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    acceptDownloads: true,
    deviceScaleFactor: 1,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
  });

  const page = await context.newPage();

  log.info("Browser is maximized");
  return page;
};

