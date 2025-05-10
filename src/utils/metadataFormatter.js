/**
 * Formats a single action's raw data by converting JavaScript object notation to JSON format
 * @param {Object} action - The action object containing raw data
 * @returns {Object} - The formatted action object
 */
const formatAction = (action) => {
  const objectPattern = /(\{[^}]+\})/g;
  if (objectPattern.test(action.raw)) {
    action.raw = action.raw.replace(objectPattern, (match) => {
      // Replace properties like name: 'value' with "name": "value"
      return match
        .replace(/(\w+):/g, '"$1":')  // Add quotes to keys
        .replace(/'([^']+)'/g, '"$1"'); // Replace single quotes with double quotes
    });
  }
  return action;
};

/**
 * Formats a single screen's actions
 * @param {Object} screen - The screen object containing actions
 * @returns {Object} - The formatted screen object
 */
const formatScreen = (screen) => {
  let newScreen = {...screen};
  newScreen['actions'] = screen.actions.map(formatAction);
  return newScreen;
};

/**
 * Parses and formats scenario metadata
 * @param {string} jsonMetaData - The raw JSON metadata string
 * @returns {Object|string} - The formatted metadata object or original string if parsing fails
 */
const formatScenarioMetadata = (jsonMetaData) => {
  try {
    const metadata = JSON.parse(jsonMetaData);
    return metadata.map(formatScreen);
  } catch (e) {
    // If it's not valid JSON, return as is
    return jsonMetaData;
  }
};

/**
 * Formats a complete scenario object with its metadata
 * @param {Object} scenario - The scenario object from the database
 * @returns {Object} - The formatted scenario object
 */
const formatScenario = (scenario) => {
  return {
    id: scenario.id,
    name: scenario.name,
    url: scenario.url,
    metadata: formatScenarioMetadata(scenario.jsonMetaData),
    createdAt: scenario.createdAt,
    updatedAt: scenario.updatedAt
  };
};

/**
 * Formats multiple scenarios with their metadata
 * @param {Array} scenarios - Array of scenario objects
 * @returns {Array} - Array of formatted scenario objects
 */
const formatScenarios = (scenarios) => {
  return scenarios.map(formatScenario);
};

module.exports = {
  formatAction,
  formatScreen,
  formatScenarioMetadata,
  formatScenario,
  formatScenarios
}; 