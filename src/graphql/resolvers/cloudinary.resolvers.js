// schema/resolvers.js
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import { deleteImage } from "../../utils/index.js";
import { requireAuth } from "../../middleware/auth.js";
import { checkRateLimit, getClientIp } from "../../utils/security.js";

const prisma = new PrismaClient();

// Upload hardening: only this folder may be signed. FE sends folder="blog".
const ALLOWED_FOLDERS = new Set(["blog"]);
// Signature freshness hint for FE (seconds). The signature embeds `timestamp`
// generated server-side at signing time; FE must upload immediately.
const SIGNATURE_TTL_SEC = 10 * 60;

function assertSafePublicId(publicId) {
    if (typeof publicId !== "string" || publicId.length === 0) {
        throw new Error("Invalid publicId.");
    }
    if (publicId.length > 300) throw new Error("Invalid publicId.");
    // Prevent path traversal / folder escape: only allow word chars, /, -, _.
    if (!/^[A-Za-z0-9/_-]+$/.test(publicId)) {
        throw new Error("Invalid publicId.");
    }
    if (publicId.includes("..")) throw new Error("Invalid publicId.");
}

export const cloudinaryResolvers = {
    Query: {
        _health: () => "ok",
    },

    Mutation: {
        getUploadSignature: async (_, { folder }, context) => {
            // Auth required: anonymous callers must not get upload signatures.
            requireAuth(context);
            const rl = checkRateLimit(
                `upload-sig:ip:${getClientIp(context?.req)}`,
                30,
                60 * 60 * 1000,
            );
            if (!rl.allowed) {
                throw new Error(
                    `Too many upload signature requests. Please try again after ${rl.retryAfterSec}s.`,
                );
            }
            const safeFolder =
                folder && ALLOWED_FOLDERS.has(folder) ? folder : "blog";
            if (folder && !ALLOWED_FOLDERS.has(folder)) {
                throw new Error(
                    "Invalid folder. Only 'blog' is allowed.",
                );
            }
            const timestamp = Math.floor(Date.now() / 1000);

            const paramsToSign = { timestamp, folder: safeFolder };

            const toSign = Object.keys(paramsToSign)
                .sort()
                .map((k) => `${k}=${paramsToSign[k]}`)
                .join("&");

            const signature = crypto
                .createHash("sha1")
                .update(toSign + process.env.CLOUDINARY_SECRET)
                .digest("hex");

            return {
                apiKey: process.env.CLOUDINARY_KEY,
                cloudName: process.env.CLOUDINARY_NAME,
                timestamp,
                signature,
                folder: safeFolder,
                // NOTE: FE must enforce client-side before upload:
                // content-type jpeg/png only, size <= 5MB, and use the
                // signature within SIGNATURE_TTL_SEC.
                // Server re-validates ownership when the URL is attached
                // via updatePostImage / updateAvatarUser.
            };
        },

        updatePostImage: async (_, { postId, image, publicId }, context) => {
            try {
                const authUser = requireAuth(context);
                assertSafePublicId(publicId);
                const post = await prisma.post.findUnique({
                    where: { id: postId },
                    select: { id: true, authorId: true },
                });
                if (
                    !post ||
                    Number(post.authorId) !== Number(authUser.userId)
                ) {
                    throw new Error(
                        "The post was not found, or you do not have permission.",
                    );
                }
                const updated = await prisma.post.update({
                    where: { id: postId },
                    data: {
                        image,
                        imagePublicId: publicId,
                    },
                });
                return updated;
            } catch (err) {
                console.error("Error updating post image");
                throw new Error(err.message || "Failed to update post image");
            }
        },

        updateAvatarUser: async (_, { userId, image, publicId }, context) => {
            try {
                const authUser = requireAuth(context);
                if (Number(userId) !== Number(authUser.userId)) {
                    return {
                        result: false,
                        user: null,
                        message:
                            "You do not have permission to update this avatar.",
                    };
                }
                assertSafePublicId(publicId);
                const updated = await prisma.user.update({
                    where: { id: Number(userId) },
                    data: {
                        avatar: image,
                        avatarPublicId: publicId,
                    },
                });
                return {
                    result: true,
                    user: updated,
                    message: "Upload avatar success",
                };
            } catch (err) {
                console.error("Error updating user avatar");
                return {
                    result: false,
                    user: null,
                    message: "Error updating user avatar",
                };
            }
        },

        deleteAvatar: async (_, { publicId, userId }, context) => {
            try {
                const authUser = requireAuth(context);
                // IDOR fix: publicId/userId from client are cross-checked
                // against the token identity + stored avatarPublicId.
                if (Number(userId) !== Number(authUser.userId)) {
                    throw new Error(
                        "You do not have permission to delete this avatar.",
                    );
                }
                assertSafePublicId(publicId);
                const owner = await prisma.user.findUnique({
                    where: { id: Number(userId) },
                    select: { id: true, avatarPublicId: true },
                });
                if (!owner || owner.avatarPublicId !== publicId) {
                    throw new Error("Avatar not found.");
                }
                const result = await deleteImage(publicId);
                if (result.result === "ok") {
                    await prisma.user.update({
                        where: { id: Number(userId) },
                        data: {
                            avatar: null,
                            avatarPublicId: null,
                        },
                    });
                }
                return {
                    result: result.result,
                    message: "Delete avatar success",
                };
            } catch (err) {
                console.error("Cloudinary delete error");
                throw new Error(err.message || "Failed to delete image");
            }
        },
    },
};

export { SIGNATURE_TTL_SEC };
