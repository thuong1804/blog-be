import { gql } from "graphql-tag";

export const tagTypeDefs = gql`
    type Tag {
        id: Int!
        name: String!
        posts: [Post!]!
    }

    type Query {
        getTags: [Tag!]!
    }
`;
