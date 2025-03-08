const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Subscriber = sequelize.define('Subscriber', {
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  name: DataTypes.STRING,
  phone: DataTypes.STRING,
  status: {
    type: DataTypes.STRING,
    defaultValue: 'subscribed',
    validate: {
      isIn: [['subscribed', 'unsubscribed', 'bounced']]
    }
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  user_id: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Users',
      key: 'id'
    },
    onDelete: 'SET NULL'
  },
  metadata: DataTypes.JSONB
}, {
  indexes: [
    { fields: ['email'] },
    { fields: ['status'] },
    { fields: ['user_id'] }
  ]
});

module.exports = Subscriber;