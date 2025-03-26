const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const { authenticateToken } = require('../middleware/auth');

router.post('/', authenticateToken, campaignController.createCampaign);
router.get('/', authenticateToken, campaignController.getCampaigns);
router.put('/:id', authenticateToken, campaignController.updateCampaign);
router.post('/:id/mark-as-sent', authenticateToken, campaignController.markCampaignAsSent);
router.delete('/:id', authenticateToken, campaignController.deleteCampaign);

// Test route (bypass auth for simplicity)
router.post('/test', campaignController.testCreateCampaign);

module.exports = router;