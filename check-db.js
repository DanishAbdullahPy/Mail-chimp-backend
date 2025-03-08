const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkConnection() {
    try {
        await prisma.$connect();
        console.log('Database connection successful!');

        const users = await prisma.user.findMany();
        console.log('Users:', users);

        const automations = await prisma.automation.findMany();
        console.log('Automations:', automations);

        const templates = await prisma.template.findMany();
        console.log('Templates:', templates);

        const campaigns = await prisma.campaign.findMany();
        console.log('Campaigns:', campaigns);

        const subscribers = await prisma.subscriber.findMany();
        console.log('Subscribers:', subscribers);

        const campaignSubscribers = await prisma.campaignSubscriber.findMany();
        console.log('CampaignSubscribers:', campaignSubscribers);

        const emailEvents = await prisma.emailEvent.findMany();
        console.log('EmailEvents:', emailEvents);
    } catch (error) {
        console.error('Database connection failed:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkConnection();