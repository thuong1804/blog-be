import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

async function main() {
  // 1. Tạo author
  const author = await prisma.user.upsert({
    where: { email: 'techwriter@example.com' },
    update: {},
    create: {
      name: 'Tech Writer',
      email: 'techwriter@example.com',
    },
  });
  console.log(author)

  // 2. Tạo tags
  const tagNames = ['AI', 'VR', 'Blockchain', 'Cloud', 'DevOps', 'Cybersecurity'];
  await Promise.all(
    tagNames.map((name) =>
      prisma.tag.upsert({
        where: { name },
        update: {},
        create: { name },
      })
    )
  );

  const categoriesData = [
    {
      name: 'Programming',
      description: 'All things about programming languages and concepts.',
      children: [
        { name: 'JavaScript', description: 'Scripting language for the web.' },
        { name: 'TypeScript', description: 'Typed superset of JavaScript.' },
        { name: 'Python', description: 'High-level language for automation and data.' },
      ],
    },
    {
      name: 'Emerging Tech',
      description: 'New and disruptive technologies.',
      children: [
        { name: 'Artificial Intelligence', description: 'The simulation of human intelligence by machines.' },
        { name: 'Virtual Reality', description: 'Immersive digital environments.' },
        { name: 'Blockchain', description: 'Decentralized digital ledger technology.' },
      ],
    },
    {
      name: 'Infrastructure',
      description: 'Everything about dev infrastructure and deployment.',
      children: [
        { name: 'Cloud', description: 'Modern cloud computing solutions.' },
        { name: 'DevOps', description: 'Continuous delivery & collaboration practices.' },
        { name: 'Kubernetes', description: 'Container orchestration system.' },
      ],
    },
    {
      name: 'AI & Data',
      description: 'Topics covering artificial intelligence and data processing.',
      children: [
        { name: 'Machine Learning', description: 'Algorithms that learn from data.' },
        { name: 'Deep Learning', description: 'Neural networks and advanced models.' },
        { name: 'Data Science', description: 'Extracting insights from data.' },
      ],
    },
    {
      name: 'Web Development',
      description: 'Building modern websites and web applications.',
      children: [
        { name: 'Frontend', description: 'UI/UX and browser-based development.' },
        { name: 'Backend', description: 'Server-side logic and database interaction.' },
        { name: 'Fullstack', description: 'Combining both frontend and backend skills.' },
      ],
    },
    {
      name: 'Cybersecurity',
      description: 'Protecting systems and data from threats.',
      children: [
        { name: 'Network Security', description: 'Securing communication channels.' },
        { name: 'Application Security', description: 'Securing software and code.' },
        { name: 'Ethical Hacking', description: 'Simulated attacks to find weaknesses.' },
      ],
    },
  ];

  for (const parent of categoriesData) {
    const createdParent = await prisma.category.upsert({
      where: { name: parent.name },
      update: { description: parent.description },
      create: {
        name: parent.name,
        description: parent.description,
      },
    });

    for (const child of parent.children) {
      await prisma.category.upsert({
        where: { name: child.name },
        update: { description: child.description },
        create: {
          name: child.name,
          description: child.description,
          parentId: createdParent.id,
        },
      });
    }
  }

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

  const commentTemplates = [
    'Amazing insights. I learned something new!',
    'Could you go deeper on this topic?',
    'Thanks for the explanation, really helpful.',
    'Nice article! Keep up the great work.',
    'Interesting take. Would love more examples.',
    'This clarified a lot of things for me.',
    'Looking forward to more posts like this.',
    'Great read. Helped me understand better.',
  ];

  function getRandomComments(authorId) {
    const shuffled = [...commentTemplates].sort(() => 0.5 - Math.random());
    const count = Math.floor(Math.random() * 3) + 2; // 2 to 4 comments
    return shuffled.slice(0, count).map((content) => ({
      content,
      authorId,
    }));
  }

  for (const post of postsData) {
    const category = await prisma.category.findUnique({
      where: { name: post.category },
    });

    if (!category) {
      throw new Error(`Category not found: ${post.category}`);
    }

    const createdPost = await prisma.post.create({
      data: {
        title: post.title,
        slug: post.slug,
        content: post.content,
        description: post.description,
        excerpt: post.excerpt,
        image: post.image,
        category: {
          connect: {
            name: post.category,
          },
        },
        isFeatured: false,
        views: Math.floor(Math.random() * 1000),
        readingTime: Math.floor(Math.random() * 5) + 3,
        author: {
          connect: { id: author.id },
        },
        tags: {
          connect: post.tags.map((name) => ({ name })),
        },
        comments: {
          create: getRandomComments(author.id),
        },
      },
    });

    console.log(`✅ Created post: ${createdPost.title}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
