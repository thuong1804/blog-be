import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import "dotenv/config";
import { requireAuth } from "../../middleware/auth.js";
import { stripHtml } from "../../utils/security.js";

// SECURITY: OAuth tokens must never leave the server through user queries.
// The FE `GET_USER_BY_ID` document historically selected
// `accounts { accessToken refreshToken }`; we null those fields here so any
// such query receives null instead of real secrets.
function sanitizeUser(user) {
    if (!user) return user;
    if (Array.isArray(user.accounts)) {
        user.accounts = user.accounts.map((a) => ({
            ...a,
            accessToken: null,
            refreshToken: null,
        }));
    }
    if (user.posts && Array.isArray(user.posts)) {
        for (const post of user.posts) {
            if (post?.author && typeof post.author === "object") {
                delete post.author.password;
            }
        }
    }
    if (user && typeof user === "object" && "password" in user) {
        delete user.password;
    }
    return user;
}

export const userResolvers = {
    Query: {
        userByPosts: async (_, { handle }) => {
            try {
                const user = await prisma.user.findUnique({
                    where: { handle: String(handle) },
                    include: {
                        posts: {
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
                                        slug: true,
                                        parent: {
                                            select: {
                                                name: true,
                                                id: true,
                                                slug: true,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                });
                return sanitizeUser(user);
            } catch (error) {
                console.error("Error fetching user by posts");
                throw new Error("Failed to fetch user by handle");
            }
        },
        users: async () => {
            try {
                const users = await prisma.user.findMany({
                    include: {
                        posts: {
                            include: {
                                author: true,
                                tags: true,
                                category: {
                                    include: {
                                        children: true,
                                        parent: true,
                                    },
                                },
                            },
                        },
                        accounts: true,
                    },
                });
                return users.map(sanitizeUser);
            } catch (error) {
                console.error("Error fetching users");
                throw new Error("Failed to fetch users");
            }
        },
        userDetail: async (_, { id }) => {
            try {
                const user = await prisma.user.findUnique({
                    where: { id: id },
                    include: {
                        posts: {
                            include: {
                                author: true,
                                tags: true,
                                category: {
                                    include: {
                                        children: true,
                                        parent: true,
                                    },
                                },
                            },
                        },
                        accounts: true,
                    },
                });
                return sanitizeUser(user);
            } catch (error) {
                console.error("Error fetching user detail");
                throw new Error("Failed to fetch users");
            }
        },
    },
    Mutation: {
        updateUserDetail: async (_, args, context) => {
            // IDOR fix: users can only update their own profile.
            const authUser = requireAuth(context);
            const { id, name, avatar, description, handle } = args;

            if (Number(id) !== Number(authUser.userId)) {
                throw new Error(
                    "You do not have permission to update this profile.",
                );
            }

            try {
                if (handle) {
                    const taken = await prisma.user.findFirst({
                        where: { handle, NOT: { id: Number(id) } },
                    });
                    if (taken) {
                        throw new Error("Handle already taken");
                    }
                }
                const userUpdate = await prisma.user.update({
                    where: { id: Number(id) },
                    data: {
                        ...(name && { name: stripHtml(name, 100) }),
                        ...(handle && { handle: stripHtml(handle, 100) }),
                        ...(description && {
                            description: stripHtml(description, 500),
                        }),
                        ...(avatar && { avatar }),
                    },
                });
                return sanitizeUser(userUpdate);
            } catch (err) {
                if (err.message === "Handle already taken") throw err;
                console.error("Update user error");
                throw new Error("Failed to update user details");
            }
        },
    },
};
