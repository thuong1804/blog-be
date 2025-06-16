// src/graphql/schema.js
import { gql } from 'graphql-tag';

const postTypeDefs = gql`
  type Post {
    id: Int!
    title: String!
    slug: String!
    content: String!
    description: String!
    excerpt: String
    image: String!
    category: Category!
    tags: [Tag]
    views: Int
    readingTime: Int
    isFeatured: Boolean!
    createdAt: String!
    updatedAt: String!
    author: User!
    authorId: Int!
    comments: [Comment]
  }

  type Query {
    posts: [Post!]!
    post(slug: String!): Post
  }

  type Mutation {
    createPost(
      title: String!
      slug: String!
      content: String!
      description: String!
      image: String!
      category: String!
      authorId: Int!
    ): Post!
  }
`;

export default postTypeDefs;
