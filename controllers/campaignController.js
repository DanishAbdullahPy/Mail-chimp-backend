const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.createCampaign = async (req, res) => {
  try {
    const { name, body, subject, template_id, scheduled_at } = req.body;
    const userId = req.user.id; // From authenticated JWT

    // Validate required fields
    if (!name || !body) {
      return res.status(400).json({ error: 'Name and body are required' });
    }

    const campaign = await prisma.campaign.create({
      data: {
        name,
        body, // Use the body from req.body
        subject: subject || null, // Optional
        template_id: template_id ? parseInt(template_id) : null, // Optional
        status: 'draft', // Default value
        scheduled_at: scheduled_at ? new Date(scheduled_at) : null, // Optional
        user_id: userId,
      },
    });

    res.status(201).json(campaign);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create campaign', details: error.message });
  }
};

// Retrieve campaigns with pagination
exports.getCampaigns = async (req, res) => {
  try {
    const userId = req.user.id; // Get user ID from authenticated JWT
    const page = parseInt(req.query.page) || 1; // Default to page 1 if not provided
    const limit = parseInt(req.query.limit) || 10; // Default to 10 items per page if not provided
    const skip = (page - 1) * limit; // Calculate the number of items to skip based on page

    // Fetch campaigns with pagination and filtering by user
    const campaigns = await prisma.campaign.findMany({
      where: { user_id: userId },
      skip: skip, // Skip items for the current page
      take: limit, // Limit the number of items per page
      orderBy: { created_at: 'desc' }, // Sort by creation date, most recent first
    });

    // Count total campaigns for the user to calculate pagination
    const total = await prisma.campaign.count({ where: { user_id: userId } });
    const totalPages = Math.ceil(total / limit); // Calculate total number of pages

    // Return campaigns with pagination metadata
    res.status(200).json({
      data: campaigns,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalItems: total,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    res.status(400).json({ error: 'Failed to fetch campaigns', details: error.message });
  }
};

// Update an existing campaign
exports.updateCampaign = async (req, res) => {
  try {
    const { id } = req.params; // Get campaign ID from URL parameter
    const { name, body, subject, template_id, scheduled_at, status } = req.body; // Extract update fields
    const userId = req.user.id; // Get user ID from authenticated JWT

    // Check if the campaign exists and belongs to the user
    const campaignExists = await prisma.campaign.findFirst({
      where: {
        id: parseInt(id),
        user_id: userId,
      },
    });

    if (!campaignExists) {
      return res.status(404).json({ error: 'Campaign not found or you do not have permission to update it' });
    }

    // Update the campaign
    const campaign = await prisma.campaign.update({
      where: { id: parseInt(id) },
      data: {
        name,
        body,
        subject: subject || null, // Optional field, defaults to null if not provided
        template_id: template_id ? parseInt(template_id) : null, // Optional, parsed to integer if provided
        scheduled_at: scheduled_at ? new Date(scheduled_at) : null, // Optional, parsed to Date if provided
        status: status || 'draft', // Allow status update, defaults to 'draft' if not provided
        updated_at: new Date(), // Update the timestamp
      },
    });

    res.status(200).json(campaign); // Return the updated campaign
  } catch (error) {
    res.status(400).json({ error: 'Failed to update campaign', details: error.message });
  }
};

// Mark a campaign as sent
exports.markCampaignAsSent = async (req, res) => {
  try {
    const { id } = req.params; // Get campaign ID from URL parameter
    const campaign = await prisma.campaign.update({
      where: { id: parseInt(id) }, // Identify the campaign to update
      data: {
        status: 'sent', // Update status to 'sent'
        sent_at: new Date(), // Set the sent timestamp
        updated_at: new Date(), // Update the timestamp
      },
    });
    res.status(200).json(campaign); // Return the updated campaign
  } catch (error) {
    res.status(400).json({ error: 'Failed to mark campaign as sent', details: error.message });
  }
};
exports.deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.campaign.delete({
      where: { id: parseInt(id) },
    });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete campaign', details: error.message });
  }
};