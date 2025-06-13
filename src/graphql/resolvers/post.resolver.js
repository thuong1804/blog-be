export const postResolvers = {
  Query: {
   posts: async (_, __, context) => {
      return await context.prisma.post.findMany();
    },
  },
};