// src/utils/testToJson.js

function parseAction(step) {
  // Remove 'await page.' and trailing semicolon
  let raw = step.replace(/^await page\./, '').replace(/;$/, '').trim();

  // Extract action and value directly from the raw string
  let action = null;
  let value = null;

  if (raw.includes('.fill(')) {
    action = 'fill';
    const fillMatch = raw.match(/\.fill\('([^']*)'\)/);
    if (fillMatch) {
      value = fillMatch[1];
    }
  } else if (raw.includes('.selectOption(')) {
    action = 'selectOption';
    const selectMatch = raw.match(/\.selectOption\('([^']*)'\)/);
    if (selectMatch) {
      value = selectMatch[1];
    }
  } else if (raw.includes('.press(')) {
    action = 'press';
    const pressMatch = raw.match(/\.press\('([^']*)'\)/);
    if (pressMatch) {
      value = pressMatch[1];
    }
  } else if (raw.includes('.click(')) {
    action = 'click';
  }

  // Extract method, selector and options
  let method = null;
  let selector = null;
  let options = null;

  if (raw.includes('getByRole')) {
    method = 'getByRole';
    const roleMatch = raw.match(/getByRole\('([^']+)'(?:,\s*({[^}]+}))?\)/);
    if (roleMatch) {
      selector = roleMatch[1];
      if (roleMatch[2]) {
        try {
          // Convert single quotes to double for JSON parsing
          options = JSON.parse(roleMatch[2].replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":').replace(/'/g, '"'));
        } catch (e) {
          options = roleMatch[2];
        }
      }
    }
  } else if (raw.includes('getByLabel')) {
    method = 'getByLabel';
    const labelMatch = raw.match(/getByLabel\('([^']+)'\)/);
    if (labelMatch) {
      selector = labelMatch[1];
    }
  } else if (raw.includes('getByText')) {
    method = 'getByText';
    const textMatch = raw.match(/getByText\('([^']+)'/);
    if (textMatch) {
      selector = textMatch[1];
    }
  } else if (raw.includes('getByTitle')) {
    method = 'getByTitle';
    const titleMatch = raw.match(/getByTitle\('([^']+)'\)/);
    if (titleMatch) {
      selector = titleMatch[1];
    }
  }

  return {
    method,
    selector,
    options,
    action,
    parsedValue: value,
    value: '',
    raw
  };
}

function convertPlaywrightToJson(scenario, steps) {
  let url = "";
  let screens = [];
  let currentScreen = null;

  steps.forEach(step => {
    // Detect screen name from comment
    const screenCommentMatch = step.match(/^\/\/\s*(.+)$/);
    if (screenCommentMatch) {
      // Start a new screen section
      currentScreen = {
        screenName: screenCommentMatch[1].trim(),
        actions: []
      };
      screens.push(currentScreen);
      return;
    }

    // Handle 'expect' step without processing it
    if (step.startsWith('await expect(')) {
      if (currentScreen) {
        currentScreen.actions.push({ raw: step.replace(/^await /, '').replace(/;$/, '').trim() });
        return;
      }
    }

    // Handle .goto for url (only first one)
    if (step.includes('.goto(')) {
      const urlMatch = step.match(/goto\('([^']+)'\)/);
      if (urlMatch && !url) {
        url = urlMatch[1];
      }
      return;
    }

    // Ignore click or press on textbox unless it's a fill
    if (
      (step.includes('.click(') || step.includes('.press(')) &&
      step.includes('getByRole') &&
      step.match(/getByRole\(\s*'textbox'/) &&
      !step.includes('.fill(')
    ) {
      return;
    }

    // Only process lines with getByRole, getByLabel, getByText, getByTitle
    if (
      step.includes('getByRole') ||
      step.includes('getByLabel') ||
      step.includes('getByText') ||
      step.includes('getByTitle')
    ) {
      if (currentScreen) {
        const parsed = parseAction(step);
        const lastAction = currentScreen?.actions[currentScreen.actions.length - 1];

        if (parsed) {
          if (
            lastAction &&
            parsed?.options?.name === lastAction.options?.name &&
            lastAction.action === 'click'
          ) {
            currentScreen?.actions.pop();
          }

          currentScreen.actions.push(parsed);
        }
      }
    }
  });

  return {
    scenario,
    url,
    screens
  };
}

// Example usage:
function convertTestFileToJson(testContent, scenario = "create purchase requisition") {
  // Extract steps and comments from the test content
  const steps = testContent
    .split('\n')
    .map(line => line.trim())
    .filter(line =>
      line.startsWith('await page.') ||
      line.startsWith('await expect') ||
      line.startsWith('//')
    );

  return convertPlaywrightToJson(scenario, steps);
}

module.exports = {
  convertPlaywrightToJson,
  convertTestFileToJson
};