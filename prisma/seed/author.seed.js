import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function seedAuthor() {
  const author = await prisma.user.upsert({
    where: { email: 'techwriter@example.com' },
    update: {},
    create: {
      name: 'Tech Writer',
      email: 'techwriter@example.com',
    },
  });
  return author;
}
