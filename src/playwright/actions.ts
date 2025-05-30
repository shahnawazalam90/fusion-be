import test, { expect, Locator, Page } from "@playwright/test";
import { executeCopyPaste, extractRequisition, log } from "./utils";

let requisitionId: string;
let purchaseOrderId: string;
let salesOrderId: string;
let pickWaveId: string;
let shipmentId: string;
let processId: string;
let pickWaveId1: string;
let pickSlipId: string;

type LocatorMethods =
  | "getByRole"
  | "getByLabel"
  | "getByText"
  | "locator"
  | "getByTitle";

interface Action {
  action: string;
  locatorType: string;
  params: unknown[];
  value?: string;
  parsedValue?: string;
  assertionType?: string;
  variable: string;
  raw: string;
  childLocator: string;
  selector?: string;
  additionalFilter?: {
    hasText?: string;
    hasNot?: string;
  };
}

export async function peformJSONAction(
  page: Page,
  screen: Action,
  screenName: string,
  num?: number
): Promise<void> {
  try {
    if (screen.raw.includes("selectOption")) {
      await test.step(`Select option from dropdown: ${screen.selector}`, async () => {
        await selectDropdownValue(screen, page);
      });
    } else if (screen.raw.includes("fill")) {
      await test.step(`Entered '${screen.selector}' text field with '${screen.value}' value`, async () => {
        await setTextInInputBox(screen, page);
      });
    } else if (screen.raw.includes("getByText")) {
      await getTextContent(screen, page);
    } else if (screen.raw.includes("expect")) {
      await dynamicAssertionHandler(screen, page);
    } else if (screen.raw.includes("press")) {
      await test.step(`Keyboard action on : ${screen.selector}`, async () => {
        await executePageAction(page, screen.raw);
        await page.waitForTimeout(1000);
      });
    } else if (screen.raw.includes("click")) {
      await test.step(`clicked on : ${screen.selector}`, async () => {
        await click(screen, page);
      });
    }
    await screenshot(page, screenName, num);
  } catch (error) {
    await screenshot(page, screenName, num);
    log.error(`Failed to execute step: ${screen.raw}`);
    throw error instanceof Error ? error : new Error(String(error));
  }
}

async function executePageAction(page: Page, action: string): Promise<void> {
  const actionFn = new Function('page', `return (async () => { await page.${action}; })()`);
  await actionFn(page);
}

async function click(screen: Action, page: Page): Promise<void> {
  let actionPerformed = false;

  if (
    /getByRole\('link',\s*\{\s*"name":\s*"\d+"\s*\}\)\.click\(\)/.test(
      screen.raw
    )
  ) {
    const customXpath =
      "//table[@summary='Search Results']//a[contains(text(), '1') or contains(text(), '2') or contains(text(), '3') or contains(text(), '4') or contains(text(), '5') or contains(text(), '6') or contains(text(), '7') or contains(text(), '8') or contains(text(), '9') or contains(text(), '0')]";
    pickSlipId = await page.locator(customXpath).nth(0).textContent() || '';
    log.debug(`Pick Slip ID: ${pickSlipId}`);
    await highlightElement(page, customXpath);
    await page.locator(customXpath).nth(0).click();
    actionPerformed = true;
  }

  if (screen.raw.includes("Interfaces shipping details")) {
    await page.waitForTimeout(5000);
    const baseLocator = screen.raw.split(".click")[0];
    await highlightElement(page, baseLocator);
    await executePageAction(page, screen.raw);
    actionPerformed = true;
  }

  if (screen.raw.includes("Refresh")) {
    const baseLocator = screen.raw.split(".click")[0];
    await highlightElement(page, baseLocator);
    await waitUntilOrderStatusChange(
      page,
      await page.getByRole("button", { name: "Refresh" })
    );
    actionPerformed = true;
  }

  if (screen.raw.includes("Order Management")) {
    await selectTabByPageIndex(page, "Order Management", screen);
    actionPerformed = true;
  }

  if (!actionPerformed) {
    const baseLocator = screen.raw.split(".click")[0];
    await highlightElement(page, baseLocator);
    await executePageAction(page, screen.raw);
  }
}

