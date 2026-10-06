import { PrismaClient } from "@prisma/client";
import { formatSlug } from "../../utils/index.js";
import { requireAuth } from "../../middleware/auth.js";
import { stripHtml } from "../../utils/security.js";
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
                        description: true,
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
        post: async (_parent, { slug, id }) => {
            if (!slug && !id) {
                throw new Error("Either 'slug' or 'id' must be provided.");
            }
            return await prisma.post.findUnique({
                where: id ? { id } : { slug },
                include: {
                    tags: true,
                    author: true,
                    comments: {
                        include: {
                            author: true,
                        },
                    },
                    category: {
                        include: {
                            parent: true,
                            children: true,
                        },
                    },
                },
            });
        },
        postDetail: async (_parent, { id, slug }) => {
            if (!id && !slug) {
                throw new Error("Either 'id' or 'slug' must be provided.");
            }
            return await prisma.post.findUnique({
                where: id ? { id } : { slug },
                include: {
                    tags: true,
                    author: true,
                    comments: {
                        include: {
                            author: true,
                        },
                    },
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
        createPost: async (_, args, context) => {
            // IDOR fix: author is always the authenticated user, never the
            // client-supplied `authorId` (kept optional for FE compat).
            const authUser = requireAuth(context);
            const authorId = Number(authUser.userId);
            const {
                title,
                content,
                description,
                excerpt,
                image,
                categoryId,
                tagIds,
            } = args;
            try {
                if (!title || !content || !description || !image || !categoryId) {
                    throw new Error("Missing required fields!");
                }

                const markdownContent = NodeHtmlMarkdown.translate(content);

                const post = await prisma.post.create({
                    data: {
                        title: stripHtml(title, 200),
                        slug: formatSlug(title),
                        content: markdownContent,
                        description: stripHtml(description, 5000),
                        excerpt: excerpt
                            ? stripHtml(excerpt, 500)
                            : undefined,
                        image,
                        categoryId,
                        authorId,
                        tags: {
                            connect: (tagIds || []).map((id) => ({ id })),
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
                console.error("Create post error");
                throw new Error(error.message || "Create post failed!");
            }
        },
        updatePost: async (_, args, context) => {
            // IDOR fix: ownership checked against token identity; the
            // client-supplied `authorId` is ignored.
            const authUser = requireAuth(context);
            const {
                id,
                title,
                content,
                description,
                excerpt,
                image,
                imagePublicId,
                categoryId,
                tagIds,
                isPopular,
                isFeatured,
                readingTime,
                slug,
            } = args;

            try {
                if (!id) {
                    throw new Error("Post 'id' is required!");
                }

                const existingPost = await prisma.post.findUnique({
                    where: { id },
                });

                if (!existingPost) {
                    throw new Error(`Post with id ${id} not found.`);
                }

                if (Number(existingPost.authorId) !== Number(authUser.userId)) {
                    throw new Error(
                        "You do not have permission to update this post.",
                    );
                }

                let targetSlug;
                if (slug) {
                    targetSlug = formatSlug(slug);
                } else if (title && title !== existingPost.title) {
                    targetSlug = formatSlug(title);
                }

                if (targetSlug && targetSlug !== existingPost.slug) {
                    const conflict = await prisma.post.findUnique({
                        where: { slug: targetSlug },
                    });
                    if (conflict && conflict.id !== id) {
                        targetSlug = `${targetSlug}-${Date.now()}`;
                    }
                }

                if (categoryId) {
                    const categoryExists = await prisma.category.findUnique({
                        where: { id: categoryId },
                    });
                    if (!categoryExists) {
                        throw new Error(`Category with id ${categoryId} not found.`);
                    }
                }

                const data = {};
                if (title !== undefined)
                    data.title = stripHtml(title, 200);
                if (targetSlug !== undefined) data.slug = targetSlug;
                if (content !== undefined) {
                    data.content = NodeHtmlMarkdown.translate(content);
                }
                if (description !== undefined)
                    data.description = stripHtml(description, 5000);
                if (excerpt !== undefined)
                    data.excerpt = stripHtml(excerpt, 500);
                if (image !== undefined) data.image = image;
                if (imagePublicId !== undefined) data.imagePublicId = imagePublicId;
                if (categoryId !== undefined) data.categoryId = categoryId;
                if (isPopular !== undefined) data.isPopular = isPopular;
                if (isFeatured !== undefined) data.isFeatured = isFeatured;
                if (readingTime !== undefined) data.readingTime = readingTime;

                if (Array.isArray(tagIds)) {
                    data.tags = {
                        set: tagIds.map((tagId) => ({ id: tagId })),
                    };
                }

                // NOTE: authorId can never be changed via updatePost.

                const updatedPost = await prisma.post.update({
                    where: { id },
                    data,
                    include: {
                        tags: true,
                        category: {
                            include: {
                                parent: true,
                                children: true,
                            },
                        },
                        author: true,
                        comments: {
                            include: {
                                author: true,
                            },
                        },
                    },
                });

                return updatedPost;
            } catch (error) {
                console.error("Update post error");
                throw error;
            }
        },
        deletePost: async (_, args, context) => {
            // IDOR fix: ownership checked against token identity; the
            // client-supplied `authorId` (optional, deprecated) is ignored.
            const authUser = requireAuth(context);
            const { postId } = args;
            try {
                if (!postId) {
                    throw new Error('Field "postId" is required!');
                }

                const existing = await prisma.post.findUnique({
                    where: { id: postId },
                    select: { id: true, authorId: true },
                });
                if (
                    !existing ||
                    Number(existing.authorId) !== Number(authUser.userId)
                ) {
                    throw new Error(
                        "The post was not found, or you do not have permission to delete it.",
                    );
                }

                await prisma.post.delete({
                    where: { id: postId },
                });

                return { success: true, message: "Delete post message" };
            } catch (error) {
                console.error("Delete post error");
                throw new Error(
                    error.message || "Delete post failed!",
                );
            }
        },
    },
};
