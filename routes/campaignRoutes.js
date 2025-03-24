const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const { authenticateToken } = require('../middleware/auth');

// Route to create a new campaign
router.post('/', authenticateToken, campaignController.createCampaign);

// Route to get campaigns with pagination
router.get('/', authenticateToken, campaignController.getCampaigns);

// Route to update an existing campaign
router.put('/:id', authenticateToken, campaignController.updateCampaign);

// Route to delete a campaign
router.delete('/:id', authenticateToken, campaignController.deleteCampaign);

// Route to mark a campaign as sent
router.put('/:id/send', authenticateToken, campaignController.markCampaignAsSent); // New route to mark as sent

module.exports = router;