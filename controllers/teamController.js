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

