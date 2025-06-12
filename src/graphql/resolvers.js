// src/graphql/resolvers.js
import { getAllPosts } from './post.service.js';

const resolvers = {
  Query: {
    posts: async () => {
      return await getAllPosts();
    },
  },
};

export default resolvers;
