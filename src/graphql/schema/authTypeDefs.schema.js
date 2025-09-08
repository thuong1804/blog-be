import { gql } from "graphql-tag";

export const authTypeDefs = gql`
  type AuthPayload {
    token: String!
    refreshToken: String!
    user: User!
  }

  type ResultResponse {
    success: Boolean!
    message: String!
  }

  type Mutation {
    login(email: String!, password: String!): AuthPayload!
    signup(email: String!, password: String!, name: String, handle: String): AuthPayload!
    loginWithGoogle(idToken: String!): AuthPayload!
    validatePassword(email: String!, password: String): ResultResponse!
    changePassword(email: String!, password: String): ResultResponse!
    refreshToken(refreshToken: String!): AuthPayload!
    resetPassword(token: String!, newPassword: String!): ResultResponse!
  }
`;
