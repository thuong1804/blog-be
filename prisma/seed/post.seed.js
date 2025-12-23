// seedPosts.ts
import fs from "fs";
import path from "path";

import { PrismaClient } from "@prisma/client";
import { seedCategories } from "./categories.seed.js";

const prisma = new PrismaClient();

const postsData = [
    {
        title: "Blockchain Security",
        slug: "blockchain-security",
        content: "",
        description: "Security essentials for blockchain technology.",
        excerpt: "Learn to secure blockchain systems.",
        image: "https://res.cloudinary.com/deq5l7fn1/image/upload/v1749795622/blockchain_p4gfjy.jpg",
        category: "Blockchain",
        tags: ["Blockchain", "Security"],
    },
    {
        title: "Introduction to Cloud Computing",
        slug: "intro-cloud-computing",
        content: "",
        description: "A beginner’s guide to cloud computing concepts.",
        excerpt: "Discover the fundamentals of cloud computing.",
        image: "https://res.cloudinary.com/deq5l7fn1/image/upload/v1749795269/cloud_hflujv.png",
        category: "Cloud",
        tags: ["Cloud", "IaaS", "PaaS", "SaaS"],
    },
    {
        title: "DevOps Best Practices",
        slug: "devops-best-practices",
        content: "",
        description: "Best practices for implementing DevOps.",
        excerpt: "Learn how to optimize DevOps processes.",
        image: "https://res.cloudinary.com/deq5l7fn1/image/upload/v1750234429/devops_drxz81.jpg",
        category: "DevOps",
        tags: ["DevOps", "CI/CD"],
    },
    {
        title: "Scaling with Kubernetes",
        slug: "scaling-kubernetes",
        content: "",
        description: "Guide to scaling applications with Kubernetes.",
        excerpt: "Scale efficiently with Kubernetes.",
        image: "https://res.cloudinary.com/deq5l7fn1/image/upload/v1750234616/what-is-kubernetes_ejpsjg.png",
        category: "Kubernetes",
        tags: ["Kubernetes", "Containers"],
    },
    {
        title: "Machine Learning Fundamentals",
        slug: "machine-learning-fundamentals",
        content: "",
        description: "An introduction to machine learning concepts.",
        excerpt: "Learn the basics of machine learning.",
        image: "https://res.cloudinary.com/deq5l7fn1/image/upload/v1750234674/mar_h7ebym.jpg",
        category: "Machine Learning",
        tags: ["Machine Learning", "AI"],
    },
    {
        title: "Deep Learning with Neural Networks",
        slug: "deep-learning-neural-networks",
        content: "",
        description: "Guide to building neural networks for deep learning.",
        excerpt: "Master deep learning fundamentals.",
        image: "https://res.cloudinary.com/deq5l7fn1/image/upload/v1750234720/neu_ycxzik.png",
        category: "Deep Learning",
        tags: ["Deep Learning", "Neural Networks", "AI"],
    },
    {
        title: "Data Science with Python",
        slug: "data-science-python",
        content: "",
        description: "A beginner’s guide to data science with Python.",
        excerpt: "Explore data science using Python tools.",
        image: "https://res.cloudinary.com/deq5l7fn1/image/upload/v1750234769/python-la-gi-1_cibk9b.jpg",
        category: "Data Science",
        tags: ["Data Science", "Python"],
    },
    {
        title: "Building Responsive UIs with Frontend",
        slug: "responsive-ui-frontend",
        content: "",
        description: "Guide to building responsive frontend interfaces.",
        excerpt: "Learn responsive UI design.",
        image: "https://res.cloudinary.com/deq5l7fn1/image/upload/v1750234804/front-end_klbf97.png",
        category: "Frontend",
        tags: ["Frontend", "UI/UX"],
    },
    {
        title: "Backend Development with Node.js",
        slug: "backend-nodejs",
        content: "",
        description: "Introduction to backend development with Node.js.",
        excerpt: "Create scalable backends with Node.js.",
        image: "https://res.cloudinary.com/deq5l7fn1/image/upload/v1750234840/39-backend_zczpe6.jpg",
        category: "Backend",
        tags: ["Backend", "Node.js"],
    },
    {
        title: "Fullstack Development Guide",
        slug: "fullstack-development",
        content: "",
        description: "A guide to fullstack web development.",
        excerpt: "Master both frontend and backend.",
        image: "https://res.cloudinary.com/deq5l7fn1/image/upload/v1750234876/full_fspyad.jpg",
        category: "Fullstack",
        tags: ["Fullstack", "Web Development"],
    },
    {
        title: "Network Security Essentials",
        slug: "network-security-essentials",
        content: "",
        description: "Introduction to network security principles.",
        excerpt: "Learn to secure communication networks.",
        image: "https://res.cloudinary.com/deq5l7fn1/image/upload/v1750234958/net_tsjihf.png",
        category: "Network Security",
        tags: ["Network Security", "Cybersecurity"],
    },
    {
        title: "Application Security Best Practices",
        slug: "app-security-practices",
        content: "",
        description: "Guide to securing software applications.",
        excerpt: "Best practices for application security.",
        image: "https://res.cloudinary.com/deq5l7fn1/image/upload/v1750235077/best_jijdle.jpg",
        category: "Application Security",
        tags: ["Application Security", "Cybersecurity"],
    },
    {
        title: "Ethical Hacking Techniques",
        slug: "ethical-hacking-techniques",
        content: "",
        description: "Introduction to ethical hacking techniques.",
        excerpt: "Master ethical hacking for security.",
        image: "https://res.cloudinary.com/deq5l7fn1/image/upload/v1750235158/hack_zrhupm.jpg",
        category: "Ethical Hacking",
        tags: ["Ethical Hacking", "Cybersecurity"],
    },
];

