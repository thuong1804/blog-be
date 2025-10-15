import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import bcrypt from "bcrypt";
import 'dotenv/config'

export const tagResolvers = {
  Query: {
    getTags: async () => {
      try {
        return await prisma.tag.findMany({
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
      } catch (error) {
        console.error("Error fetching users:", error);
        throw new Error("Failed to fetch users");
      }
    },
  },
};
