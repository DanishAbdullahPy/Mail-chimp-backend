const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

const prisma = new PrismaClient();
const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key';

// Rate limiter middleware to prevent brute-force attacks
// Limits each IP to 5 requests per minute
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 5, // Max 5 requests
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Input validation for signup
// Ensures all required fields are present and meet specific criteria
const validateSignUp = [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phoneNumber').isMobilePhone('any').withMessage('Valid phone number is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .withMessage('Password must include uppercase, lowercase, number, and special character'),
  body('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('Role must be either "user" or "admin"'),
];

// Input validation for login
// Allows login via email or phone number, ensures password is provided
const validateLogin = [
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('phoneNumber')
    .optional()
    .isMobilePhone('any')
    .withMessage('Valid phone number is required'),
  body('password').notEmpty().withMessage('Password is required'),
  // Custom validation to ensure at least email or phoneNumber is provided
  (req, res, next) => {
    const { email, phoneNumber } = req.body;
    if (!email && !phoneNumber) {
      return res.status(400).json({ errors: [{ msg: 'Email or phone number is required' }] });
    }
    next();
  },
];

// Sign Up Logic
// Handles user registration with validation, password hashing, and JWT generation
const signUp = [
  limiter, // Apply rate limiting to prevent abuse
  validateSignUp, // Apply input validation
  async (req, res, next) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Extract user data from request body
      const { username, email, phoneNumber, password, role = 'user' } = req.body;

      // Check if user already exists by email or phone number
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ email }, { phoneNumber }],
        },
      });

      if (existingUser) {
        return res.status(400).json({ message: 'User with this email or phone number already exists' });
      }

      // Hash the password for security
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create the new user in the database
      const user = await prisma.user.create({
        data: {
          username,
          email,
          phoneNumber,
          password: hashedPassword,
          role, // Assign role (defaults to 'user')
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Generate a JWT token with user ID, email, and role
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role }, // Include role in JWT payload
        SECRET_KEY,
        { expiresIn: '15m', algorithm: 'HS256' }
      );

      // Set the JWT token as an HTTP-only cookie for security
      res.cookie('jwt', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      // Respond with success message and token
      res.status(201).json({ message: 'User created successfully', token });
    } catch (err) {
      // Pass any errors to the error-handling middleware
      next(err);
    }
  },
];

// Login Logic
// Handles user login via email or phone number, validates credentials, and issues a JWT
const login = [
  limiter, // Apply rate limiting to prevent brute-force attacks
  validateLogin, // Apply input validation
  async (req, res, next) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Extract login credentials from request body
      const { email, phoneNumber, password } = req.body;
      let user;

      // Find user by email or phone number
      if (email) {
        user = await prisma.user.findUnique({ where: { email } });
      } else if (phoneNumber) {
        user = await prisma.user.findUnique({ where: { phoneNumber } });
      }

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Compare provided password with hashed password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Generate a JWT token with user ID, email, and role
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role }, // Include role in JWT payload
        SECRET_KEY,
        { expiresIn: '15m', algorithm: 'HS256' }
      );

      // Set the JWT token as an HTTP-only cookie
      res.cookie('jwt', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      // Respond with success message and token
      res.status(200).json({ message: 'Login successful', token });
    } catch (err) {
      // Pass any errors to the error-handling middleware
      next(err);
    }
  },
];

// Logout Logic
// Clears the JWT cookie to log the user out
const logout = (req, res) => {
  // Set the JWT cookie to an empty value with an expired date
  res.cookie('jwt', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: new Date(0), // Expire immediately
  });

  // Respond with success message
  res.status(200).json({ message: 'Logged out successfully' });
};

// Export the controller functions for use in routes
module.exports = { signUp, login, logout };