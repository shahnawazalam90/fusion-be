import * as fs from "fs";
import * as path from "path";
import { test, expect, Page, Locator, Browser } from "@playwright/test";

// Configure global timeout
test.setTimeout(300000); // 5 minutes global timeout

// const filePath = path.resolve(__dirname, "..", "data", "purchase_requisition.json");
// const filePath = path.resolve(__dirname, "..", "data", "order_to_cash_copy1.json");
const dataFileName = process.env.DATAFILE || "";

const filePath = path.resolve(__dirname, "..", "scenarios", dataFileName);
console.log(`Using data file: ${filePath}`);
const testData = JSON.parse(fs.readFileSync(filePath, "utf-8"));



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
  parsedValue?: string;
  assertionType?: string;
  variable?: string;
  raw: string;
  value?: string;
  childLocator?: string;
  additionalFilter?: {
    hasText?: string;
    hasNot?: string;
  };
}

let outputfile: fs.PathOrFileDescriptor;

let requisitionId: string;
let browser;
let purchaseOrderId: string;
let salesOrderId: string;
let pickWaveId: string;
let shipmentId: string;
let processId: string;
let pickWaveId1: string;



testData.forEach((data, index) => {
  test.describe(`Test Suite for ${data.scenario} screen - ${index}`, () => {
    test(`${data.scenario} test case - ${index}`, async ({ page }) => {
      await page.goto(data.url);
      let count = 0;

      for (const screen of data.screens) {
        for (const screenAction of screen.actions) {
          console.log(`${count++} action: ${screenAction.raw}`);
          await performActions(page, screenAction, screen.screenName);
        }
      }

      await page.waitForTimeout(5000);
    });
  });
});

test.afterAll(async ({ browser }) => {
  await browser.close();
});

async function performActions(
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
          logger.info(`Pick Wave ID: ${pickWaveId}`);
          await page.locator(customXpath).nth(0).click();
        } else if (screen.raw.includes("Interfaces shipping details")) {
          await page.waitForTimeout(8000);
          await element.nth(0).click();
        } else if (screen.raw.includes("getByText")) {
          if (screen.raw.includes("Requisition")) {
            const textContent = await element.nth(0).textContent();
            requisitionId = await extractRequisition(textContent);
            console.log(`Requisition ID: ${requisitionId}`);
          } else if (screen.raw.includes("Purchase Orders")) {
            const textContent = await element.nth(0).textContent();
            purchaseOrderId = await extractRequisition(textContent);
            console.log(`****** Purchase Order ID: ${purchaseOrderId} ******`);
          } else if (screen.raw.includes("was released")) {
            const textContent = await page
              .getByText(/Pick wave \d+ was released/)
              .textContent();
            pickWaveId1 = await extractRequisition(textContent);
            expect(textContent).toMatch(
              /Pick wave \d+ was released. Number of pick slips: 1 and number of picks: 1./
            );
            console.log(`****** Pick wave ID1: ${pickWaveId1} ******`);
          } else if (screen.raw.includes("Sales order")) {
            const salesOrderIDMsg = await page
              .getByText(/Sales order \d+ was/)
              .textContent();
            salesOrderId = await extractRequisition(salesOrderIDMsg);
            console.log(`****** Sales Order ID: ${salesOrderId} ******`);
          } else if (screen.raw.includes("The shipment")) {
            const shippmentMsg = await page
              .getByText(/The shipment \d+ was confirmed./)
              .textContent();
            shipmentId = await extractRequisition(shippmentMsg);
            console.log(`****** The shipment ID: ${shipmentId} ******`);
          } else if (screen.raw.includes("Process")) {
            const processIdMsg = await page
              .getByText(/Process \d+ was submitted./)
              .textContent();
            processId = await extractRequisition(processIdMsg);
            console.log(`The process ID: ${processId}`);
          } else if (screen.raw.includes("Shipped")) {
            const orderStatus = await page.getByText("Shipped").textContent();
            expect(orderStatus).toEqual("Shipped");
            console.log(`Order Status: ${orderStatus}`);
          } else {
            await element.nth(0).click();
            await page.waitForTimeout(1000);
          }
        } else if (screen.raw.includes("Order Management")) {
          console.log(
            `Clicking on element: ${await element.nth(0).isVisible()}`
          );
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
        console.error(`Unsupported action type: ${screen.action}`);
    }
  }
}

