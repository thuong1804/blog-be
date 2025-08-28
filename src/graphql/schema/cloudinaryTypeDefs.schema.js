import { gql } from 'graphql-tag';

export const cloudinaryTypeDefs = gql`
  type CloudinarySignature {
    apiKey: String!
    cloudName: String!
    timestamp: Int!
    signature: String!
    folder: String
  }

  type Mutation {
    getUploadSignature(folder: String): CloudinarySignature!
    updatePostImage(postId: Int!, image: String!): Post!
    updateAvatarUser(userId: Int!, image: String!): User!
  }

  type Query {
    _health: String!
  }
`;