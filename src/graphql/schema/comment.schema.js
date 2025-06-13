import { gql } from 'graphql-tag';

export const commentTypeDefs = gql`
  type Comment {
    id: Int!
    content: String!
    post: Post!
    postId: Int!
    author: User!
    authorId: Int!
    createdAt: String!
  }
`;