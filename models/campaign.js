const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Campaign = sequelize.define('Campaign', {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  subject: DataTypes.STRING,
  body: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  template_id: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Templates',
      key: 'id'
    },
    onDelete: 'SET NULL'
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'draft',
    validate: {
      isIn: [['draft', 'scheduled', 'sent', 'cancelled']]
    }
  },
  scheduled_at: DataTypes.DATE,
  sent_at: DataTypes.DATE,
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
    { fields: ['status'] },
    { fields: ['scheduled_at'] }
  ]
});

module.exports = Campaign;