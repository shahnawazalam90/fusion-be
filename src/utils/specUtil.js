const fs = require('fs');

function parseSpecSteps(filePath) {
  // Read the file content
  const fileContent = fs.readFileSync(filePath, 'utf-8');

  // Escape the file content
  const escapedContent = fileContent.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

  // Regex patterns
  const screenRegex = /\/\/\s*(.*?)\s*screen/g;
  const urlRegex = /await\s+page\.goto\(['"]([^'"]+)['"]\)/;
  const actionRegex = /await\s+page\.getByRole\(([^)]+)\)\.(\w+)\(([^)]*)\)/g;

  let match;
  const steps = [];
  let currentScreen = null;

  // Parse the file content
  while ((match = screenRegex.exec(fileContent)) !== null) {
    if (currentScreen) steps.push(currentScreen);
    currentScreen = {
      screenName: match[1],
      scenario: "happy path",
      url: "",
      actions: []
    };
  }
  if (currentScreen) steps.push(currentScreen);

  // Extract URLs and actions
  steps.forEach(screen => {
    const screenStartIndex = fileContent.indexOf(`// ${screen.screenName} screen`);
    const screenEndIndex = steps.indexOf(screen) < steps.length - 1
      ? fileContent.indexOf(`// ${steps[steps.indexOf(screen) + 1].screenName} screen`)
      : fileContent.length;

    const screenContent = fileContent.slice(screenStartIndex, screenEndIndex);

    // Extract URL
    const urlMatch = urlRegex.exec(screenContent);
    if (urlMatch) screen.url = urlMatch[1];

    // Extract actions
    let actionMatch;
    while ((actionMatch = actionRegex.exec(screenContent)) !== null) {
      const [_, role, action, params] = actionMatch;
      if (action === 'click' || action === 'fill') {
        const locatorMatch = /{[^}]*name:\s*['"]([^'"]+)['"]/g.exec(role);
        const locator = locatorMatch ? `//${role.split(',')[0].trim()}[@name='${locatorMatch[1]}']` : '';
        const value = action === 'fill' ? params.replace(/['"]/g, '') : '';
        screen.actions.push({ action, locator, value });
      }
    }
  });

  return steps;
}

module.exports = {
  parseSpecSteps,
};
