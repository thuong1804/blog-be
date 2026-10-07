import { PrismaClient } from "@prisma/client";
import { estimateReadingTime, formatSlug } from "../../utils/index.js";
import { requireAuth } from "../../middleware/auth.js";
import {
    checkRateLimit,
    getClientIp,
    stripHtml,
} from "../../utils/security.js";
import { NodeHtmlMarkdown } from "node-html-markdown";
const prisma = new PrismaClient();

// Anti-inflation: 1 IP chỉ +1 view cho 1 bài mỗi 60 phút. Vượt ngưỡng thì
// trả về số hiện tại mà không tăng (không báo lỗi để FE không vỡ).
const VIEW_THROTTLE_MS = 60 * 60 * 1000;

export const postResolvers = {
    Post: {
        likedByMe: async (parent, _, context) => {
            const userId = context?.user?.userId;
            if (!userId || !parent?.id) return false;
            const like = await prisma.postLike.findUnique({
                where: {
                    userId_postId: {
                        userId: Number(userId),
                        postId: Number(parent.id),
                    },
                },
                select: { userId: true },
            });
            return !!like;
        },
        bookmarkedByMe: async (parent, _, context) => {
            const userId = context?.user?.userId;
            if (!userId || !parent?.id) return false;
            const bookmark = await prisma.bookmark.findUnique({
                where: {
                    userId_postId: {
                        userId: Number(userId),
                        postId: Number(parent.id),
                    },
                },
                select: { userId: true },
            });
            return !!bookmark;
        },
    },
    Query: {
        posts: async (_parent, args) => {
            const {
                page = 1,
                pageSize = 12,
                categorySlug,
                search,
                tag,
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
                ...(tag
                    ? {
                        tags: {
                            some: {
                                name: { equals: tag, mode: "insensitive" },
                            },
                        },
                    }
                    : {}),
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
                        likesCount: true,
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
                    likesCount: true,
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
                    likesCount: true,
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
                    likesCount: true,
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
                    updatedAt: true,
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
        siteStats: async () => {
            const [viewsAgg, totalPosts] = await Promise.all([
                prisma.post.aggregate({ _sum: { views: true } }),
                prisma.post.count(),
            ]);
            return {
                totalViews: viewsAgg._sum.views ?? 0,
                totalPosts,
            };
        },
        myBookmarks: async (_parent, { page = 1, pageSize = 12 }, context) => {
            const authUser = requireAuth(context);
            const userId = Number(authUser.userId);
            const skip = (page - 1) * pageSize;

            const [rows, total] = await Promise.all([
                prisma.bookmark.findMany({
                    where: { userId },
                    orderBy: { createdAt: "desc" },
                    skip,
                    take: pageSize,
                    include: {
                        post: {
                            include: {
                                tags: true,
                                author: true,
                                category: {
                                    include: { parent: true },
                                },
                            },
                        },
                    },
                }),
                prisma.bookmark.count({ where: { userId } }),
            ]);

            return {
                items: rows.map((row) => row.post),
                meta: {
                    total,
                    totalPages: Math.ceil(total / pageSize),
                    currentPage: page,
                    pageSize,
                },
            };
        },
        relatedPosts: async (_parent, { postId, take = 4 }) => {
            const source = await prisma.post.findUnique({
                where: { id: postId },
                select: {
                    id: true,
                    categoryId: true,
                    tags: { select: { id: true } },
                },
            });
            if (!source) return [];

            const tagIds = source.tags.map((t) => t.id);
            const candidates = await prisma.post.findMany({
                where: {
                    id: { not: postId },
                    OR: [
                        { categoryId: source.categoryId },
                        ...(tagIds.length
                            ? [{ tags: { some: { id: { in: tagIds } } } }]
                            : []),
                    ],
                },
                take: Math.max(take * 3, 12),
                orderBy: { createdAt: "desc" },
                include: {
                    tags: { select: { id: true, name: true } },
                    author: true,
                    category: {
                        include: { parent: true },
                    },
                },
            });

            const tagSet = new Set(tagIds);
            return candidates
                .map((post) => {
                    const sharedTags = post.tags.filter((t) =>
                        tagSet.has(t.id),
                    ).length;
                    const sameCategory =
                        post.categoryId === source.categoryId ? 1 : 0;
                    return {
                        post,
                        score: sharedTags * 2 + sameCategory,
                    };
                })
                .sort(
                    (a, b) =>
                        b.score - a.score ||
                        b.post.createdAt.getTime() -
                            a.post.createdAt.getTime(),
                )
                .slice(0, Math.max(take, 0))
                .map(({ post }) => post);
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
                        readingTime: estimateReadingTime(markdownContent),
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
                    const markdownContent = NodeHtmlMarkdown.translate(content);
                    data.content = markdownContent;
                    // Server is the source of truth: recompute reading time
                    // from the new content, ignore client-supplied value.
                    data.readingTime = estimateReadingTime(markdownContent);
                } else if (readingTime !== undefined) {
                    data.readingTime = readingTime;
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
        incrementPostViews: async (_, { postId }, context) => {
            const post = await prisma.post.findUnique({
                where: { id: postId },
                select: { id: true, views: true },
            });
            if (!post) {
                throw new Error("Post not found.");
            }
            const throttled = checkRateLimit(
                `view:post:${postId}:${getClientIp(context?.req)}`,
                1,
                VIEW_THROTTLE_MS,
            );
            if (!throttled.allowed) {
                return post.views ?? 0;
            }
            const updated = await prisma.post.update({
                where: { id: postId },
                data: { views: { increment: 1 } },
                select: { views: true },
            });
            return updated.views ?? 0;
        },
        toggleLike: async (_, { postId }, context) => {
            const authUser = requireAuth(context);
            const userId = Number(authUser.userId);

            const post = await prisma.post.findUnique({
                where: { id: postId },
                select: { id: true },
            });
            if (!post) {
                throw new Error("Post not found.");
            }

            const key = { userId_postId: { userId, postId } };
            const existing = await prisma.postLike.findUnique({
                where: key,
                select: { userId: true },
            });

            if (existing) {
                const [, updated] = await prisma.$transaction([
                    prisma.postLike.delete({ where: key }),
                    prisma.post.update({
                        where: { id: postId },
                        data: { likesCount: { decrement: 1 } },
                        select: { likesCount: true },
                    }),
                ]);
                return {
                    liked: false,
                    likesCount: Math.max(0, updated.likesCount ?? 0),
                };
            }

            const [, updated] = await prisma.$transaction([
                prisma.postLike.create({ data: { userId, postId } }),
                prisma.post.update({
                    where: { id: postId },
                    data: { likesCount: { increment: 1 } },
                    select: { likesCount: true },
                }),
            ]);
            return { liked: true, likesCount: updated.likesCount ?? 0 };
        },
        toggleBookmark: async (_, { postId }, context) => {
            const authUser = requireAuth(context);
            const userId = Number(authUser.userId);

            const post = await prisma.post.findUnique({
                where: { id: postId },
                select: { id: true },
            });
            if (!post) {
                throw new Error("Post not found.");
            }

            const key = { userId_postId: { userId, postId } };
            const existing = await prisma.bookmark.findUnique({
                where: key,
                select: { userId: true },
            });

            if (existing) {
                await prisma.bookmark.delete({ where: key });
                return { bookmarked: false };
            }

            await prisma.bookmark.create({ data: { userId, postId } });
            return { bookmarked: true };
        },
    },
};
