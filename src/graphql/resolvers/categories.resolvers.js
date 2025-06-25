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
          children: {
            include: {
              posts: {
                include: {
                  author: true,
                  tags: true,
                  category: {
                    include : {
                      children: true,
                      parent: true
                    }
                  }
                }
              },
            }
          }
        }
      });
    },
    category: async (_parent, { slug }) => {
      return await prisma.category.findUnique({
        where: { slug },
        include: {
          posts: {
            include: {
              author: true,
              tags: true,
              category: true
            }
          },
          parent: true,
          children: {
            include: {
              posts: {
                include: {
                  author: true,
                  tags: true,
                  category: {
                    include : {
                      children: true,
                      parent: true
                    }
                  }
                }
              },
            }
          },
        }
      });
    }
  },
};