const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CampaignSubscriber = sequelize.define('CampaignSubscriber', {
  campaign_id: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Campaigns',
      key: 'id'
    },
    primaryKey: true
  },
  subscriber_id: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Subscribers',
      key: 'id'
    },
    primaryKey: true
  },
  sent_at: DataTypes.DATE
}, {
  timestamps: false,
  indexes: [
    { fields: ['sent_at'] }
  ]
});

module.exports = CampaignSubscriber;