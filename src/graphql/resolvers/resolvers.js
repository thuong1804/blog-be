import { categoryResolvers } from './categories.resolvers.js';
import { postResolvers } from './post.resolver.js';
import { userResolvers } from './user.resolvers.js';

const resolvers = {
  Query: {
    ...postResolvers.Query,
    ...categoryResolvers.Query,
    ...userResolvers.Query
  }
};

export default resolvers;
