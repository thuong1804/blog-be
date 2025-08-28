import { categoryResolvers } from './categories.resolvers.js';
import { postResolvers } from './post.resolver.js';
import { userResolvers } from './user.resolvers.js';
import { sendMailResolvers } from './sendMail.resolvers.js';
import { authResolvers } from './auth.resolvers.js';
import { cloudinaryResolvers } from './cloudinary.resolvers.js';

const resolvers = {
  Query: {
    ...postResolvers.Query,
    ...categoryResolvers.Query,
    ...userResolvers.Query,
    ...cloudinaryResolvers.Query
  },
  Mutation: {
    ...sendMailResolvers.Mutation,
    ...authResolvers.Mutation,
    ...cloudinaryResolvers.Mutation,
    ...userResolvers.Mutation,
  },
};

export default resolvers;
