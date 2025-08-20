import { categoryResolvers } from './categories.resolvers.js';
import { postResolvers } from './post.resolver.js';
import { userResolvers } from './user.resolvers.js';
import { sendMailResolvers } from './sendMail.resolvers.js';

const resolvers = {
  Query: {
    ...postResolvers.Query,
    ...categoryResolvers.Query,
    ...userResolvers.Query,
  },
  Mutation: {
    ...sendMailResolvers.Mutation,
  },
};

export default resolvers;
