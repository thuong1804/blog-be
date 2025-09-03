import { gql } from "graphql-tag";

export const authTypeDefs = gql`
  type AuthPayload {
    token: String!
    refreshToken: String!
    user: User!
  }

  type ChangePasswordResponse {
    success: Boolean!
    message: String!
  }

  type Mutation {
    login(email: String!, password: String!): AuthPayload!
    signup(email: String!, password: String!, name: String, handle: String): AuthPayload!
    loginWithGoogle(idToken: String!): AuthPayload!
    validatePassword(id: Int!, password: String): ChangePasswordResponse!
    changePassword(id: Int!, password: String): ChangePasswordResponse!
    refreshToken(refreshToken: String!): AuthPayload!
  }
`;
