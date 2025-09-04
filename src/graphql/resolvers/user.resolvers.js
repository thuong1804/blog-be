import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import bcrypt from "bcrypt";
import 'dotenv/config'

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
            },
            accounts: true
          }
        });
      } catch (error) {
        console.error("Error fetching users:", error);
        throw new Error("Failed to fetch users");
      }
    },
    userDetail: async (_, { id }) => {
      try {
        return await prisma.user.findUnique({
          where: { id: id },
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
            accounts: true
          }
        });
      } catch (error) {
        console.error("Error fetching users:", error);
        throw new Error("Failed to fetch users");
      }
    },
  },
  Mutation: {
    updateUserDetail: async (_, args) => {
      const { id, name, avatar, description, handle } = args;

      try {
        const userUpdate = await prisma.user.update({
          where: { id },
          data: {
            ...(name && { name }),
            ...(handle && { handle }),
            ...(description && { description }),
            ...(avatar && { avatar }),
          },
        });
        return userUpdate;
      } catch (err) {
        console.error("Update user error:", err);
        throw new Error("Failed to update user details");
      }
    },
  }
};
