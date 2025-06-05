import * as fs from 'fs';
import * as path from 'path';
import { test, expect, Page, Locator } from '@playwright/test';
import { performJSONAction, performActions, screenshot } from './actions';
import { page, setupBrowser } from './browser';
import { captureVideo, log } from './utils';

// Configure global timeout
test.setTimeout(300000); // 5 minutes global timeout

const dataFileName = process.env.DATAFILE || '';
const filePath = path.resolve(
  __dirname,
  '..',
  '..',
  'uploads',
  'scenarios',
  dataFileName
);
console.log(`Using data file: ${filePath}`);
const testData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

// testData.forEach((data, index) => {
//   test.describe(`Test Suite for ${data.scenario} screen - ${index}`, () => {
//     let page: Page;

//     test.beforeAll(async () => {
//       page = await setupBrowser();
//     });

//     test(`${data.scenario} test case - ${index}`, async ({}, testInfo) => {
//       await test.step(`Navigate to URL: ${data.url}`, async () => {
//         await page.goto(data.url);
//       });

//       let count = 0;
//       let num = 1;
//       for (const screen of data.screens) {
//         await test.step(`************* Execution started for : ${screen.screenName} *************`, async () => {
//           for (const screenAction of screen.actions) {
//             log.info(`${count++} action : ${screenAction.raw}`);
//             await performJSONAction(page, screenAction, screen.screenName, num++);
//           }
//         });

//         await test.step(`************* Execution completed for : ${screen.screenName} *************`, async () => {
//           await screenshot(page, screen.screenName, num);
//           num++;
//         });
//       }
//     });
//   });
// });

testData.forEach(
  (data: { scenario: any; url: string; screens: any }, index: any) => {
    test.describe(`Test Suite for ${data.scenario} screen - ${index}`, () => {
      let page: Page;

      test.beforeAll(async () => {
        page = await setupBrowser();
      });

      test(`${data.scenario} test case - ${index}`, async ({}, testInfo) => {
        await test.step(`Navigate to URL: ${data.url}`, async () => {
          await page.goto(data.url);
        });

        let count = 0;
        let num = 1;
        try {
          for (const screen of data.screens) {
            await test.step(`Execution started : ${screen.screenName} `, async () => {
              for (const screenAction of screen.actions) {
                log.info(`${count++} action : ${screenAction.raw}`);
                await performJSONAction(
                  page,
                  screenAction,
                  screen.screenName,
                  num++
                );
              }
            });

            await test.step(`Execution completed : ${screen.screenName} `, async () => {
              await screenshot(page, screen.screenName, num);
              num++;
            });
          }
          await captureVideo(page, data.scenario, testInfo);
        } catch (error) {
          await captureVideo(page, data.scenario, testInfo);
        }
      });
    });
  }
);
// test.afterAll(async ({ browser }) => {
//   await browser.close();
// });
