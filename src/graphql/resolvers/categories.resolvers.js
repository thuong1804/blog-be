import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const categoryResolvers = {
  Query: {
    categories: async () => {
      return await prisma.category.findMany({
        include: {
          posts: {
            include: {
              author: true,
              tags: true,
              category: true
            }
          },
          children: true
        }
      });
    },
  },
};