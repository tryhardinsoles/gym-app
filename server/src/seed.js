import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  await prisma.user.upsert({
    where: { username: adminUsername },
    update: { password: adminPassword, isAdmin: true },
    create: { username: adminUsername, password: adminPassword, isAdmin: true },
  });
  console.log(`Admin listo: ${adminUsername}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
