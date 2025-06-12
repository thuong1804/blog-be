// src/graphql/post.service.js
import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

export const getAllPosts = async () => {
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return posts.map(post => ({
    title: post.title,
    link: `/blog/${post.slug}`,
    category: post.category,
    date: post.createdAt.toISOString(),
    image: post.image,
    description: post.description,
  }));
};
