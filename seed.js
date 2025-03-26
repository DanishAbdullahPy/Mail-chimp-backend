const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  await prisma.subscriber.createMany({
    data: [
      { email: 'subscriber1@example.com' },
      { email: 'danishabdullah276@gmail.com' },
    ],
  });
  console.log('Test subscribers created');
}

seed().finally(() => prisma.$disconnect());