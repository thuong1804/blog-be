import { PrismaClient } from "@prisma/client";
import { checkRequiredField, formatSlug } from "../../utils/index.js";
import { NodeHtmlMarkdown } from "node-html-markdown";
const prisma = new PrismaClient();

export const postResolvers = {
    Query: {
        posts: async (_parent, args) => {
            const {
                page = 1,
                pageSize = 12,
                categorySlug,
                search,
            } = args;
            const skip = (page - 1) * pageSize;
            const take = pageSize;

            let categoryFilter = {};

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

                categoryFilter = {
                    categoryId: {
                        in: categoryIds,
                    },
                };
            }

            const whereCondition = {
                ...categoryFilter,
                ...(search
                    ? {
                        OR: [
                            { title: { contains: search, mode: "insensitive" } },
                            { excerpt: { contains: search, mode: "insensitive" } },
                            { content: { contains: search, mode: "insensitive" } },
                        ],
                    }
                    : {}),
            };

            const [items, total] = await Promise.all([
                prisma.post.findMany({
                    where: whereCondition,
                    skip,
                    take,
                    orderBy: {
                        createdAt: "desc",
                    },
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                        excerpt: true,
                        image: true,
                        updatedAt: true,
                        createdAt: true,
                        author: true,
                        category: {
                            select: {
                            name: true,
                            id: true,
                                parent: {
                                    select: {
                                        name: true,
                                        id: true
                                    },
                                },
                            },
                        },
                    },
                }),

                prisma.post.count({
                    where: whereCondition,
                }),
            ]);

            const totalPages = Math.ceil(total / pageSize);

            return {
                items,
                meta: {
                    total,
                    totalPages,
                    currentPage: page,
                    pageSize,
                },
            };
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
                select: {
                    id: true,
                    title: true,
                    slug: true,
                    excerpt: true,
                    image: true,
                    description: true,
                    author: true,
                    updatedAt: true,
                    createdAt: true,
                    category: {
                        select: {
                            name: true,
                            id: true,
                            parent: {
                                select: {
                                    name: true,
                                    id: true
                                },
                            },
                        },
                    },
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
                select: {
                    id: true,
                    title: true,
                    slug: true,
                    excerpt: true,
                    image: true,
                    updatedAt: true,
                    createdAt: true,
                    author: true,
                    category: {
                        select: {
                            name: true,
                            id: true,
                            parent: {
                                select: {
                                    name: true,
                                    id: true
                                },
                            },
                        },
                    },
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
                select: {
                    id: true,
                    title: true,
                    slug: true,
                    excerpt: true,
                    image: true,
                    updatedAt: true,
                    createdAt: true,
                    description: true,
                    author: true,
                    category: {
                        select: {
                            name: true,
                            id: true,
                            parent: {
                                select: {
                                    name: true,
                                    id: true
                                },
                            },
                        },
                    },
                },
            });
        },
        postAllSlugs: async () => {
            return await prisma.post.findMany({
                select: {
                    slug: true,
                    category: {
                        select: {
                            slug: true,
                            parent: {
                                select: { slug: true }
                            }
                        }
                    }
                }
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
            const { postId, authorId } = args;
            try {
                checkRequiredField({ args });

               const deleted = await prisma.post.deleteMany({
                    where: {
                        id: postId,
                        authorId: authorId,
                    },
                });

                if (deleted.count === 0) {
                    throw new Error("The post was not found, or you do not have permission to delete it.");
                }

                return { success: true, message: "Delete post message" };
            } catch (error) {
                console.error(error);
                throw new Error("Delete post failed!");
            }
        },
    },
};
