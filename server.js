const express = require('express');
const session = require('express-session');
const passport = require('passport');
const dotenv = require('dotenv');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const errorMiddleware = require('./middleware/errorMiddleware');
const { sequelize } = require('./config/database');
const passportConfig = require('./config/passport'); 

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Middleware
app.use(cors()); // Enable CORS for cross-origin requests
app.use(express.json()); // Parse JSON bodies

// Session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'default-secret', // Fallback secret if not in .env
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production' }, // Secure cookie in production with HTTPS
  })
);

// Initialize Passport and session support
app.use(passport.initialize());
app.use(passport.session());

// Load passport strategies (must be called after passport.initialize())
passportConfig; // Executes the passport configuration, including the Google strategy

// Define Routes
app.use('/api/auth', authRoutes);

// Error handling middleware
app.use(errorMiddleware);

// Sync Sequelize and start the server
sequelize.sync({ alter: true }) // Use { alter: true } to modify tables if needed, avoid data loss in production
  .then(() => {
    app.listen(process.env.PORT || 5000, () => {
      console.log(`Server running on port ${process.env.PORT || 5000}`);
    });
  })
  .catch((err) => {
    console.error('Unable to connect to the database:', err);
  });