const { PrismaClient } = require('@prisma/client');
const { body, param, query, validationResult } = require('express-validator');
const winston = require('winston');
const amqp = require('amqplib');
const prisma = new PrismaClient();

// Test Prisma connection
(async () => {
  try {
    await prisma.$connect();
    console.log('Prisma connected successfully');
    const campaigns = await prisma.campaign.findMany();
    console.log('Campaigns:', campaigns);
  } catch (error) {
    console.error('Prisma connection failed:', error);
  }
})();

// Structured logging with winston
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/campaign.log' }),
    new winston.transports.Console(),
  ],
});

// Validation middleware for createCampaign
const validateCreateCampaign = [
  body('name').notEmpty().withMessage('Campaign name is required'),
  body('body').notEmpty().withMessage('Campaign body is required'),
  body('subject').optional().trim(),
  body('template_id').optional().isInt().withMessage('Template ID must be an integer'),
  body('scheduled_at').optional().isISO8601().toDate().withMessage('Scheduled date must be a valid ISO 8601 date'),
];

// Validation middleware for getCampaigns
const validateGetCampaigns = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['draft', 'scheduled', 'sent', 'cancelled']).withMessage('Invalid status'),
  query('search').optional().trim(),
];

// Validation middleware for updateCampaign
const validateUpdateCampaign = [
  param('id').isInt().withMessage('Campaign ID must be an integer'),
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('body').optional().trim().notEmpty().withMessage('Body cannot be empty'),
  body('subject').optional().trim(),
  body('template_id').optional().isInt().withMessage('Template ID must be an integer'),
  body('scheduled_at').optional().isISO8601().toDate().withMessage('Scheduled date must be a valid ISO 8601 date'),
  body('status').optional().isIn(['draft', 'scheduled', 'sent', 'cancelled']).withMessage('Invalid status'),
];

// Validation middleware for markCampaignAsSent and deleteCampaign
const validateCampaignId = [
  param('id').isInt().withMessage('Campaign ID must be an integer'),
];

// Valid state transitions for campaigns
const validTransitions = {
  draft: ['scheduled', 'cancelled'],
  scheduled: ['sent', 'cancelled'],
  sent: [],
  cancelled: [],
};

// Helper function to log campaign actions
const logCampaignAction = async (campaignId, userId, action, details) => {
  await prisma.campaignAudit.create({
    data: {
      campaignId,
      userId,
      action,
      details,
      createdAt: new Date(),
    },
  });
};

exports.createCampaign = [
  validateCreateCampaign,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Create campaign validation failed', { errors: errors.array(), ip: req.ip });
        return res.status(400).json({ errors: errors.array() });
      }

      if (!req.user || !req.user.id) {
        logger.error('User not authenticated', { ip: req.ip });
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { name, body, subject, template_id, scheduled_at } = req.body;
      const userId = req.user.id;

      if (template_id) {
        const template = await prisma.template.findUnique({ where: { id: parseInt(template_id) } });
        if (!template) {
          logger.warn('Template not found', { template_id, userId, ip: req.ip });
          return res.status(404).json({ error: 'Template not found' });
        }
      }

      logger.info('Attempting to create campaign', { userId, ip: req.ip });

      const campaign = await prisma.campaign.create({
        data: {
          name,
          body,
          subject: subject || null,
          template_id: template_id ? parseInt(template_id) : null,
          status: 'draft',
          scheduled_at: scheduled_at ? new Date(scheduled_at) : null,
          user_id: userId,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      await logCampaignAction(campaign.id, userId, 'create', { name, body });

      logger.info('Campaign created successfully', { campaignId: campaign.id, userId, ip: req.ip });
      res.status(201).json(campaign);
    } catch (error) {
      logger.error('Failed to create campaign', { error: error.message, userId: req.user?.id, ip: req.ip });
      res.status(400).json({ error: 'Failed to create campaign', details: error.message });
    }
  },
];

// Test route for creating a campaign (added to fix the undefined issue)
exports.testCreateCampaign = async (req, res) => {
  try {
    const campaign = await prisma.campaign.create({
      data: {
        name: 'Test Campaign Direct',
        body: '<h1>Test</h1>',
        subject: 'Test Subject',
        status: 'draft',
        user_id: 7, // Hardcode user_id for now since this route bypasses auth
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    logger.info('Test campaign created successfully', { campaignId: campaign.id, ip: req.ip });
    res.status(201).json(campaign);
  } catch (error) {
    logger.error('Failed to create test campaign', { error: error.message, ip: req.ip });
    res.status(400).json({ error: 'Failed to create test campaign', details: error.message });
  }
};

// Retrieve campaigns with pagination, filtering, and searching
exports.getCampaigns = [
  validateGetCampaigns,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Get campaigns validation failed', { errors: errors.array(), ip: req.ip });
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      const status = req.query.status;
      const search = req.query.search;

      const where = { user_id: userId, deletedAt: null };
      if (status) where.status = status;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { subject: { contains: search, mode: 'insensitive' } },
        ];
      }

      const campaigns = await prisma.campaign.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: { template: true },
      });

      const total = await prisma.campaign.count({ where });
      const totalPages = Math.ceil(total / limit);

      logger.info('Campaigns fetched successfully', { userId, page, limit, ip: req.ip });
      res.status(200).json({
        data: campaigns,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          itemsPerPage: limit,
        },
      });
    } catch (error) {
      logger.error('Failed to fetch campaigns', { error: error.message, userId: req.user?.id, ip: req.ip });
      res.status(400).json({ error: 'Failed to fetch campaigns', details: error.message });
    }
  },
];