async function getTextContent(screen: Action, page: Page): Promise<void> {
  const baseLocator = screen.raw.split(".click")[0];
  let extractedValue: string | null = null;

  if (screen.raw.includes("Requisition")) {
    const textContent = await page.locator(baseLocator).textContent();
    if (textContent) {
      requisitionId = await extractRequisition(textContent);
      log.debug(`Requisition ID: ${requisitionId}`);
    }
  } else if (screen.raw.includes("Purchase Orders")) {
    const textContent = await page.locator(baseLocator).textContent();
    if (textContent) {
      purchaseOrderId = await extractRequisition(textContent);
      log.debug(`****** Purchase Order ID: ${purchaseOrderId} ******`);
    }
  } else if (screen.raw.includes("was released")) {
    const textContent = await page
      .getByText(/Pick wave \d+ was released/)
      .textContent();
    if (textContent) {
      pickWaveId1 = await extractRequisition(textContent);
      expect(textContent).toMatch(
        /Pick wave \d+ was released. Number of pick slips: 1 and number of picks: 1./
      );
      log.debug(`****** Pick wave ID1: ${pickWaveId1} ******`);
    }
  } else if (screen.raw.includes("Sales order")) {
    const salesOrderIDMsg = await page
      .getByText(/Sales order \d+ was/)
      .textContent();
    if (salesOrderIDMsg) {
      salesOrderId = await extractRequisition(salesOrderIDMsg);
      log.debug(`****** Sales Order ID: ${salesOrderId} ******`);
    }
  } else if (screen.raw.includes("The shipment")) {
    const shippmentMsg = await page
      .getByText(/The shipment \d+ was confirmed./)
      .textContent();
    if (shippmentMsg) {
      shipmentId = await extractRequisition(shippmentMsg);
      log.debug(`****** The shipment ID: ${shipmentId} ******`);
    }
  } else if (screen.raw.includes("Process")) {
    const processIdMsg = await page
      .getByText(/Process \d+ was submitted./)
      .textContent();
    if (processIdMsg) {
      processId = await extractRequisition(processIdMsg);
      log.debug(`The process ID: ${processId}`);
    }
  } else if (screen.raw.includes("Shipped")) {
    const orderStatus = await page.getByText("Shipped").textContent();
    if (orderStatus) {
      expect(orderStatus).toEqual("Shipped");
      extractedValue = orderStatus;
      log.debug(`Order Status: ${extractedValue}`);
    }
  } else {
    await executePageAction(page, screen.raw);
  }
}

async function selectDropdownValue(screen: Action, page: Page): Promise<void> {
  const baseLocator = screen.raw.split(".selectOption")[0];
  await highlightElement(page, baseLocator);
  const value = screen.value?.replace(/^'(.*)'$/, "$1");
  if (!value) {
    throw new Error("Value is required for selectDropdownValue");
  }
  await executePageAction(page, `${baseLocator}.click()`);

  await (async () => {
    const element = await page.locator(baseLocator);
    await expect(element).toContainText(value);
  })();

  await executePageAction(page, `${baseLocator}.selectOption('${value}')`);
}

/**
 *
 * @param screen
 */
async function setComboBoxValue(
  baseLocator: string,
  value: string | any[] | undefined,
  page: Page
) {
  await eval(
    `(async () => { await page.${baseLocator}.press('Backspace'); })()`
  );
  await page.waitForTimeout(3000);
  await eval(
    `(async () => { await page.${baseLocator}.press('Backspace'); })()`
  );

  if ((await page.locator("//ul[@role='listbox']//li").count()) > 0) {
    log.info("Listbox is visible. Selecting the respective value...");
    const firstItemText = await page
      .locator("//ul[@role='listbox']//li")
      .nth(0)
      .textContent();
    if (firstItemText === "No results found.") {
      throw new Error(
        "No results found in the listbox. Please check the value."
      );
    }
    await page.waitForTimeout(500);
  } else {
    log.warn("Listbox did not appear within the timeout. Filling the input...");
    await eval(
      `(async () => { await page.${baseLocator}.press('Shift+Home'); })()`
    );
    await page.waitForTimeout(500);
    await eval(
      `(async () => { await page.${baseLocator}.fill('${value}'); })()`
    );
  }

  await page.waitForTimeout(500);
}