function getMarkdownContentBySlug(slug) {
    const markdownPath = path.join(process.cwd(), "public", "markdown");
    const files = fs.readdirSync(markdownPath);

    const file = files.find((f) => {
        const name = f.replace(/\.markdown$/, "").toLowerCase();
        return name === slug.toLowerCase();
    });

    if (!file) {
        console.warn(`⚠️ No markdown file found for slug: ${slug}`);
        return "";
    }

    return fs.readFileSync(path.join(markdownPath, file), "utf-8");
}

const commentTemplates = [
    "Amazing insights. I learned something new!",
    "Could you go deeper on this topic?",
    "Thanks for the explanation, really helpful.",
    "Nice article! Keep up the great work.",
    "Interesting take. Would love more examples.",
    "This clarified a lot of things for me.",
    "Looking forward to more posts like this.",
    "Great read. Helped me understand better.",
];

function getRandomComments(authorId) {
    const shuffled = [...commentTemplates].sort(() => 0.5 - Math.random());
    const count = Math.floor(Math.random() * 3) + 2;
    return shuffled.slice(0, count).map((content) => ({ content, authorId }));
}

async function seedUsers() {
    const user = await prisma.user.upsert({
        where: { email: "author@example.com" },
        update: {},
        create: {
            name: "Default Author",
            email: "author@example.com",
        },
    });
    console.log(`✅ Seeded user: ${user.name}`);
    return user;
}

async function seedTags() {
    const tags = [
        "JavaScript",
        "TypeScript",
        "Python",
        "AI",
        "Ethics",
        "VR",
        "Design",
        "Blockchain",
        "Security",
        "Cloud",
        "IaaS",
        "PaaS",
        "SaaS",
        "DevOps",
        "CI/CD",
        "Kubernetes",
        "Containers",
        "Machine Learning",
        "Neural Networks",
        "Data Science",
        "Frontend",
        "UI/UX",
        "Backend",
        "Node.js",
        "Fullstack",
        "Web Development",
        "Network Security",
        "Cybersecurity",
        "Application Security",
        "Ethical Hacking",
        "Deep Learning",
    ];
    for (const tag of tags) {
        const existingTag = await prisma.tag.findUnique({
            where: { name: tag },
        });
        if (existingTag) {
            console.log(`Tag already exists: ${tag}`);
        } else {
            await prisma.tag.create({
                data: { name: tag },
            });
            console.log(`✅ Created tag: ${tag}`);
        }
    }
}

export async function seedPosts() {
    await seedCategories();
    const author = await seedUsers();
    await seedTags();

    for (const post of postsData) {
        const content = getMarkdownContentBySlug(post.slug);

        const category = await prisma.category.findUnique({
            where: { name: post.category },
        });

        if (!category) {
            throw new Error(
                `❌ Category not found: ${post.category} (in post: ${post.title})`,
            );
        }

        // Verify that all tags exist before creating the post
        for (const tagName of post.tags) {
            const tag = await prisma.tag.findUnique({
                where: { name: tagName },
            });
            if (!tag) {
                console.error(`Tag not found: ${tagName}`);
                throw new Error(`Tag not found: ${tagName}`);
            }
        }

        const createdPost = await prisma.post.create({
            data: {
                title: post.title,
                slug: post.slug,
                content: content,
                description: post.description,
                excerpt: post.excerpt,
                image: post.image,
                category: {
                    connect: { id: category.id },
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
