// src/utils/testToJson.js

function parseAction(step) {
  // Remove 'await page.' and trailing semicolon
  let raw = step.replace(/^await page\./, '').replace(/;$/, '').trim();

  // Match the main method and its arguments
  const methodMatch = raw.match(/^([a-zA-Z0-9_.]+)\((.*)\)(?:\.(\w+)\((.*)\))?/);
  if (!methodMatch) return null;

  const [_, methodCall, methodArgs, action, actionArgs] = methodMatch;

  // Parse method and selector
  let method = methodCall;
  let selector = null;
  let options = null;

  // Try to extract selector and options
  const argsMatch = methodArgs.match(/^'([^']+)'(?:,\s*(\{.*\}))?/);
  if (argsMatch) {
    selector = argsMatch[1];
    if (argsMatch[2]) {
      try {
        // Convert single quotes to double for JSON parsing
        options = JSON.parse(argsMatch[2].replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":').replace(/'/g, '"'));
      } catch (e) {
        options = argsMatch[2];
      }
    }
  }

  // Parse action and value
  let value = null;
  if (action && actionArgs) {
    // Remove surrounding quotes if present
    value = actionArgs.replace(/^'(.*)'$/, '$1');
  }

  return {
    method,
    selector,
    options,
    action,
    value,
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
      step.match(/getByRole\(\s*'textbox'/)
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
        if (parsed) currentScreen.actions.push(parsed);
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
      line.startsWith('//')
    );

  return convertPlaywrightToJson(scenario, steps);
}

module.exports = {
  convertPlaywrightToJson,
  convertTestFileToJson
};