// Update an existing campaign
exports.updateCampaign = [
  validateUpdateCampaign,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Update campaign validation failed', { errors: errors.array(), ip: req.ip });
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { name, body, subject, template_id, scheduled_at, status } = req.body;
      const userId = req.user.id;

      const campaignExists = await prisma.campaign.findFirst({
        where: { id: parseInt(id), user_id: userId, deletedAt: null },
      });

      if (!campaignExists) {
        logger.warn('Campaign not found or unauthorized', { campaignId: id, userId, ip: req.ip });
        return res.status(404).json({ error: 'Campaign not found or you do not have permission to update it' });
      }

      if (status && status !== campaignExists.status) {
        if (!validTransitions[campaignExists.status].includes(status)) {
          logger.warn('Invalid status transition', { campaignId: id, from: campaignExists.status, to: status, userId, ip: req.ip });
          return res.status(400).json({ error: `Cannot transition from ${campaignExists.status} to ${status}` });
        }
      }

      if (template_id) {
        const template = await prisma.template.findUnique({ where: { id: parseInt(template_id) } });
        if (!template) {
          logger.warn('Template not found', { template_id, userId, ip: req.ip });
          return res.status(404).json({ error: 'Template not found' });
        }
      }

      const campaign = await prisma.campaign.update({
        where: { id: parseInt(id) },
        data: {
          name: name || campaignExists.name,
          body: body || campaignExists.body,
          subject: subject !== undefined ? subject : campaignExists.subject,
          template_id: template_id !== undefined ? (template_id ? parseInt(template_id) : null) : campaignExists.template_id,
          scheduled_at: scheduled_at !== undefined ? (scheduled_at ? new Date(scheduled_at) : null) : campaignExists.scheduled_at,
          status: status || campaignExists.status,
          updated_at: new Date(),
        },
      });

      await logCampaignAction(campaign.id, userId, 'update', { name, body, status });

      logger.info('Campaign updated successfully', { campaignId: campaign.id, userId, ip: req.ip });
      res.status(200).json(campaign);
    } catch (error) {
      logger.error('Failed to update campaign', { error: error.message, campaignId: req.params.id, userId: req.user?.id, ip: req.ip });
      res.status(400).json({ error: 'Failed to update campaign', details: error.message });
    }
  },
];

// Mark a campaign as sent and queue email sending
exports.markCampaignAsSent = [
  validateCampaignId,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Mark campaign as sent validation failed', { errors: errors.array(), ip: req.ip });
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const userId = req.user.id;

      const campaign = await prisma.campaign.findFirst({
        where: { id: parseInt(id), user_id: userId, deletedAt: null },
        include: { subscribers: { include: { subscriber: true } } },
      });

      if (!campaign) {
        logger.warn('Campaign not found or unauthorized', { campaignId: id, userId, ip: req.ip });
        return res.status(404).json({ error: 'Campaign not found or you do not have permission to update it' });
      }

      if (!['scheduled'].includes(campaign.status)) {
        logger.warn('Invalid status for sending', { campaignId: id, status: campaign.status, userId, ip: req.ip });
        return res.status(400).json({ error: `Cannot mark campaign as sent from status ${campaign.status}` });
      }

      const QUEUE_NAME = 'emailQueue';
      const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
      const channel = await connection.createChannel();
      await channel.assertQueue(QUEUE_NAME, { durable: true });

      for (const campaignSubscriber of campaign.subscribers) {
        const subscriber = campaignSubscriber.subscriber;
        const message = {
          to: subscriber.email,
          subject: campaign.subject || 'No Subject',
          body: campaign.body,
          campaignId: campaign.id,
          subscriberId: subscriber.id,
        };

        channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(message)), { persistent: true });
      }

      await connection.close();

      const updatedCampaign = await prisma.campaign.update({
        where: { id: parseInt(id) },
        data: {
          status: 'sent',
          sent_at: new Date(),
          updated_at: new Date(),
        },
      });

      await logCampaignAction(campaign.id, userId, 'markAsSent', { status: 'sent' });

      logger.info('Campaign marked as sent and emails queued', { campaignId: campaign.id, userId, ip: req.ip });
      res.status(200).json(updatedCampaign);
    } catch (error) {
      logger.error('Failed to mark campaign as sent', { error: error.message, campaignId: req.params.id, userId: req.user?.id, ip: req.ip });
      res.status(400).json({ error: 'Failed to mark campaign as sent', details: error.message });
    }
  },
];

// Soft delete a campaign
exports.deleteCampaign = [
  validateCampaignId,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Delete campaign validation failed', { errors: errors.array(), ip: req.ip });
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const userId = req.user.id;

      const campaign = await prisma.campaign.findFirst({
        where: { id: parseInt(id), user_id: userId, deletedAt: null },
      });

      if (!campaign) {
        logger.warn('Campaign not found or unauthorized', { campaignId: id, userId, ip: req.ip });
        return res.status(404).json({ error: 'Campaign not found or you do not have permission to delete it' });
      }

      await prisma.campaign.update({
        where: { id: parseInt(id) },
        data: { deletedAt: new Date() },
      });

      await logCampaignAction(campaign.id, userId, 'delete', {});

      logger.info('Campaign soft deleted successfully', { campaignId: id, userId, ip: req.ip });
      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete campaign', { error: error.message, campaignId: req.params.id, userId: req.user?.id, ip: req.ip });
      res.status(400).json({ error: 'Failed to delete campaign', details: error.message });
    }
  },
];