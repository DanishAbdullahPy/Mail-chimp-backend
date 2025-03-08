const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Template = sequelize.define('Template', {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  html_content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  thumbnail_url: DataTypes.STRING,
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  indexes: [
    { fields: ['name'] }
  ]
});

module.exports = Template;