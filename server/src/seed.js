import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  const existing = await prisma.user.findUnique({ where: { username: adminUsername } });
  if (!existing) {
    await prisma.user.create({
      data: { username: adminUsername, password: adminPassword, isAdmin: true }
    });
    console.log(`Admin creado: ${adminUsername} / ${adminPassword}`);
  } else {
    console.log('Admin ya existe');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
