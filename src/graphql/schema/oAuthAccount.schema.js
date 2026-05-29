import { gql } from "graphql-tag";

export const oAuthAccountTypeDefs = gql`
    type OAuthAccount {
        id: Int!
        provider: String!
        providerAccountId: String!
        accessToken: String
        refreshToken: String
        userId: Int
        user: User!
    }
`;
