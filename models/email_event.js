const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EmailEvent = sequelize.define('EmailEvent', {
  campaign_id: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Campaigns',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  subscriber_id: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Subscribers',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  event_type: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['open', 'click', 'bounce', 'unsubscribe']]
    }
  },
  event_data: DataTypes.JSONB,
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  indexes: [
    { fields: ['campaign_id'] },
    { fields: ['subscriber_id'] },
    { fields: ['event_type'] },
    { fields: ['created_at'] }
  ]
});

module.exports = EmailEvent;