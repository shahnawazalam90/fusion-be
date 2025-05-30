import test, { expect, Locator, Page } from "@playwright/test";
import { executeCopyPaste, extractRequisition, log } from "./utils";

let requisitionId: string;
let purchaseOrderId: string;
let salesOrderId: string;
let pickWaveId: string;
let shipmentId: string;
let processId: string;
let pickWaveId1: string;
let pickSlipId: string | null;

type LocatorMethods =
  | "getByRole"
  | "getByLabel"
  | "getByText"
  | "locator"
  | "getByTitle";

interface Action {
  action: string;
  locatorType: string;
  params: any[];
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
      // await selectDropdownValue(screen, page);
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
        await eval(`(async () => { await page.${screen.raw}; })()`);
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
    throw new Error(`${error}`);
  }
}

async function click(screen: Action, page: Page) {
  let actionPerformed = false; // Flag to track execution

  if (
    /getByRole\('link',\s*\{\s*"name":\s*"\d+"\s*\}\)\.click\(\)/.test(
      screen.raw
    )
  ) {
    // const customXpath = '//table[@summary="Search Results"]//a';
    const customXpath =
      "//table[@summary='Search Results']//a[contains(text(), '1') or contains(text(), '2') or contains(text(), '3') or contains(text(), '4') or contains(text(), '5') or contains(text(), '6') or contains(text(), '7') or contains(text(), '8') or contains(text(), '9') or contains(text(), '0')]";
    pickSlipId = await page.locator(customXpath).nth(0).textContent();
    log.debug(`Pick Slip ID: ${pickSlipId}`);
    await highlightElement(page, `locator(${customXpath}).nth(0)`);
    await page.locator(customXpath).nth(0).click();
    actionPerformed = true;
  }

  if (screen.raw.includes("Interfaces shipping details")) {
    await page.waitForTimeout(5000);
    await highlightElement(page, screen.raw);
    await eval(`(async () => { await page.${screen.raw}; })()`);
    actionPerformed = true;
  }

  if (screen.raw.includes("Refresh")) {
    await highlightElement(page, screen.raw.split(".click")[0]);
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

  // Default action only if no conditions were met
  if (!actionPerformed) {
    await highlightElement(page, screen.raw.split(".click")[0]);
    await eval(`(async () => { await page.${screen.raw}; })()`);
  }
}

/**
 * Extracts text content from the specified locator based on the screen action.
 * @param screen - The screen object containing the action and raw locator.
 * @param page - The Playwright page object.
 */
async function getTextContent(screen: Action, page: Page) {
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
    await eval(`(async () => { await page.${screen.raw}; })()`);
  }
}

/**
 *
 * @param screen
 */
async function selectDropdownValue(screen: Action, page: Page) {
  const baseLocator = screen.raw.split(".selectOption")[0];
  await highlightElement(page, baseLocator);
  const value = screen.value?.replace(/^'(.*)'$/, "$1");
  await eval(`(async () => { await page.${baseLocator}.click(); })()`);

  await (async () => {
    await expect(eval(`page.${baseLocator}`))["toContainText"](value || '');
  })();

  await eval(
    `(async () => { await page.${baseLocator}.selectOption('${value}'); })()`
  );
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
  const assertion = screen.raw;
  const locator = assertion.match(/page\.(locator|getBy[A-Za-z]+)\(.*?\)/)?.[0];
  const condition = assertion.match(/\.to[A-Za-z]+/)?.[0].replace(".", "");
  const expectedResult = assertion.match(/[A-Za-z]+\(["']([^"']+)["']\)/)?.[1];

  console.log({ locator, condition, expectedResult });

  const assertionStatus = await (async () => {
    try {
      if (expectedResult === undefined) {
        await expect(eval(`${locator}`))[condition]();
      } else {
        await expect(eval(`${locator}`))[condition](expectedResult);
      }

      return "PASSED"; // If assertion succeeds
    } catch (error) {
      throw new Error(`FAILED: ${error.message}`); // If assertion fails
    }
  })();

  console.log(`Assertion status: ${assertionStatus}`);
}

/**
 *
 * @param element
 * @param assertionType
 * @param expectedValue
 */
