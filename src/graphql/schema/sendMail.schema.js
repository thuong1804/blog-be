import { gql } from "graphql-tag";

export const sendMailTypeDefs = gql`
    type Mutation {
        contact(
            name: String!
            email: String!
            phone: String
            subject: String!
            message: String!
        ): Boolean!
        subscribeSubmit(email: String!): Boolean!
    }
`;
