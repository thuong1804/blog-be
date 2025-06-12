// src/graphql/schema.js
import { gql } from 'graphql-tag';

const typeDefs = gql`
  type ItemCard {
    title: String!
    link: String!
    category: String!
    date: String!
    image: String!
    description: String!
  }

  type Query {
    posts: [ItemCard!]!
  }
`;

export default typeDefs;
