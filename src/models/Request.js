const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Request = sequelize.define('Request', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    method: {
      type: DataTypes.ENUM('get', 'post', 'put', 'delete'),
      allowNull: false,
    },
    url: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    headers: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const raw = this.getDataValue('headers');
        return raw ? JSON.parse(raw) : {};
      },
      set(val) {
        this.setDataValue('headers', JSON.stringify(val || {}));
      }
    },
    type: {
      type: DataTypes.ENUM('polling', 'stateless'),
      allowNull: false,
    },
    pollingOptions: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const raw = this.getDataValue('pollingOptions');
        return raw ? JSON.parse(raw) : {};
      },
      set(val) {
        this.setDataValue('pollingOptions', JSON.stringify(val || {}));
      }
    },
    expectedStatus: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    expectedResponse: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const raw = this.getDataValue('expectedResponse');
        return raw ? JSON.parse(raw) : {};
      },
      set(val) {
        this.setDataValue('expectedResponse', JSON.stringify(val || {}));
      }
    },
    payload: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const raw = this.getDataValue('payload');
        return raw ? JSON.parse(raw) : {};
      },
      set(val) {
        this.setDataValue('payload', JSON.stringify(val || {}));
      }
    }
  });

  return Request;
};
