const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Scenario = sequelize.define('Scenario', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    jsonMetaData: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    dataExcel: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    dataManual: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    url: {
      type: DataTypes.STRING,
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

  return Scenario;
};
