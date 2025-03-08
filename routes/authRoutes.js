const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { signUp, login } = require('../controllers/authController');
const router = express.Router();

// Google OAuth login
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
// Google OAuth callback
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    try {
      // Ensure req.user exists
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication failed: No user found' });
      }

      // Ensure JWT_SECRET is defined
      if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not defined in environment variables');
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: req.user.id, email: req.user.email, username: req.user.username, phoneNumber: req.user.phoneNumber },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Send success response
      res.status(200).json({ message: 'Google login successful', token });
    } catch (err) {
      console.error('Google OAuth callback error:', err);
      res.status(500).json({ message: 'Google login failed', error: err.message });
    }
  }
);

// Sign-up route
router.post('/signup', signUp);

// Login route
router.post('/login', login);

module.exports = router;