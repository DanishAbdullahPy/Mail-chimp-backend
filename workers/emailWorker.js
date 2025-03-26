// Import required dependencies
const amqp = require('amqplib');
const nodemailer = require('nodemailer');
const { PrismaClient } = require('@prisma/client');
const winston = require('winston');

// Initialize Prisma client for database operations
const prisma = new PrismaClient();

// Set up Winston logger for structured logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/emailWorker.log' }),
    new winston.transports.Console(),
  ],
});

// Configure Nodemailer to use Postfix (self-hosted SMTP server)
const transporter = nodemailer.createTransport({
  host: 'localhost',
  port: 25,
  secure: false, // No TLS since Postfix is local
  tls: {
    rejectUnauthorized: false, // Ignore self-signed certificates if any
  },
});

// Queue names and retry settings
const QUEUE_NAME = 'emailQueue';
const DLQ_NAME = 'emailQueue.dlq';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second base delay for exponential backoff

// Main function to start the email worker
async function startWorker() {
  try {
    // Connect to RabbitMQ
    const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
    const channel = await connection.createChannel();

    // Assert the main queue and Dead Letter Queue
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    await channel.assertQueue(DLQ_NAME, { durable: true });

    // Process one message at a time to avoid overloading Postfix
    channel.prefetch(1);

    logger.info('Email worker started, waiting for messages...');

    // Consume messages from the emailQueue
    channel.consume(QUEUE_NAME, async (msg) => {
      if (msg === null) {
        logger.warn('Received null message, possibly due to consumer cancellation');
        return;
      }

      let retries = 0;
      const messageContent = JSON.parse(msg.content.toString());
      const { to, subject, body, campaignId, subscriberId } = messageContent;

      logger.info('Processing email message', { to, campaignId, subscriberId });

      // Retry loop for sending email
      while (retries < MAX_RETRIES) {
        try {
          // Send the email via Postfix
          await transporter.sendMail({
            from: 'no-reply@yourdomain.com', // Replace with your sender email
            to,
            subject,
            html: body,
          });

          // Update CampaignSubscriber with sent_at timestamp
          await prisma.campaignSubscriber.update({
            where: {
              campaignId_subscriberId: {
                campaignId: parseInt(campaignId),
                subscriberId: parseInt(subscriberId),
              },
            },
            data: {
              sent_at: new Date(),
            },
          });

          // Log the sent event in EmailEvent table
          await prisma.emailEvent.create({
            data: {
              campaignId: parseInt(campaignId),
              subscriberId: parseInt(subscriberId),
              event_type: 'sent',
              event_data: { to, subject },
              created_at: new Date(),
            },
          });

          logger.info('Email sent successfully', { to, campaignId, subscriberId });
          channel.ack(msg); // Acknowledge the message
          return; // Exit the retry loop
        } catch (error) {
          retries++;
          if (retries === MAX_RETRIES) {
            // Log the failure and move to DLQ
            logger.error('Failed to send email after max retries', {
              to,
              campaignId,
              subscriberId,
              error: error.message,
              retries,
            });

            // Log the error event in EmailEvent table
            await prisma.emailEvent.create({
              data: {
                campaignId: parseInt(campaignId),
                subscriberId: parseInt(subscriberId),
                event_type: 'error',
                event_data: { to, subject, error: error.message },
                created_at: new Date(),
              },
            });

            // Move the message to the Dead Letter Queue
            channel.sendToQueue(DLQ_NAME, msg.content, { persistent: true });
            channel.ack(msg); // Acknowledge the message to remove it from the main queue
            return;
          }

          // Wait before retrying (exponential backoff)
          const delay = RETRY_DELAY * Math.pow(2, retries);
          logger.warn('Failed to send email, retrying...', {
            to,
            campaignId,
            subscriberId,
            retry: retries,
            delay,
            error: error.message,
          });
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }, { noAck: false }); // Manual acknowledgment
  } catch (error) {
    logger.error('Email worker failed to start', { error: error.message });
    process.exit(1);
  }
}

// Start the worker
startWorker();

// Handle graceful shutdown on process termination
process.on('SIGINT', async () => {
  logger.info('Shutting down email worker...');
  await prisma.$disconnect();
  process.exit(0);
});