const amqp = require('amqplib');
const logger = require('../utils/logger'); 

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const EMAIL_QUEUE_NAME = 'emailQueue';

let connection = null;
let channel = null;

// Function to connect to RabbitMQ and create a channel
const connectRabbitMQ = async () => {
  try {
    if (connection && channel) {
      return { connection, channel };
    }

    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();

    // Assert the queue (create if it doesn't exist)
    await channel.assertQueue(EMAIL_QUEUE_NAME, { durable: true });

    logger.info('Connected to RabbitMQ and queue asserted:', EMAIL_QUEUE_NAME);

    // Handle connection errors
    connection.on('error', (err) => {
      logger.error('RabbitMQ connection error:', err);
      connection = null;
      channel = null;
    });

    // Handle connection close
    connection.on('close', () => {
      logger.warn('RabbitMQ connection closed');
      connection = null;
      channel = null;
    });

    return { connection, channel };
  } catch (error) {
    logger.error('Failed to connect to RabbitMQ:', error);
    throw error;
  }
};

// Function to add an email job to the queue
const addEmailToQueue = async (emailData) => {
  try {
    const { channel } = await connectRabbitMQ();

    // Convert email data to a buffer
    const message = Buffer.from(JSON.stringify(emailData));

    // Send the message to the queue
    const sent = channel.sendToQueue(EMAIL_QUEUE_NAME, message, { persistent: true });

    if (sent) {
      logger.info('Email job added to queue:', emailData);
    } else {
      logger.warn('Failed to add email job to queue:', emailData);
    }

    return sent;
  } catch (error) {
    logger.error('Error adding email job to queue:', error);
    throw error;
  }
};

// Function to close the RabbitMQ connection (for cleanup)
const closeRabbitMQ = async () => {
  try {
    if (channel) {
      await channel.close();
    }
    if (connection) {
      await connection.close();
    }
    logger.info('RabbitMQ connection closed');
  } catch (error) {
    logger.error('Error closing RabbitMQ connection:', error);
  }
};

// Export the functions for use in other parts of the application
module.exports = {
  addEmailToQueue,
  closeRabbitMQ,
};