const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Create a new team and automatically add the creator as an admin member
exports.createTeam = async (req, res) => {
  try {
    // Extract team name and user ID from request body and authenticated user
    const { name } = req.body;
    const userId = req.user.id;

    // Validate that a team name is provided
    if (!name) {
      return res.status(400).json({ error: 'Team name is required' });
    }

    // Create the team with the authenticated user as the owner
    const team = await prisma.team.create({
      data: {
        name,
        owner_id: userId,
      },
    });

    // Automatically add the creator as a team member with the 'admin' role
    await prisma.userTeam.create({
      data: {
        user_id: userId,
        team_id: team.id,
        role: 'admin',
      },
    });

    // Respond with the created team details
    res.status(201).json(team);
  } catch (error) {
    // Handle any errors during team creation and provide details
    res.status(400).json({ error: 'Failed to create team', details: error.message });
  }
};

// Invite a new member to an existing team with a specified role
exports.inviteTeamMember = async (req, res) => {
  try {
    // Extract team ID, email, and role from request body; default role to 'viewer'
    const { teamId, email, role = 'viewer' } = req.body;
    const userId = req.user.id;

    // Verify that the requesting user is an admin of the specified team
    const userTeam = await prisma.userTeam.findFirst({
      where: { user_id: userId, team_id: parseInt(teamId), role: 'admin' },
    });

    if (!userTeam) {
      return res.status(403).json({ error: 'Only team admins can invite members' });
    }

    // Validate the provided role against allowed values
    if (!['viewer', 'editor', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Find the user to invite based on their email
    const invitedUser = await prisma.user.findUnique({ where: { email } });
    if (!invitedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if the user is already a member of the team
    const existingMember = await prisma.userTeam.findUnique({
      where: { user_id_team_id: { user_id: invitedUser.id, team_id: parseInt(teamId) } },
    });
    if (existingMember) {
      return res.status(400).json({ error: 'User is already a member of this team' });
    }

    // Add the invited user to the team with the specified role
    await prisma.userTeam.create({
      data: {
        user_id: invitedUser.id,
        team_id: parseInt(teamId),
        role,
      },
    });

    // Respond with success message
    res.status(200).json({ message: 'Member invited successfully' });
  } catch (error) {
    // Handle any errors during the invitation process and provide details
    res.status(400).json({ error: 'Failed to invite member', details: error.message });
  }
};