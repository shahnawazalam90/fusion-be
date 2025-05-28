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
    requestId: {
      type: DataTypes.UUID, // Foreign key to Request.id
      allowNull: true,
      defaultValue: null,
      // This field should reference the id of the Request model
      // (add association in model setup if needed)
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

  // Optionally, add association if models are associated elsewhere:
  // Scenario.associate = (models) => {
  //   Scenario.belongsTo(models.Request, { foreignKey: 'requestId', targetKey: 'id' });
  // };

  return Scenario;
};
