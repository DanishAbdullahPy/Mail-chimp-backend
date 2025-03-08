const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { Op } = require('sequelize');
// Sign Up Logic
const signUp = async (req, res, next) => {
  const { username, email, phoneNumber, password } = req.body;

  try {
    // Check if the user already exists
    const existingUser = await User.findOne({
      where: { [Op.or]: [{ email }, { phoneNumber }] }
    });

    if (existingUser) {
      return res.status(400).json({ message: 'User with this email or phone number already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the new user
    const user = await User.create({
      username,
      email,
      phoneNumber,
      password: hashedPassword,
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username, phoneNumber: user.phoneNumber },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(201).json({ message: 'User created successfully', token });

  } catch (err) {
    next(err);
  }
};

// Login Logic
const login = async (req, res, next) => {
  const { email, phoneNumber, password } = req.body;

  try {
    let user;

    if (email) {
      user = await User.findOne({ where: { email } });
    } else if (phoneNumber) {
      user = await User.findOne({ where: { phoneNumber } });
    }

    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username, phoneNumber: user.phoneNumber },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({ message: 'Login successful', token });

  } catch (err) {
    next(err);
  }
};

module.exports = { signUp, login };
