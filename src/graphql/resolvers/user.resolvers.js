import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const userResolvers = {
  Query: {
    userByPosts: async (_, { handle }) => {
      try {
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
            }
          }
        });
      } catch (error) {
        console.error("Error fetching user by posts:", error);
        throw new Error("Failed to fetch user by handle");
      }
    },

    users: async () => {
      try {
        return await prisma.user.findMany({
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
            }
          }
        });
      } catch (error) {
        console.error("Error fetching users:", error);
        throw new Error("Failed to fetch users");
      }
    },
  },
};
