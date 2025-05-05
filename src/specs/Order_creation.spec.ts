import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {

  // login screen
  await page.goto('https://login-eqne-dev6-saasfademo1.ds-fa.oraclepdemos.com/oam/server/obrareq.cgi?ECID-Context=1.006CzYXZ4lw2VOV6y3U%5EMG009%5EtS00058w%3BkXjE');
  await page.getByRole('textbox', { name: 'User ID' }).fill('SCM_IMPLt%x7V6X?');
  await page.getByRole('textbox', { name: 'User ID' }).press('ControlOrMeta+z');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('t%x7V6X?');
  await page.getByRole('button', { name: 'Sign In' }).click();

  // home screen
  await page.goto('https://fa-eqne-dev6-saasfademo1.ds-fa.oraclepdemos.com/fscmUI/faces/AtkHomePageWelcome?_adf.ctrl-state=1ayr1sddpk_1&_adf.no-new-window-redirect=true&_afrLoop=39670490148156094&_afrWindowMode=2&_afrWindowId=bm0p2c7p5&_afrFS=16&_afrMT=screen&_afrMFW=1366&_afrMFH=633&_afrMFDW=1366&_afrMFDH=768&_afrMFC=8&_afrMFCI=0&_afrMFM=0&_afrMFR=96&_afrMFG=0&_afrMFS=0&_afrMFO=0');
  await page.getByRole('link', { name: 'Home', exact: true }).click();
  await page.locator('#clusters-right-nav svg').click();
  await page.locator('#clusters-right-nav svg').click();
  await page.getByRole('link', { name: 'Order Management' }).click();
  await page.getByLabel('Order Management').getByRole('link', { name: 'Order Management' }).click();

  // overview screen
  await page.getByRole('button', { name: 'Create Order' }).click();

  //Create Order screen
  await page.getByLabel('Business Unit').selectOption('87');
  await page.getByRole('combobox', { name: 'Customer', exact: true }).click();
  await page.getByRole('combobox', { name: 'Customer', exact: true }).fill('Test');
  await page.getByRole('option', { name: 'Test_Customer_2' }).click();
  await page.getByRole('menubar').filter({ hasText: 'ActionsCreate' }).getByRole('link').click();
  await page.getByText('Edit Currency Details').click();
  await page.getByLabel('Order Currency').selectOption('0');
  await page.getByRole('button', { name: 'OK' }).click();
  await page.getByRole('combobox', { name: 'ItemNumber' }).click();
  await page.getByRole('combobox', { name: 'ItemNumber' }).fill('Test_Standard_Item');
  await page.getByRole('combobox', { name: 'ItemNumber' }).press('Tab');
  await page.getByRole('button', { name: 'Add' }).click();
  await page.getByRole('menubar').filter({ hasText: 'ActionsCreate' }).getByRole('link').click();
  await page.getByText('Validate').click();
  await page.getByRole('button', { name: 'Yes' }).click();
  await page.getByRole('button', { name: 'OK' }).click();
  await page.getByRole('button', { name: 'Submit' }).click();
  await page.getByText('Sales order 98554 was').click();
  await page.getByRole('button', { name: 'OK' }).click();
  await page.getByRole('button', { name: 'Refresh' }).click();
  await expect(page.locator('form[name="f1"]')).toContainText('Not Started');
  await page.getByRole('button', { name: 'Refresh' }).click();
  await expect(page.locator('form[name="f1"]')).toContainText('Scheduled');
  await page.getByRole('button', { name: 'Refresh' }).click();
  await expect(page.locator('form[name="f1"]')).toContainText('Reserved');
  await page.getByRole('button', { name: 'Refresh' }).click();
  await expect(page.locator('form[name="f1"]')).toContainText('Awaiting Shipping');
  await page.getByRole('button', { name: 'Done' }).click();

  // global headers

  await page.getByRole('link', { name: 'Home', exact: true }).click();


  // home screen
  await page.getByRole('link', { name: 'Supply Chain Execution' }).click();
  await page.getByRole('link', { name: 'Inventory Management (Classic)' }).click();



  // Inventory Management screen
  await page.getByRole('link', { name: 'Tasks' }).click();
  await page.getByLabel('Show Tasks').selectOption('Picks');
  await page.getByRole('link', { name: 'Create Pick Wave' }).click();


  // Create Pick Wave screen
  await page.getByRole('combobox', { name: 'Ship-from Organization' }).click();
  await page.getByRole('combobox', { name: 'Ship-from Organization' }).fill('TEST_INV1');
  await page.getByRole('combobox', { name: 'Order', exact: true }).click();
  await page.getByLabel('Order Type').selectOption('Sales order');
  await page.getByRole('combobox', { name: 'Order', exact: true }).fill('98560');
  await page.getByRole('button', { name: 'Release Now' }).click();
  await page.getByText('Pick wave 282903 was released').click();
  await page.getByRole('button', { name: 'OK' }).click();


  // Inventory Management screen
  await page.getByRole('link', { name: 'Tasks' }).click();
  await page.getByRole('link', { name: 'Confirm Pick Slips' }).click();

  //Confirm Pick Slips: Search
  await page.getByRole('combobox', { name: 'Order', exact: true }).click();
  await page.getByRole('combobox', { name: 'Order', exact: true }).fill('98560');
  await page.getByRole('button', { name: 'Search', exact: true }).click();

  await page.getByRole('link', { name: '204540' }).click();
  await page.getByRole('cell', { name: 'Ready to confirm' }).locator('label').click();
  await page.getByRole('textbox', { name: 'Picked Quantity' }).fill('1');
  await page.getByTitle('Confirm', { exact: true }).click();
  await page.getByText('Confirm and Go to Ship Confirm').click();

  // edit order screen
  await page.getByRole('combobox', { name: 'Shipping Method' }).fill('Test_Carrier-Air-Air');
  await page.getByRole('combobox', { name: 'Shipping Method' }).press('Tab');
  await page.getByRole('textbox', { name: 'Waybill' }).fill('100');

  await page.getByRole('textbox', { name: 'Gross Weight' }).click();
  await page.getByRole('textbox', { name: 'Gross Weight' }).fill('10');
  await page.getByRole('textbox', { name: 'Volume' }).click();
  await page.getByRole('textbox', { name: 'Volume' }).fill('10');
  await page.getByRole('textbox', { name: 'Shipped Quantity' }).click();
  await page.getByRole('textbox', { name: 'Shipped Quantity' }).fill('1');

  await page.getByRole('button', { name: 'Ship Confirm' }).click();
  await page.getByText('The shipment 95196 was').click();
  await page.getByRole('button', { name: 'OK' }).click();


   // global headers
  await page.getByRole('link', { name: 'Home', exact: true }).click();

  // home screen
  await page.getByLabel('Order Management').getByRole('link', { name: 'Order Management' }).click();
  await page.getByRole('menuitem', { name: 'Tasks' }).locator('div').click();
  await page.getByText('Manage Orders', { exact: true }).click();

  // manage order screen
  await page.getByRole('textbox', { name: 'Order', exact: true }).click();
  await page.getByRole('textbox', { name: 'Order', exact: true }).fill('98561');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByRole('link', { name: '98561' }).click();

  //98561
  await page.getByText('Shipped').click();











});
