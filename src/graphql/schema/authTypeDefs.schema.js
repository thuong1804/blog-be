import { gql } from "graphql-tag";

export const authTypeDefs = gql`
  type AuthPayload {
    token: String!
    user: User!
  }

  type Mutation {
    login(email: String!, password: String!): AuthPayload!
    signup(email: String!, password: String!, name: String, handle: String): AuthPayload!
    loginWithGoogle(idToken: String!): AuthPayload!
  }
`;
