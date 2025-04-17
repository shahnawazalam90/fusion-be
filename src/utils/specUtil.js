const fs = require('fs');

function parseSpecSteps(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const stepRegex = /await\s+page\.(getBy\w+|locator)\((.*?)\)\.(\w+)\((.*?)\)|await\s+expect\(page\.(getByRole|getByLabel|getByText|locator)\((.*?)\)\)\.(\w+)\((.*?)\)/g;

  const steps = [];
  let match;

  while ((match = stepRegex.exec(fileContent)) !== null) {
    if (match[1]) {
      // Playwright action steps
      const [, locatorType, locatorParams, action, actionValue] = match;
      let parsedParams = [];
      try {
        parsedParams = eval(`[${locatorParams}]`); // Parse the locator params
      } catch (error) {
        console.error(`Failed to parse locatorParams: ${locatorParams}`, error);
      }

      steps.push({
        action,
        locatorType,
        params: parsedParams,
        value: actionValue.trim().replace(/'/g, "") || "",
      });
    } else if (match[5]) {
      // `expect` assertion steps
      const [, , , , ,locatorType, locatorParams, assertionType, assertionValue] = match;
      let parsedParams = [];
      try {
        parsedParams = eval(`[${locatorParams}]`); // Parse the locator params
      } catch (error) {
        console.error(`Failed to parse locatorParams: ${locatorParams}`, error);
      }

      steps.push({
        action: "expect",
        locatorType,
        params: parsedParams,
        value: assertionValue.trim().replace(/'/g, "") || "",
        assertionType: assertionType.trim(),
      });
    }
  }

  return steps;
}

module.exports = {
  parseSpecSteps,
};
