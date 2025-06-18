import { categoryResolvers } from './categories.resolvers.js';
import { postResolvers } from './post.resolver.js';

const resolvers = {
  Query: {
    ...postResolvers.Query,
    ...categoryResolvers.Query
  }
};

export default resolvers;
