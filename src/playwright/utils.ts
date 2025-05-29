import Logger from "./logger";


export let log = new Logger();

/**
 *
 * @param text - The text to extract the requisition ID from.
 * @returns
 */
export async function extractRequisition(text: string): Promise<string> {
  const requisitionId = text.match(/\d+/)?.[0];
  return requisitionId || "";
}


/**
 * Waits for the order status to change.
 * @param page - The Playwright page object.
 * @param element - The locator for the element to wait for.
 */
export async function executeCopyPaste(element: Locator, page: Page) {
  await element.click();
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Control+C");
  await element.press("Backspace");
  await page.waitForTimeout(2000);
  await element.press("Control+V");
  await page.waitForTimeout(2000);
}