/**
 *
 * @param page
 * @param locator
 * @param params
 */
async function handleActionsFromJson(page: Page, action: Action) {
  const { action: act, locatorType, params, childLocator, value, additionalFilter } = action;
  let element;
  let elementText;
  if (locatorType === "getByRole") {
    element = await page.getByRole(...params);
  } else if (locatorType === "locator") {
    element = await page.locator(...params);
  } else if (locatorType === "getByTitle") {
    element = await page.getByTitle(...params);
  } else if (locatorType === "getByText") {
    element = await page.getByText(...params);
  } else if (locatorType === "getByLabel") {
    element = await page.getByLabel(...params);
  } else {
    throw new Error(`Unknown locatorType: ${locatorType}`);
  }


  if (childLocator) {
    if (additionalFilter !== undefined) {
      element =  element.nth(0).filter(additionalFilter).getByRole(childLocator?.params)
    } else {
      element = element.locator(childLocator);
    }
  }

  if (act === "fill") {
    await element.nth(0).waitFor({ state: 'visible' })
    await element.nth(0).fill(value);
    if (params[0].includes('combobox')) {
      await executeCopyPaste(element.nth(0), page)
      await page.keyboard.press('Enter')
    }
  } else if (act === "click") {
    if (params[0].includes('option')) {
      await page.locator(`text=/${params[1]?.name}/i`).first().waitFor({ state: 'visible', timeout: 10000 })
      await page.locator(`text=/${params[1]?.name}/i`).first().click();
    } else {
      await page.waitForTimeout(1000)
      await element.nth(0).waitFor({ state: 'visible' })
      await element.nth(0).click({force:true});
    }
  } else if (act === "selectOption") {
    await element.nth(0).waitFor({ state: 'visible', timeout: 10000 })
    await element.selectOption(value);
    if (params[0].includes('Business Unit')) {
      await page.keyboard.press('Enter')
    }
    await page.waitForTimeout(2000);
  } else if (act === "getText") {
    action.variable = await element.textContent();
    requisitionId = await extractRequisition(action.variable);
  } else if (act === "expect") {
    await handleDynamicAssertion(element, action.assertionType, value);
  } else {
    throw new Error(`Unknown action: ${act}`);
  }
}

async function executeCopyPaste(element:Locator, page:Page) {
  await element.nth(0).click(); // Focus on the field
  await page.keyboard.press('Control+A'); // On macOS, use 'Command+A'
  await page.keyboard.press('Control+C'); // On macOS, use 'Command+C'
  console.log('Text copied successfully.');
  await element.nth(0).press('Backspace')
  await page.waitForTimeout(2000)
  await element.nth(0).press('Control+V')
  await page.waitForTimeout(2000)
}

async function getElement(page: Page, locatorType: string, params: string[]): Promise<Locator> {
  switch (locatorType) {
      case "getByRole":
          return page.getByRole(...params);
      case "locator":
          return page.locator(...params);
      case "getByTitle":
          return page.getByTitle(...params);
      case "getByText":
          return page.getByText(...params);
      case "getByLabel":
          return page.getByLabel(...params);
      default:
          throw new Error(`Unknown locatorType: ${locatorType}`);
  }
}




async function handleDynamicAssertion(element: any, assertionType: string, expectedValue: string): Promise<void> {
    switch (assertionType) {
      case 'toContainText':
        await expect.soft(element.nth(0)).toContainText(expectedValue);
        break;
      case 'toHaveValue':
        await expect.soft(element.nth(0)).toHaveValue(expectedValue);
        break;
      case 'includes':
        const actualValue = await element.nth(0).textContent();
        if (!actualValue.includes(expectedValue)) {
          throw new Error(`Assertion failed: '${actualValue}' does not include '${expectedValue}'`);
        }
        break;
      default:
        throw new Error(`Unsupported assertion type: ${assertionType}`);
    }
}

