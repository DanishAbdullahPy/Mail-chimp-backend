require('dotenv').config();

module.exports = {
  development: {
    url: process.env.DB_URI,
    dialect: 'postgres',
    logging: (msg) => console.log(msg), // Explicitly log all messages
  },
  test: {
    url: process.env.DB_URI,
    dialect: 'postgres',
    logging: false,
  },
  production: {
    url: process.env.DB_URI,
    dialect: 'postgres',
    logging: false,
  },
};