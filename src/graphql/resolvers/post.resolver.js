import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const postResolvers = {
  Query: {
   posts: async () => {
      return await prisma.post.findMany({
         include: {
          tags: true,
          author: true,
          comments: true,
        }});
    },
  },
};