/**
 *
 * @param screen
 */
async function setTextInInputBox(screen: Action, page: Page) {
  const baseLocator = screen.raw.split(".fill")[0];
  let value = screen.value?.replace(/^'(.*)'$/, "$1");

  await highlightElement(page, baseLocator);

  await eval(`(async () => { await page.${baseLocator}.fill('${value}'); })()`);

  if (screen.raw.includes("combobox")) {
    switch (true) {
      case screen.raw.includes("Manage Shipment Interface"):
        await eval(`(async () => { await page.${baseLocator}.click(''); })()`);
        await page.waitForTimeout(3000);
        break;

      case screen.raw.includes("From Shipment") ||
        screen.raw.includes("To Shipment"):
        if (shipmentId === undefined || shipmentId === null) {
          await eval(
            `(async () => { await page.${baseLocator}.fill('${value}'); })()`
          );
        } else {
          await eval(
            `(async () => { await page.${baseLocator}.fill('${shipmentId}'); })()`
          );
        }

        break;

      case screen.raw.includes("Requisition"):
        if (requisitionId === undefined || requisitionId === null) {
          await eval(
            `(async () => { await page.${baseLocator}.fill('${value}'); })()`
          );
        } else {
          await eval(
            `(async () => { await page.${baseLocator}.fill('${requisitionId}'); })()`
          );
        }

        break;

      case screen.raw.includes('"name": "Order"'):
        if (salesOrderId === undefined || salesOrderId === null) {
          await eval(
            `(async () => { await page.${baseLocator}.fill('${value}'); })()`
          );
        } else {
          await eval(
            `(async () => { await page.${baseLocator}.fill('${salesOrderId}'); })()`
          );
        }
        await eval(
          `(async () => { await page.${baseLocator}.press('Tab'); })()`
        );
        await page.waitForTimeout(2000);
        if (
          await page
            .locator("//div[text()='Search and Select: Order']")
            .isVisible()
        ) {
          throw new Error("Please enter valid Order id to proceed.");
        }
        break;

      default:
        await setComboBoxValue(baseLocator, value, page);

        break;
    }
  } else {
    if (screen.raw.includes("Order")) {
      if (salesOrderId === undefined || salesOrderId === null) {
          await eval(
            `(async () => { await page.${baseLocator}.fill('${value}'); })()`
          );
        } else {
          await eval(
            `(async () => { await page.${baseLocator}.fill('${salesOrderId}'); })()`
          );
        }
        await eval(
          `(async () => { await page.${baseLocator}.press('Tab'); })()`
        );
        await page.waitForTimeout(2000);
        if (
          await page
            .locator("//div[text()='Search and Select: Order']")
            .isVisible()
        ) {
          throw new Error("Please enter valid Order id to proceed.");
        }

    } else if (screen.raw.includes("Process ID")) {
      if (processId === undefined || processId === null) {
        await eval(
          `(async () => { await page.${baseLocator}.fill('${value}'); })()`
        );
      } else {
        await eval(
          `(async () => { await page.${baseLocator}.fill('${processId}'); })()`
        );
      }

      await eval(`(async () => { await page.${baseLocator}.press('Tab'); })()`);
      await page.waitForTimeout(2000);
    }
  }
}

/**
 * Handles dynamic assertions based on the screen action.
 *
 * @param screen - The screen object containing the action and raw locator.
 * @param page - The Playwright page object.
 */
async function dynamicAssertionHandler(
  screen: Action,
  page: Page
): Promise<void> {
  const baseLocator = screen.raw.split(".click")[0];
  const element = await page.locator(baseLocator);
  const assertionType = screen.assertionType || '';
  const expectedValue = screen.value || '';

  await handleDynamicAssertion(element, assertionType, expectedValue);
}

async function handleDynamicAssertion(
  element: Locator,
  assertionType: string,
  expectedValue: string
): Promise<void> {
  const actualValue = await element.textContent();
  if (!actualValue) {
    throw new Error('Element text content is null');
  }

  switch (assertionType) {
    case "toContainText":
      await expect(element).toContainText(expectedValue);
      break;
    case "toHaveText":
      await expect(element).toHaveText(expectedValue);
      break;
    case "toBeVisible":
      await expect(element).toBeVisible();
      break;
    default:
      throw new Error(`Unsupported assertion type: ${assertionType}`);
  }
}

