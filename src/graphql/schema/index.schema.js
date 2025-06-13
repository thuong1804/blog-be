import { gql } from 'graphql-tag';
import postTypeDefs from './post.schema.js';
import { userTypeDefs } from './user.schema.js';
import { tagTypeDefs } from './tag.schema.js';
import { commentTypeDefs } from './comment.schema.js';

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
];

export default typeDefs