async function extractRequisition(requisitionText:string) {
  const requisitionId = requisitionText.match(/\d+/)[0]; // Extracts the numeric ID
  console.log(`Extracted Latest Requisition ID: ${requisitionId}`);
  return requisitionId;
}

/**
 *
 * @param lcoator
 * @param value
 */

async function send_keys(lcoator: Locator, value: string) {
  try {
    console.log(value);
    await lcoator.fill(value, { timeout: 3000 });
  } catch (error) {
    console.error("Error occurred while filling the element: ", error);
    throw new Error("Error occurred while filling the element: " + error);
  }
}

/**
 *
 * @param lcoator
 */

async function click(lcoator: Locator) {
  try {
    await lcoator.click({ timeout: 3000 });
  } catch (error) {
    console.error(
      "Error occurred while performing click action on the element: ",
      error
    );
    throw new Error(
      "Error occurred while performing click action on the element: " + error
    );
  }
}

/**
 *
 * @param action
 * @param element
 * @param value
 */

function peformAction(action: string, element: Locator, value: string) {
  if (action === "fill" && value) {
    send_keys(element, value);
  } else if (
    action === "click" ||
    action === "combobox" ||
    action === "option"
  ) {
    click(element);
  } else {
    throw new Error("mathcing action is not implemented.");
  }

}

async function waitUntilOrderStatusChange(page: Page, element: Locator) {
  while (true) {
    const awaitingShippingVisible = await page.getByRole("cell", { name: "Awaiting Shipping", exact: true }).isVisible();
    const shippedVisible = await page.getByRole("cell", { name: "Shipped", exact: true }).isVisible();
 
    if (awaitingShippingVisible) {
      console.log("Awaiting Shipping is visible. Clicking...");
      await page.getByRole("cell", { name: "Awaiting Shipping", exact: true }).click();
      break;
    }
 
    if (shippedVisible) {
      console.log("Shipped is visible. Clicking...");
      await page.getByRole("cell", { name: "Shipped", exact: true }).click();
      break;
    }
 
    // Retry after a short delay
    console.log("Neither 'Awaiting Shipping' nor 'Shipped' is visible. Retrying...");
    await element.click(); // Trigger any necessary action to refresh the status
    await page.waitForTimeout(3000);
  }
 
  console.log("Order status changed to 'Awaiting Shipping' or 'Shipped'.");
}

async function selectTabByPageIndex(
  page: Page, targetText: string, loc: Locator, // The text you are searching for
  ) {
      // Mapping text to nav-page-index
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
      ["Others", 6]
      ]);
  
      // Get the assigned `nav-page-index` for the target text
    const targetNavPageIndex = textNavPageMap.get(targetText);
  
      if (targetNavPageIndex === undefined) {
          console.log(`Target text "${targetText}" not found in predefined mapping.`);
          return;
      }
  
      while (true) {
          const currentNavPageIndex = await page.getAttribute('#navmenu-container', "nav-page-index");
          console.log(`Current Nav Page Index: ${currentNavPageIndex}`);
  
          if (!currentNavPageIndex) {
              console.log("Unable to retrieve current nav-page-index. Exiting...");
              return;
          }
  
          // Convert nav-page-index to integer
          const currentIndex = parseInt(currentNavPageIndex, 10);
  
          // If current page index matches the target, click the element
          if (currentIndex === targetNavPageIndex) {
              console.log(`"${targetText}" is in the correct nav-page-index, clicking...`);
  
             await loc.scrollIntoViewIfNeeded();
             await loc.click();
              console.log(`Clicked on "${targetText}" successfully!`);
              break;
          }
  
          // Navigate left or right based on index comparison
          if (targetNavPageIndex < currentIndex ) {
              console.log(`Navigating right to find "${targetText}"...`);
             await page.locator("//div[@id='clusters-left-nav']").click();
          } else {
              console.log(`Navigating left to find "${targetText}"...`);
              await page.locator("//div[@id='clusters-right-nav']").click();
          }
  
          await page.waitForTimeout(500); // Allow UI update
      }
  }


