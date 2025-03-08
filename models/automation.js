const { DataTypes } = require('sequelize');
const sequelize = require('../check-db');

const Automation = sequelize.define('Automation', {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  trigger_event: {
    type: DataTypes.STRING,
    allowNull: false
  },
  workflow: DataTypes.JSONB,
  status: {
    type: DataTypes.STRING,
    defaultValue: 'active',
    validate: {
      isIn: [['active', 'paused', 'stopped']]
    }
  },
  user_id: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
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
    { fields: ['user_id'] },
    { fields: ['status'] }
  ]
});

module.exports = Automation;