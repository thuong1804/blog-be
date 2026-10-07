import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../../middleware/auth.js";
import {
    checkRateLimit,
    getClientIp,
    sanitizeCommentHtml,
} from "../../utils/security.js";

const prisma = new PrismaClient();

const MAX_CONTENT_LENGTH = 2000;

function sanitizeContent(content) {
    // Rich-text from the custom editor: allow a safe HTML subset instead
    // of stripping everything (old markdown behaviour).
    return sanitizeCommentHtml(content, MAX_CONTENT_LENGTH);
}

async function assertCommentOwner(commentId, userId) {
    const comment = await prisma.comment.findUnique({
        where: { id: commentId },
        select: { id: true, authorId: true },
    });
    if (!comment || Number(comment.authorId) !== Number(userId)) {
        throw new Error("Comment not found or no permission.");
    }
    return comment;
}

export const commentResolvers = {
    Comment: {
        myVote: async (parent, _, context) => {
            const userId = context?.user?.userId;
            if (!userId || !parent?.id) return 0;
            const vote = await prisma.commentVote.findUnique({
                where: {
                    userId_commentId: {
                        userId: Number(userId),
                        commentId: Number(parent.id),
                    },
                },
                select: { value: true },
            });
            return vote?.value ?? 0;
        },
        repliesCount: async (parent) => {
            if (!parent?.id) return 0;
            return prisma.comment.count({
                where: { parentId: Number(parent.id) },
            });
        },
        replies: async (parent, _, context) => {
            if (!parent?.id) return [];
            // Only 1 extra level per field call; the client caps depth.
            const rows = await prisma.comment.findMany({
                where: { parentId: Number(parent.id) },
                orderBy: [{ score: "desc" }, { createdAt: "asc" }],
                include: { author: true },
            });
            void context;
            return rows;
        },
    },
    Query: {
        comments: async (_parent, { postId, sort = "NEWEST" }) => {
            const orderBy =
                sort === "OLDEST"
                    ? { createdAt: "asc" }
                    : sort === "TOP"
                      ? [{ score: "desc" }, { createdAt: "desc" }]
                      : { createdAt: "desc" };
            return prisma.comment.findMany({
                where: { postId, parentId: null },
                orderBy,
                include: { author: true },
            });
        },
    },
    Mutation: {
        createComment: async (_, { postId, content, parentId }, context) => {
            const authUser = requireAuth(context);
            const rl = checkRateLimit(
                `comment:ip:${getClientIp(context?.req)}`,
                30,
                60 * 60 * 1000,
            );
            if (!rl.allowed) {
                throw new Error(
                    `Bình luận quá nhiều. Thử lại sau ${rl.retryAfterSec}s.`,
                );
            }
            const text = sanitizeContent(content);

            const post = await prisma.post.findUnique({
                where: { id: postId },
                select: { id: true },
            });
            if (!post) {
                throw new Error("Post not found.");
            }

            if (parentId != null) {
                const parent = await prisma.comment.findUnique({
                    where: { id: parentId },
                    select: { id: true, postId: true },
                });
                if (!parent || parent.postId !== postId) {
                    throw new Error("Parent comment not found.");
                }
            }

            return prisma.comment.create({
                data: {
                    content: text,
                    postId,
                    authorId: Number(authUser.userId),
                    parentId: parentId ?? null,
                },
                include: { author: true },
            });
        },
        updateComment: async (_, { id, content }, context) => {
            const authUser = requireAuth(context);
            await assertCommentOwner(id, authUser.userId);
            const text = sanitizeContent(content);
            return prisma.comment.update({
                where: { id },
                data: { content: text },
                include: { author: true },
            });
        },
        deleteComment: async (_, { id }, context) => {
            const authUser = requireAuth(context);
            await assertCommentOwner(id, authUser.userId);
            // Replies cascade via onDelete: Cascade.
            await prisma.comment.delete({ where: { id } });
            return true;
        },
        voteComment: async (_, { commentId, value }, context) => {
            const authUser = requireAuth(context);
            if (value !== 1 && value !== -1) {
                throw new Error("Vote value must be 1 or -1.");
            }
            const userId = Number(authUser.userId);

            const comment = await prisma.comment.findUnique({
                where: { id: commentId },
                select: { id: true, score: true },
            });
            if (!comment) {
                throw new Error("Comment not found.");
            }

            const key = { userId_commentId: { userId, commentId } };
            const existing = await prisma.commentVote.findUnique({
                where: key,
                select: { value: true },
            });

            // Same value again = toggle off; different = switch.
            const nextValue = existing?.value === value ? 0 : value;
            const delta = nextValue - (existing?.value ?? 0);

            const [, updated] = await prisma.$transaction([
                nextValue === 0
                    ? prisma.commentVote.delete({ where: key })
                    : prisma.commentVote.upsert({
                          where: key,
                          create: { userId, commentId, value: nextValue },
                          update: { value: nextValue },
                      }),
                prisma.comment.update({
                    where: { id: commentId },
                    data: { score: { increment: delta } },
                    select: { score: true },
                }),
            ]);

            return { score: updated.score ?? 0, myVote: nextValue };
        },
    },
};
