import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const adapter = new PrismaLibSql({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Start seeding...');
  
  // Create a default master user
  const email = 'admin@example.com';
  const password = 'password123';
  const passwordHash = await bcrypt.hash(password, 10);
  
  const existingUser = await prisma.profile.findUnique({ where: { email } });
  
  if (!existingUser) {
    const user = await prisma.profile.create({
      data: {
        email,
        passwordHash,
        vacationBalance: 15.00,
        sickBalance: 15.00,
      },
    });
    console.log(`Created default user with email: ${user.email}`);
  } else {
    console.log(`User ${email} already exists.`);
  }

  console.log('Seeding finished.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
