// schema/resolvers.js
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { deleteImage } from "../../utils/index.js";

const prisma = new PrismaClient();

export const cloudinaryResolvers = {
  Query: {
    _health: () => 'ok',
  },

  Mutation: {
    getUploadSignature: async (_, { folder }) => {
      const timestamp = Math.floor(Date.now() / 1000);

      const paramsToSign = { timestamp };
      if (folder) paramsToSign.folder = folder;

      const toSign = Object.keys(paramsToSign)
        .sort()
        .map(k => `${k}=${paramsToSign[k]}`)
        .join('&');

      const signature = crypto
        .createHash('sha1')
        .update(toSign + process.env.CLOUDINARY_SECRET)
        .digest('hex');

      return {
        apiKey: process.env.CLOUDINARY_KEY,
        cloudName: process.env.CLOUDINARY_NAME,
        timestamp,
        signature,
        folder: folder || null,
      };
    },

    updatePostImage: async (_, { postId, image, publicId }) => {
      try {
        const updated = await prisma.post.update({
          where: { id: postId },
          data: {
            image: image,
            imagePublicId: publicId
          },
        });
        return updated;
      } catch (err) {
        console.error("Error updating post image:", err);
        throw new Error("Failed to update post image");
      }
    },

    updateAvatarUser: async (_, { userId, image, publicId }) => {
      try {
        const updated = await prisma.user.update({
          where: { id: userId },
          data: {
            avatar: image,
            avatarPublicId: publicId
          },
        });
        return {
          result: true,
          user: updated,
          message: 'Upload avatar success'
        };
      } catch (err) {
        console.error("Error updating user avatar:", err);
        return {
          result: false,
          user: null,
          message: "Error updating user avatar"
        };
      }
    },

    deleteAvatar: async (_, { publicId, userId }) => {
      try {
        const result = await deleteImage(publicId);
        if (result.result === "ok") {
          await prisma.user.update({
            where: { id: userId },
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
        console.error("Cloudinary delete error:", err);
        throw new Error("Failed to delete image");
      }
    },
  },
};