/**
 * Waits for the order status to change.
 * @param page - The Playwright page object.
 * @param element - The locator for the element to wait for.
 */
async function waitUntilOrderStatusChange(page: Page, element: Locator): Promise<void> {
  const maxAttempts = 10;
  const delayMs = 5000;
  let attempts = 0;

  while (attempts < maxAttempts) {
    await element.click();
    await page.waitForTimeout(delayMs);

    const statusElement = await page.getByText("Shipped");
    const statusText = await statusElement.textContent();

    if (statusText === "Shipped") {
      log.info("Order status changed to Shipped");
      return;
    }

    attempts++;
    log.info(`Attempt ${attempts}: Order status not changed yet`);
  }

  throw new Error("Order status did not change to Shipped after maximum attempts");
}

/**
 *
 * @param page
 * @param targetText
 * @param loator
 * @returns
 */
async function selectTabByPageIndex(
  page: Page,
  targetText: string,
  screen: Action // The text you are searching for
) {
  const maxAttempts = 5;
  let attempts = 0;

  while (attempts < maxAttempts) {
    const element = await page.getByText(targetText);
    const navPageIndex = await element.getAttribute("nav-page-index");

    if (navPageIndex === "0") {
      log.info(`"${targetText}" is in the correct nav-page-index, clicking...`);
      await executePageAction(page, screen.raw);
      log.info(`Clicked on "${targetText}" successfully!`);
      break;
    }

    attempts++;
    if (attempts === maxAttempts) {
      throw new Error(`Could not find "${targetText}" with nav-page-index 0 after ${maxAttempts} attempts`);
    }

    await page.waitForTimeout(1000);
  }
}

/**
 * ignore this function
 * @param page
 * @param screen
 * @param screenName
 */

export async function performActions(
  page: Page,
  screen: Action,
  screenName: string
): Promise<void> {
  const pattern =
    /(\w+)\('([^']*)'(?:,\s*({[^}]*}))?\)(?:\.(\w+)\(({[^}]*})\))?(?:\.(\w+)\('([^']*)'(?:,\s*({[^}]*}))?\))?\.(\w+)\(?([^)]*)?\)?/;
  const match = screen.raw.match(pattern);

  if (match) {
    const [
      ,
      method1,
      param1,
      options1,
      method2,
      param2,
      method3,
      param3,
      options3,
      actionType,
      value,
    ] = match;
    const locatorOptions = options1 ? JSON.parse(options1) : {};
    
    const pageMethod = method1 as keyof typeof page;
    let element = await (page[pageMethod] as Function)(param1, locatorOptions);

    if (method3) {
      const method3Func = method3 as keyof typeof element;
      element = await (element[method3Func] as Function)(
        param3,
        options3 ? JSON.parse(options3) : {}
      );
    }

    if (actionType && value) {
      const actionTypeFunc = actionType as keyof typeof element;
      await (element[actionTypeFunc] as Function)(value);
    }
  }
}

export async function screenshot(page: Page, screen: string, num?: number): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const screenshotPath = `./uploads/screenshots/${screen}_${num || ''}_${timestamp}.png`;
  await page.screenshot({ path: screenshotPath, fullPage: true });
}

async function highlightElement(page: Page, selector: string): Promise<void> {
  try {
    // Handle Playwright selectors
    if (selector.startsWith('getByRole') || selector.startsWith('locator')) {
      const element = await page.locator(selector);
      await element.evaluate((el) => {
        const htmlElement = el as HTMLElement;
        htmlElement.style.border = '2px solid red';
        htmlElement.style.backgroundColor = 'yellow';
      });
    } else {
      // Handle CSS selectors
      await page.evaluate((sel) => {
        const element = document.querySelector(sel);
        if (element) {
          const htmlElement = element as HTMLElement;
          htmlElement.style.border = '2px solid red';
          htmlElement.style.backgroundColor = 'yellow';
        }
      }, selector);
    }
  } catch (error) {
    log.warn(`Failed to highlight element with selector: ${selector}`);
  }
}

