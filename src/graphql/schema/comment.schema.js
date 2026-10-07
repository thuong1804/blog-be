import { gql } from "graphql-tag";

export const commentTypeDefs = gql`
    enum CommentSort {
        NEWEST
        OLDEST
        TOP
    }

    type Comment {
        id: Int!
        content: String!
        post: Post!
        postId: Int!
        author: User!
        authorId: Int!
        parentId: Int
        score: Int!
        myVote: Int!
        repliesCount: Int!
        replies: [Comment!]!
        createdAt: String!
    }

    type CommentVotePayload {
        score: Int!
        myVote: Int!
    }

    type Query {
        comments(postId: Int!, sort: CommentSort = NEWEST): [Comment!]!
    }

    type Mutation {
        createComment(
            postId: Int!
            content: String!
            parentId: Int
        ): Comment!
        updateComment(id: Int!, content: String!): Comment!
        deleteComment(id: Int!): Boolean!
        voteComment(commentId: Int!, value: Int!): CommentVotePayload!
    }
`;
