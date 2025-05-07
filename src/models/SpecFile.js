const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SpecFile = sequelize.define('SpecFile', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    originalName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    uploadPath: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    url: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    parsedJson: {
      type: DataTypes.JSONB, // PostgreSQL JSONB type for better performance with JSON data
      allowNull: false,
    },
    uploadedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  });

  return SpecFile;
};