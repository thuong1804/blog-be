import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const postResolvers = {
  Query: {
    posts: async (_parent, args) => {
      const { categorySlug } = args;

      if (categorySlug) {
        const parentCategory = await prisma.category.findUnique({
          where: { name: categorySlug },
          include: { children: true },
        });

        if (!parentCategory) {
          throw new Error(`Category not found: ${categorySlug}`);
        }

        const categoryIds = [
          parentCategory.id,
          ...parentCategory.children.map((child) => child.id),
        ];

        return await prisma.post.findMany({
          where: {
            categoryId: {
              in: categoryIds,
            },
          },
          include: {
            tags: true,
            author: true,
            comments: true,
            category: {
              include: {
                parent: true,
                children: true,
              },
            },
          },
        });
      }

      return await prisma.post.findMany({
        include: {
          tags: true,
          author: true,
          comments: true,
          category: {
            include: {
              parent: true,
              children: true,
            },
          },
        },
      });
    },

    post: async (_parent, { slug }) => {
      return await prisma.post.findUnique({
        where: { slug },
        include: {
          tags: true,
          author: true,
          comments: true,
          category: {
            include: {
              parent: true,
              children: true,
            },
          },
        },
      });
    },
    popularPosts: async () => {
      return await prisma.post.findMany({
        where: { isPopular: true },
        include: {
          author: true,
          category: {
            include: {
              parent: true,
              children: true,
            },
          },
          tags: true
        }
      });
    },
    postsByTitle: async (_parent, {search}) => {
      return await prisma.post.findMany({
        where: {
          title: {
            contains: search,
            mode: 'insensitive'
          }
        },
        include: {
          author: true,
          category: {
            include: {
              parent: true,
              children: true,
            },
          },
          tags: true,
        },
      });
    }
  },
};
