const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

router.post('/', authenticateToken, authorizeRole(['admin']), teamController.createTeam);
router.post('/invite', authenticateToken, teamController.inviteTeamMember);

module.exports = router;