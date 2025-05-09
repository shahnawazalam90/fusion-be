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
  actionType: string;
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



testData.forEach((data: { scenario: any; url: string; screens: any; }, index: any) => {
  test.describe(`Test Suite for ${data.scenario} screen - ${index}`, () => {
    test(`${data.scenario} test case - ${index}`, async ({ page }) => {
      await page.goto(data.url);
      let count = 0;
      for (const screen of data.screens) {
        for (const action of screen.actions) {
          console.log(`${count++} action: ${action.raw}`);
          await performActions(page, action);
        }
      }

      await page.waitForTimeout(5000);
    });
  });
});

test.afterAll(async ({browser})=> {
  await browser.close();
})





async function performActions(page: Page, action: Action) {
  const pattern = /(\w+)\('([^']*)'(?:,\s*({[^}]*}))?\)(?:\.(\w+)\(({[^}]*})\))?(?:\.(\w+)\('([^']*)'(?:,\s*({[^}]*}))?\))?\.(\w+)\(?([^)]*)?\)?/;

  const match = action.raw.match(pattern);

  if (match) {
    const [, method1, param1, options1, method2, param2, method3, param3, options3, actionType, value] = match;

    const locatorOptions = options1 ? JSON.parse(options1) : {};

    let element = await page[method1](param1, options1 && options1.startsWith('{') ? JSON.parse(options1) : {});

    if (method3) {
      element = await element[method3](param3, options3 && options3.startsWith('{') ? JSON.parse(options3) : {});
    }

    // Perform the appropriate action
    if (actionType === "click") {
      await element.nth(0).click();
      await page.waitForTimeout(1000);
    } else if (actionType === "press") {
      const sanitizedValue = action.value || '';
      await element.nth(0).press(sanitizedValue);
      await page.waitForTimeout(1000);
    } else if (actionType === "fill") {
      console.log(`Filling value: ${action.value} for element: ${param1}`);
      await element.nth(0).fill(action.value || '');
      await page.waitForTimeout(1000);

      if (action.raw.includes('combobox')) {
        await executeCopyPaste(element.nth(0), page);
      }
    } else if (actionType === "selectOption") {
      const sanitizedValue = action.value || '';
      try {
        await element.nth(0).selectOption(sanitizedValue);
        await page.waitForTimeout(2000);
        await element.first().press('Tab');
      } catch (error) {
        console.error('Error in selectOption:', error);
      }
    } else {
      console.error(`Unsupported action type: ${actionType}`);
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


