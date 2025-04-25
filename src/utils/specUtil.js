const fs = require('fs');

function parseSpecSteps(filePath) {
  // Read the file content
  const fileContent = fs.readFileSync(filePath, 'utf-8');

  const screens = [];
  const lines = fileContent.split('\n');
  let currentScreen = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Detect screen start based on comments
    if (line.startsWith('//')) {
      if (currentScreen) {
        screens.push(currentScreen);
      }
      currentScreen = {
        screenName: line.replace('//', '').trim(),
        scenario: '',
        url: '',
        actions: []
      };
    } else if (line.startsWith('await page.goto')) {
      const urlMatch = line.match(/await page\.goto\('(.*?)'\)/);
      if (urlMatch && currentScreen) {
        const url = urlMatch[1];
        if (!currentScreen.url) {
          currentScreen.url = url;
        }
        if (currentScreen.actions.length !== 0) {
          currentScreen.actions.push({
            action: 'goto',
            locator: 'URL',
            value: url
          });
        }
      }
    } else if (line.startsWith('await page.')) {
      const actionMatch = line.match(/await page\.(\w+)\((.*?)\)/);
      if (actionMatch && currentScreen) {
        const [, method] = actionMatch;
        let locator = '';
        let value = '';
        let action = method; // Default action is the method name

        // Handle getByRole
        const roleMatch = line.match(/getByRole\('(.*?)',\s*{.*?name:\s*'(.*?)'.*?}\)/);
        if (roleMatch) {
          locator = `//[Role='${roleMatch[1]}'][@name='${roleMatch[2]}']`;
        }

        // Handle getByText
        const textMatch = line.match(/getByText\('(.*?)'\)/);
        if (textMatch) {
          locator = `//[Text='${textMatch[1]}']`;
        }

        // Handle locator
        const locatorMatch = line.match(/locator\('(.*?)'\)/);
        if (locatorMatch) {
          locator = locatorMatch[1];
        }

        // Handle getByLabel
        const labelMatch = line.match(/getByLabel\('(.*?)'\)/);
        if (labelMatch) {
          locator = `//[Label='${labelMatch[1]}']`;
        }

        if (line.includes('fill')) {
          action = 'fill';
          value = line.match(/fill\('(.*?)'\)/)[1];
        } else if (line.includes('selectOption')) {
          action = 'selectOption';
          value = line.match(/selectOption\('(.*?)'\)/)[1];
        } else if (line.includes('click')) {
          action = 'click';
        }

        locator = locator.replace(/['"`]/g, '').trim();
        const lastAction = currentScreen.actions[currentScreen.actions.length - 1];
        if (lastAction?.action === 'click' && lastAction?.locator === locator) {
          currentScreen.actions.pop();
        }

        currentScreen.actions.push({
          action,
          locator,
          value: '' // value.trim()
        });
      }
    }
  }

  if (currentScreen) {
    screens.push(currentScreen);
  }

  return screens;
}

module.exports = {
  parseSpecSteps,
};
