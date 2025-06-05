import { Page, Locator} from "@playwright/test";
import Logger from './logger';
const axios = require('axios');

export let log = new Logger();

/**
 *
 * @param text - The text to extract the requisition ID from.
 * @returns
 */
export async function extractRequisition(text: string): Promise<string> {
  const requisitionId = text.match(/\d+/)?.[0];
  return requisitionId || '';
}

/**
 * Waits for the order status to change.
 * @param page - The Playwright page object.
 * @param element - The locator for the element to wait for.
 */
export async function executeCopyPaste(element: Locator, page: Page) {
  await element.click();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Control+C');
  await element.press('Backspace');
  await page.waitForTimeout(2000);
  await element.press('Control+V');
  await page.waitForTimeout(2000);
}

/**
 *
 * @param apiUrl
 * @param expectedStatus
 * @param timeoutMs
 * @returns
 */
// Replace 'any' with the correct type if you know what 'screen' should be
export async function waitForApiStatus(screen: any, timeoutMs = 30000) {
  const startTime = Date.now();
  
  let response;

  while (Date.now() - startTime < timeoutMs) {
    switch (screen[0].method) {
      case 'POST':
        try {
          response = await axios.post(screen[0].url, screen[0].body);
          console.log('✅ Success:', response.status);
          if (
            response.data.message === 'Status updated' &&
            response.status === 200
          ) {
            console.log('✅ API Response status:', response.data.status);
            return;
          }
        } catch (error: any) {
          console.error('❌ Error:', error.response?.status || error.message);
        }
        break;
      case 'GET':
        response = await axios.get(screen[0].url);
        if (response.status === 200) {
          return;
        }
      default:
        break;
    }

    await new Promise((resolve) => setTimeout(resolve, 10000));
  }

  throw new Error('Timed out waiting for expected status');
}

export async function handleExternalService(apidata: any) {
  const service = apidata[0];
  const timeoutMs = (service.polling_timeout || 1440) * 1000; // default 1440s
  const intervalMs = (service.polling_interval || 30) * 1000; // default 30s

  // Helper to make the request and check response
  async function makeRequest() {
    const config = {
      method: service.method,
      url: service.url,
      headers: service.headers,
      data: service.body,
      validateStatus: () => true, // so axios doesn't throw on non-2xx
    };

    const response = await axios(config);

    // Check status code
    if (response.status !== service.expected_status) {
      return { success: false, response };
    }

    // Check expected body keys (if defined)
    if (service.expected_body) {
      const matched = Object.entries(service.expected_body).every(
        ([key, val]) => response.data[key] === val
      );
      if (!matched) {
        return { success: false, response };
      }
    }

    return { success: true, response };
  }

  if (service.type === 'polling') {
    // Polling: retry until success or timeout
    const startTime = Date.now();
    let i = 0;

    while (Date.now() - startTime < timeoutMs) {
      try {
        const { success, response } = await makeRequest();

        if (success) {
          console.log(`✅ Polling success for ${service.name}`);
          return response.data;
        } else {
          console.log(
            `ℹ️ ${i} Polling: status/body mismatch, retrying in ${
              intervalMs / 1000
            }s`
          );
        }
      } catch (error: any) {
        console.error(`❌ Polling error for ${service.name}:`, error.message);
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      i++;
    }

    throw new Error(`Polling timeout for ${service.name}`);
  } else if (service.type === 'stateless') {
    // Stateless: just make one call and check once
    try {
      const { success, response } = await makeRequest();

      if (success) {
        console.log(`✅ Stateless call success for ${service.name}`);
        return response.data;
      } else {
        throw new Error(
          `Stateless call failed: status/body mismatch for ${service.name}`
        );
      }
    } catch (error: any) {
      console.error(
        `❌ Stateless call error for ${service.name}:`,
        error.message
      );
      throw error;
    }
  } else {
    throw new Error(`Unsupported service type: ${service.type}`);
  }
}

export async function captureVideo(page: Page, scenario: string, testInfo: any) {
  await page.close();

  const video = page.video();
  if (video) {
    const reportFolder = process.env.DATAFILE || '';
    const videoPath = `./uploads/reports/${reportFolder.replace(/\.[^/.]+$/, '')}/videos/${scenario.replace(
      /\W+/g,
      "_"
    )}_${Date.now()}.webm`;
    console.log(`Video path: ${videoPath}`)
    await video.saveAs(videoPath);
    await testInfo.attach(`${videoPath}`, {
      path: videoPath,
      contentType: "video/webm",
    });
  }
}
