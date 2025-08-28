// schema/resolvers.js
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

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

    updatePostImage: async (_, { postId, image }) => {
      const updated = await prisma.post.update({
        where: { id: postId },
        data: { image },
      });
      return updated;
    },

    updateAvatarUser: async (_, { id, image }) => {
      const updated = await prisma.user.update({
        where: { id: id },
        data: { avatar: image },
      });
      return updated;
    },
  },
};
