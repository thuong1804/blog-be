import { gql } from 'graphql-tag';

export const otpTypeDefs = gql`
  type OTP {
    id: Int!
    email: String
    code: String
    expiresAt: String!
    createdAt: String!
    verified: Boolean!
  }

  type OTPResponse {
    success: Boolean!
    message: String
    expiresAt: String
    resetToken: String
  }

  type Mutation {
    sendOTP(email: String!): OTPResponse!
    verifyOTP(email: String!, code: String!): OTPResponse!
  }
`;
