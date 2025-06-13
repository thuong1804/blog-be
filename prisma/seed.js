import pkg from '@prisma/client'
const { PrismaClient } = pkg
const prisma = new PrismaClient();

async function main() {
  // Tạo một user làm tác giả
  const author = await prisma.user.upsert({
    where: { email: 'techwriter@example.com' },
    update: {},
    create: {
      name: 'Tech Writer',
      email: 'techwriter@example.com',
    },
  });

  // Tạo tags
  const tagNames = ['AI', 'VR', 'Blockchain', 'Cloud', 'DevOps', 'Cybersecurity'];
  const tags = await Promise.all(
    tagNames.map((name) =>
      prisma.tag.upsert({
        where: { name },
        update: {},
        create: { name },
      })
    )
  );

  // Dữ liệu bài viết
  const postsData = [
    {
      title: 'Exploring the Future of AI in Everyday Life',
      slug: 'future-of-ai',
      content: 'AI is rapidly integrating into our lives from virtual assistants to smart cars...',
      description: 'Discover how AI is reshaping daily experiences.',
      excerpt: 'From Siri to self-driving cars, AI is here.',
      image: 'https://res.cloudinary.com/deq5l7fn1/image/upload/v1749795269/cloud_hflujv.png',
      category: 'Artificial Intelligence',
      tags: ['AI'],
    },
    {
      title: 'Virtual Reality is Changing How We Play and Learn',
      slug: 'vr-play-and-learn',
      content: 'VR brings immersive learning and gaming to the next level...',
      description: 'The power of VR beyond gaming.',
      excerpt: 'VR isn’t just games — it’s education too.',
      image: 'https://res.cloudinary.com/deq5l7fn1/image/upload/v1749795627/virtual_kf8tlq.jpg',
      category: 'Virtual Reality',
      tags: ['VR'],
    },
    {
      title: 'How Blockchain is Revolutionizing Finance',
      slug: 'blockchain-finance',
      content: 'Blockchain offers transparency and decentralization for global finance...',
      description: 'Why banks fear blockchain.',
      excerpt: 'It’s not just Bitcoin — blockchain is bigger.',
      image: 'https://res.cloudinary.com/deq5l7fn1/image/upload/v1749795622/blockchain_p4gfjy.jpg',
      category: 'Blockchain',
      tags: ['Blockchain'],
    },
    {
      title: 'Cloud Computing in 2025: What to Expect',
      slug: 'cloud-computing-2025',
      content: 'The cloud is evolving, and multi-cloud environments will dominate...',
      description: 'A look at the next-gen cloud tech.',
      excerpt: 'Your next server might be serverless.',
      image: 'https://res.cloudinary.com/deq5l7fn1/image/upload/v1749795269/cloud_hflujv.png',
      category: 'Cloud',
      tags: ['Cloud'],
    },
    {
      title: 'DevOps: The Bridge Between Development and Operations',
      slug: 'devops-bridge',
      content: 'DevOps culture helps teams deploy faster, better, and safer...',
      description: 'CI/CD is just the beginning.',
      excerpt: 'Dev + Ops = 🚀',
      image: 'https://res.cloudinary.com/deq5l7fn1/image/upload/v1749795281/devop_i8ytgm.jpg',
      category: 'DevOps',
      tags: ['DevOps'],
    },
    {
      title: 'Cybersecurity in the Age of AI: Challenges Ahead',
      slug: 'cybersecurity-ai',
      content: 'AI-powered attacks are rising, and defense needs to catch up...',
      description: 'When AI hacks, who stops it?',
      excerpt: 'AI is both the sword and the shield.',
      image: 'https://res.cloudinary.com/deq5l7fn1/image/upload/v1749795274/ai_jghbly.jpg',
      category: 'Cybersecurity',
      tags: ['Cybersecurity', 'AI'],
    },
  ];

  // Tạo từng bài post
  for (const post of postsData) {
    const createdPost = await prisma.post.create({
      data: {
        title: post.title,
        slug: post.slug,
        content: post.content,
        description: post.description,
        excerpt: post.excerpt,
        image: post.image,
        category: post.category,
        isFeatured: false,
        views: Math.floor(Math.random() * 1000),
        readingTime: Math.floor(Math.random() * 5) + 3,
        authorId: author.id,
        tags: {
          connect: post.tags.map((name) => ({
            name,
          })),
        },
      },
    });

  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