async function handleDynamicAssertion(
  element: Locator,
  assertionType: string,
  expectedValue: string
): Promise<void> {
  switch (assertionType) {
    case "toContainText":
      await expect.soft(element).toContainText(expectedValue);
      break;
    case "toHaveValue":
      await expect.soft(element).toHaveValue(expectedValue);
      break;
    case "includes":
      const actualValue = await element.textContent();
      if (!actualValue.includes(expectedValue)) {
        throw new Error(
          `Assertion failed: '${actualValue}' does not include '${expectedValue}'`
        );
      }
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
async function waitUntilOrderStatusChange(page: Page, element: Locator) {
  const maxAttempts = 50; // Define max retries
  let attemptCount = 0;
  let initialStatusChecked = false;

  while (attemptCount < maxAttempts) {
    const awaitingShippingVisible = await page
      .getByRole("cell", { name: "Awaiting Shipping", exact: true })
      .isVisible();
    const shippedVisible = await page
      .getByRole("cell", { name: "Closed", exact: true })
      .isVisible();

    const awaitingBillingingVisible = await page
      .getByRole("cell", { name: "Awaiting Billing", exact: true })
      .isVisible();

    if (!initialStatusChecked && awaitingShippingVisible) {
      log.info("Awaiting Shipping is visible. Clicking...");
      await page
        .getByRole("cell", { name: "Awaiting Shipping", exact: true })
        .click();
      initialStatusChecked = true;
      break;
    }

    if (awaitingBillingingVisible) {
      log.info("Awaiting Billinging is visible. Clicking...");
      await page
        .getByRole("cell", { name: "Awaiting Billing", exact: true })
        .click();
      break;
    }

    if (shippedVisible) {
      log.info("Shipped is visible. Clicking...");
      await page.getByRole("cell", { name: "Shipped", exact: true }).click();
      break;
    }

    // Retry after a short delay
    log.warn(
      `Attempt ${
        attemptCount + 1
      }: Neither 'Awaiting Shipping' nor 'Shipped' is visible. Retrying...`
    );
    await element.click(); // Trigger any necessary action to refresh the status
    await page.waitForTimeout(3000);
    attemptCount++;
  }

  if (attemptCount >= maxAttempts) {
    log.error("Max attempts reached! Exiting loop.");
    throw new Error("Order status did not change within the expected time.");
  } else {
    log.info("Order status changed to 'Awaiting Shipping' or 'Shipped'.");
  }
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
  // Define a mapping of text to nav-page-index
  const textNavPageMap = new Map<string, number>([
    ["Redwood Sales", 0],
    ["Service", 0],
    ["Me", 0],
    ["Procurement", 0],
    ["Help Desk", 0],
    ["Product Management", 0],
    ["Benefits Administration", 1],
    ["Subscription Management", 1],
    ["Contract Management", 1],
    ["Order Management", 2],
    ["Supply Chain Execution", 2],
    ["Receivables", 2],
    ["Collections", 2],
    ["Supply Chain Planning", 3],
    ["Supplier Portal", 3],
    ["Payables", 3],
    ["General Accounting", 3],
    ["Intercompany Accounting", 4],
    ["Academics", 4],
    ["Academic Tools", 4],
    ["Permitting and Licensing", 4],
    ["Sustainability", 5],
    ["My Enterprise", 5],
    ["Tools", 5],
    ["Configuration", 5],
    ["PLM Administration", 5],
    ["PLM Custom Objects", 6],
    ["Others", 6],
  ]);

  // Get the assigned `nav-page-index` for the target text
  const targetNavPageIndex = textNavPageMap.get(targetText);

  if (targetNavPageIndex === undefined) {
    log.warn(`Target text "${targetText}" not found in predefined mapping.`);
    return;
  }

  while (true) {
    const currentNavPageIndex = await page.getAttribute(
      "#navmenu-container",
      "nav-page-index"
    );
    log.info(`Current Nav Page Index: ${currentNavPageIndex}`);

    if (!currentNavPageIndex) {
      log.info("Unable to retrieve current nav-page-index. Exiting...");
      return;
    }

    // Convert nav-page-index to integer
    const currentIndex = parseInt(currentNavPageIndex, 10);

    // If current page index matches the target, click the element
    if (currentIndex === targetNavPageIndex) {
      log.info(`"${targetText}" is in the correct nav-page-index, clicking...`);

      await eval(`(async () => { await page.${screen.raw}; })()`);
      log.info(`Clicked on "${targetText}" successfully!`);
      break;
    }

    // Navigate left or right based on index comparison
    if (targetNavPageIndex < currentIndex) {
      log.info(`Navigating right to find "${targetText}"...`);
      await highlightElement(page, "locator(\"//div[@id='clusters-left-nav']\")");
      await page.locator("//div[@id='clusters-left-nav']").click();
    } else {
      log.info(`Navigating left to find "${targetText}"...`);
      await highlightElement(page, "locator(\"//div[@id='clusters-right-nav']\")");
      await page.locator("//div[@id='clusters-right-nav']").click();
    }

    await page.waitForTimeout(1000); // Allow UI update
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
    let element = await page[method1](param1, locatorOptions);

    if (method3) {
      element = await element[method3](
        param3,
        options3 ? JSON.parse(options3) : {}
      );
    }

    switch (screen.action) {
      case "click":
        if (screen.raw.includes("Refresh")) {
          // Handle the "Refresh" action
          await waitUntilOrderStatusChange(page, element.nth(0));
        } else if (
          /getByRole\('link',\s*\{\s*"name":\s*"\d+"\s*\}\)\.click\(\)/.test(
            screen.raw
          )
        ) {
          const customXpath = '//table[@summary="Search Results"]//a';
          pickWaveId = await page.locator(customXpath).nth(0).textContent();
          log.debug(`Pick Wave ID: ${pickWaveId}`);
          await page.locator(customXpath).nth(0).click();
        } else if (screen.raw.includes("Interfaces shipping details")) {
          await page.waitForTimeout(8000);
          await element.nth(0).click();
        } else if (screen.raw.includes("getByText")) {
          if (screen.raw.includes("Requisition")) {
            const textContent = await element.nth(0).textContent();
            requisitionId = await extractRequisition(textContent);
            log.debug(`Requisition ID: ${requisitionId}`);
          } else if (screen.raw.includes("Purchase Orders")) {
            const textContent = await element.nth(0).textContent();
            purchaseOrderId = await extractRequisition(textContent);
            log.debug(`****** Purchase Order ID: ${purchaseOrderId} ******`);
          } else if (screen.raw.includes("was released")) {
            const textContent = await page
              .getByText(/Pick wave \d+ was released/)
              .textContent();
            pickWaveId1 = await extractRequisition(textContent);
            expect(textContent).toMatch(
              /Pick wave \d+ was released. Number of pick slips: 1 and number of picks: 1./
            );
            log.debug(`****** Pick wave ID1: ${pickWaveId1} ******`);
          } else if (screen.raw.includes("Sales order")) {
            const salesOrderIDMsg = await page
              .getByText(/Sales order \d+ was/)
              .textContent();
            salesOrderId = await extractRequisition(salesOrderIDMsg);
            log.debug(`****** Sales Order ID: ${salesOrderId} ******`);
          } else if (screen.raw.includes("The shipment")) {
            const shippmentMsg = await page
              .getByText(/The shipment \d+ was confirmed./)
              .textContent();
            shipmentId = await extractRequisition(shippmentMsg);
            log.debug(`****** The shipment ID: ${shipmentId} ******`);
          } else if (screen.raw.includes("Process")) {
            const processIdMsg = await page
              .getByText(/Process \d+ was submitted./)
              .textContent();
            processId = await extractRequisition(processIdMsg);
            log.debug(`The process ID: ${processId}`);
          } else if (screen.raw.includes("Shipped")) {
            const orderStatus = await page.getByText("Shipped").textContent();
            expect(orderStatus).toEqual("Shipped");
            log.debug(`Order Status: ${orderStatus}`);
          } else {
            await element.nth(0).click();
            await page.waitForTimeout(1000);
          }
        } else if (screen.raw.includes("Order Management")) {
          log.info(`Clicking on element: ${await element.nth(0).isVisible()}`);
          await selectTabByPageIndex(page, "Order Management", element.nth(0));
        } else {
          // await element.nth(0).scrollIntoViewIfNeeded();
          await page.waitForTimeout(1000);
          await element.nth(0).hover();
          await element.nth(0).click();
          await page.waitForTimeout(1000);
        }
        break;
      case "press":
        const sanitizedValue = screen.parsedValue?.replace(/^'(.*)'$/, "$1");
        await element.nth(0).press(sanitizedValue);
        await page.waitForTimeout(1000);
        break;

      case "fill":
        const fillValue = screen.value?.replace(/^'(.*)'$/, "$1");
        await element.nth(0).fill(fillValue);
        if (
          screen.raw.includes("From Shipment") ||
          screen.raw.includes("To Shipment")
        ) {
          element.nth(0).fill(shipmentId);
        }

        if (screen.raw.includes("combobox")) {
          await executeCopyPaste(element.nth(0), page);
        }

        if (screen.raw.includes("Manage Shipment Interface")) {
          await element.nth(0).click();
          await page.waitForTimeout(3000);
        }

        if (screen.raw.includes("Requisition")) {
          await element.nth(0).fill(requisitionId);
        }

        if (screen.raw.includes("Order")) {
          await element.nth(0).fill(`${salesOrderId}`);
          await element.nth(0).press("Tab");
          await page.waitForTimeout(2000);
        }
        break;

      case "selectOption":
        const selectValue = screen.value?.replace(/^'(.*)'$/, "$1");
        await element.nth(0).click();
        await element.nth(0).selectOption(selectValue);
        await page.waitForTimeout(2000);
        break;

      case "expect":
        await handleDynamicAssertion(
          element.nth(0),
          screen.assertionType,
          screen.parsedValue
        );
        break;

      default:
        log.error(`Unsupported action type: ${screen.action}`);
    }
  }
}

export async function screenshot(page: Page, screen: string, num?: number) {
  const screenshotBuffer = await page.screenshot();
  test.info().attach(`Screenshot# ${num}: ${screen}`, {
    contentType: "image/png",
    body: screenshotBuffer,
  });
}


async function highlightElement(page: Page, selector: any) {
  const locator: Locator = (new Function('page', `return page.${selector}`))(page);
  await locator.evaluate((el) => {
    el.style.border = '3px solid red';
    el.style.transition = 'border 0.3s ease';
  });
}

