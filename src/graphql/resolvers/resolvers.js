import { postResolvers } from './post.resolver.js';

const resolvers = {
  Query: {
    ...postResolvers.Query
  },
};

export default resolvers;
