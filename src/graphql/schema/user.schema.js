import { gql } from 'graphql-tag';

export const userTypeDefs = gql`
  type User {
    id: Int!
    name: String!
    email: String!
    avatar: String!
    posts: [Post!]!
  }
`;