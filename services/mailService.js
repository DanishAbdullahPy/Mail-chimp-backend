const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// Configure Nodemailer transporter using environment variables
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false, // Use TLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Function to send an email
const sendEmail = async ({ recipient, subject, body }) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: recipient,
      subject: subject,
      html: body,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent successfully to ${recipient}: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error(`Failed to send email to ${recipient}:`, error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

module.exports = {
  sendEmail,
};