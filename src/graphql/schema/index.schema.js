import { gql } from 'graphql-tag';
import postTypeDefs from './post.schema.js';
import { userTypeDefs } from './user.schema.js';
import { tagTypeDefs } from './tag.schema.js';
import { commentTypeDefs } from './comment.schema.js';
import { categoryDefs } from './category.schema.js';
import { sendMailTypeDefs } from './sendMail.schema.js';
import { oAuthAccountTypeDefs } from './oAuthAccount.schema.js';
import { authTypeDefs } from './authTypeDefs.schema.js';
import { cloudinaryTypeDefs } from './cloudinaryTypeDefs.schema.js';

const baseTypeDefs = gql`
  type Query
  type Mutation
`;

const typeDefs = [
  baseTypeDefs,
  postTypeDefs,
  userTypeDefs,
  tagTypeDefs,
  commentTypeDefs,
  categoryDefs,
  sendMailTypeDefs,
  oAuthAccountTypeDefs,
  authTypeDefs,
  cloudinaryTypeDefs
];

export default typeDefs
