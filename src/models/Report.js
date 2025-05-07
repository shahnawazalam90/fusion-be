const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Report = sequelize.define('Report', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    scenarioIds: {
      type: DataTypes.ARRAY(DataTypes.UUID),
      allowNull: false,
    },
    filePath: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    scenarioFile: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Path to the JSON file containing all scenarios metadata',
    },
    status: {
      type: DataTypes.ENUM('pending', 'running', 'completed'),
      allowNull: false,
      defaultValue: 'pending',
    },
    executedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  });

  return Report;
};
