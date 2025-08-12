import { gql } from 'graphql-tag';

export const userTypeDefs = gql`
  type User {
    id: Int!
    name: String!
    handle: String!
    email: String!
    avatar: String!
    posts: [Post!]!
  }

  type Query {
      userByPosts(handle: String!): User
    }
`;