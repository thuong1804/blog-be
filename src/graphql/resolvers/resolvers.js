import { categoryResolvers } from "./categories.resolvers.js";
import { postResolvers } from "./post.resolver.js";
import { commentResolvers } from "./comment.resolvers.js";
import { userResolvers } from "./user.resolvers.js";
import { sendMailResolvers } from "./sendMail.resolvers.js";
import { authResolvers } from "./auth.resolvers.js";
import { cloudinaryResolvers } from "./cloudinary.resolvers.js";
import { OTPResolvers } from "./otp.resolvers.js";
import { tagResolvers } from "./tag.resolvers.js";

const resolvers = {
    Post: {
        ...postResolvers.Post,
    },
    Comment: {
        ...commentResolvers.Comment,
    },
    Query: {
        ...postResolvers.Query,
        ...categoryResolvers.Query,
        ...userResolvers.Query,
        ...cloudinaryResolvers.Query,
        ...tagResolvers.Query,
        ...commentResolvers.Query,
    },
    Mutation: {
        ...sendMailResolvers.Mutation,
        ...authResolvers.Mutation,
        ...cloudinaryResolvers.Mutation,
        ...userResolvers.Mutation,
        ...OTPResolvers.Mutation,
        ...postResolvers.Mutation,
        ...commentResolvers.Mutation,
    },
};

export default resolvers;
