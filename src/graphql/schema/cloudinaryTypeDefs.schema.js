import { gql } from 'graphql-tag';

export const cloudinaryTypeDefs = gql`
  type CloudinarySignature {
    apiKey: String!
    cloudName: String!
    timestamp: Int!
    signature: String!
    folder: String
  }

  type UpdateUserResponse {
    result: Boolean!
    user: User!
    message: String!
  }

  type DeleteImageResponse {
    result: String
    message: String!
  }

  type Mutation {
    getUploadSignature(folder: String): CloudinarySignature!
    updatePostImage(postId: Int!, image: String!, publicId: String!): Post!
    updateAvatarUser(userId: Int!, image: String!, publicId: String!): UpdateUserResponse!
    deleteAvatar(publicId: String!, userId: Int!): DeleteImageResponse!
  }

  type Query {
    _health: String!
  }
`;