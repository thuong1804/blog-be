import { PrismaClient } from "@prisma/client";
import { checkRequiredField, formatSlug } from "../../utils/index.js";
import { NodeHtmlMarkdown } from "node-html-markdown";
const prisma = new PrismaClient();

export const postResolvers = {
    Query: {
        posts: async (_parent, args) => {
            const { categorySlug } = args;

            if (categorySlug) {
                const parentCategory = await prisma.category.findUnique({
                    where: { name: categorySlug },
                    include: { children: true },
                });

                if (!parentCategory) {
                    throw new Error(`Category not found: ${categorySlug}`);
                }

                const categoryIds = [
                    parentCategory.id,
                    ...parentCategory.children.map((child) => child.id),
                ];

                return await prisma.post.findMany({
                    where: {
                        categoryId: {
                            in: categoryIds,
                        },
                    },
                    include: {
                        tags: true,
                        author: true,
                        comments: true,
                        category: {
                            include: {
                                parent: true,
                                children: true,
                            },
                        },
                    },
                });
            }

            return await prisma.post.findMany({
                include: {
                    tags: true,
                    author: true,
                    comments: true,
                    category: {
                        include: {
                            parent: true,
                            children: true,
                        },
                    },
                },
            });
        },
        post: async (_parent, { slug }) => {
            return await prisma.post.findUnique({
                where: { slug },
                include: {
                    tags: true,
                    author: true,
                    comments: true,
                    category: {
                        include: {
                            parent: true,
                            children: true,
                        },
                    },
                },
            });
        },
        popularPosts: async () => {
            return await prisma.post.findMany({
                where: { isPopular: true },
                include: {
                    author: true,
                    category: {
                        include: {
                            parent: true,
                            children: true,
                        },
                    },
                    tags: true,
                },
            });
        },
        postsByTitle: async (_parent, { search }) => {
            return await prisma.post.findMany({
                where: {
                    title: {
                        contains: search,
                        mode: "insensitive",
                    },
                },
                include: {
                    author: true,
                    category: {
                        include: {
                            parent: true,
                            children: true,
                        },
                    },
                    tags: true,
                },
            });
        },
        postsLatest: async (_parent, { skip = 0, take = 6 }) => {
            return await prisma.post.findMany({
                orderBy: {
                    createdAt: "desc",
                },
                take,
                skip,
                include: {
                    author: true,
                    category: {
                        include: {
                            parent: true,
                            children: true,
                        },
                    },
                    tags: true,
                },
            });
        },
    },
    Mutation: {
        createPost: async (_, args) => {
            const {
                title,
                content,
                description,
                excerpt,
                image,
                categoryId,
                authorId,
                tagIds,
            } = args;
            try {
                checkRequiredField(args);

                const markdownContent = NodeHtmlMarkdown.translate(content);

                const post = await prisma.post.create({
                    data: {
                        title,
                        slug: formatSlug(title),
                        content: markdownContent,
                        description,
                        excerpt,
                        image,
                        categoryId,
                        authorId,
                        tags: {
                            connect: tagIds.map((id) => ({ id })),
                        },
                    },
                    include: {
                        tags: true,
                        category: true,
                        author: true,
                    },
                });

                return post;
            } catch (error) {
                console.error(error);
                throw new Error("Create post failed!");
            }
        },
        deletePost: async (_, args) => {
            const { postId, userId } = args;
            try {
                checkRequiredField({ args });

                await prisma.post.delete({
                    data: {
                        id: postId,
                        authorId: userId,
                    },
                });
                return { success: true, message: "Delete post message" };
            } catch (error) {
                console.error(error);
                throw new Error("Delete post failed!");
            }
        },
    },
};
