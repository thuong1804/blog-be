// src/graphql/schema.js
import { gql } from "graphql-tag";

const postTypeDefs = gql`
    type Post {
        id: Int!
        title: String!
        slug: String!
        content: String! # Markdown content
        description: String!
        excerpt: String
        image: String!
        imagePublicId: String!
        category: Category!
        tags: [Tag]
        views: Int
        isPopular: Boolean!
        readingTime: Int
        isFeatured: Boolean!
        createdAt: String!
        updatedAt: String!
        author: User!
        authorId: Int!
        comments: [Comment]
    }

    type PostPagination {
        items: [Post!]!
        meta: PaginationMeta!
    }

    type PaginationMeta {
        total: Int!
        totalPages: Int!
        currentPage: Int!
        pageSize: Int!
    }

    type Query {
        posts(
            page: Int = 1,
            pageSize: Int = 10,
            categorySlug: String,
            search: String,
        ): PostPagination!
        postsByTitle(search: String): [Post!]!
        post(slug: String!): Post
        popularPosts: [Post!]
        postsLatest(skip: Int = 0, take: Int = 6): [Post!]
        postAllSlugs: [Post]
    }

    type PostResponse {
        success: Boolean!
        message: String
    }

    type Mutation {
        createPost(
            title: String!
            content: String!
            description: String!
            excerpt: String
            image: String!
            categoryId: Int!
            authorId: Int!
            tagIds: [Int!]!
        ): Post!
        deletePost(postId: Int!, userId: Int!): PostResponse!
    }
`;

export default postTypeDefs;
