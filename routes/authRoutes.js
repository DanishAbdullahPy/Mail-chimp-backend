const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { signUp, login } = require('../controllers/authController');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

// Rate limiter (5 requests per minute per IP)
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Google OAuth login
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

// Google OAuth callback
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/api/auth/login', session: false }),
  (req, res) => {
    try {
      if (!req.user || !req.user.id || !req.user.email) {
        return res.status(401).json({ message: 'Authentication failed: Invalid user data' });
      }

      if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not defined in environment variables');
      }

      const token = jwt.sign(
        { id: req.user.id, email: req.user.email },
        process.env.JWT_SECRET,
        { expiresIn: '15m', algorithm: 'HS256' }
      );

      res.cookie('jwt', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000,
      });

      res.status(200).json({ message: 'Google login successful', token });
    } catch (err) {
      console.error('Google OAuth callback error:', err);
      res.status(500).json({ message: 'Google login failed' });
    }
  }
);

// Sign-up route with middleware array
router.post('/signup', ...signUp);

// Login route with middleware array
router.post('/login', ...login);

module.exports = router;