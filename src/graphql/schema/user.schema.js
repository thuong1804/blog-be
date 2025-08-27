import { gql } from 'graphql-tag';

export const userTypeDefs = gql`
  type User {
    id: Int!
    name: String!
    handle: String!
    description: String
    email: String!
    avatar: String!
    posts: [Post!]!
    accounts: [OAuthAccount!]!
  }

  type Query {
    userByPosts(handle: String!): User
    users: [User!]!
    userDetail(id: Int!): User
  }
`;