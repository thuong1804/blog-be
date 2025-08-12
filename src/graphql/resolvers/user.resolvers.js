import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const userResolvers = {
  Query: {
    userByPosts: async (_,  {handle}) => {
      return await prisma.user.findUnique({
        where: { handle: String(handle) },
        include: {
          posts: {
            include: {
              author: true,
              tags: true,
              category: {
                include: {
                  children: true,
                  parent: true
                }
              }
            }
          },
        }
      });
    },
  },
};