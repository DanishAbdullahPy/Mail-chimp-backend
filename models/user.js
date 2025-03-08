const { DataTypes } = require('sequelize');
const sequelize = require('../check-db'); // Correct import

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  username: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true, // Validates email format
    },
  },
  phoneNumber: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    validate: {
      // Basic phone number validation (e.g., + followed by digits)
      is: /^\+?[1-9]\d{1,14}$/, // Matches international format (e.g., +1234567890)
    },
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt
  indexes: [
    {
      unique: true,
      fields: ['email'], // Index for login performance
    },
    {
      unique: true,
      fields: ['phoneNumber'], // Index for phone-based lookups
    },
    {
      unique: true,
      fields: ['username'], // Index for username uniqueness
    },
  ],
});

module.exports = User;