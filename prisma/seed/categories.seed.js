import { PrismaClient } from "@prisma/client";
import slugify from "slugify";

const prisma = new PrismaClient();

const categoriesData = [
    {
        name: "Programming",
        description: "All things about programming.",
        parentName: null,
    },
    {
        name: "JavaScript",
        description: "Scripting language for web.",
        parentName: "Programming",
    },
    {
        name: "TypeScript",
        description: "Typed superset of JavaScript.",
        parentName: "Programming",
    },
    {
        name: "Python",
        description: "High-level language for general-purpose.",
        parentName: "Programming",
    },
    {
        name: "Emerging Tech",
        description: "New and disruptive technologies.",
        parentName: null,
    },
    {
        name: "Artificial Intelligence",
        description: "The simulation of human intelligence.",
        parentName: "Emerging Tech",
    },
    {
        name: "Virtual Reality",
        description: "Immersive digital environments.",
        parentName: "Emerging Tech",
    },
    {
        name: "Blockchain",
        description: "Decentralized digital ledger.",
        parentName: "Emerging Tech",
    },
    {
        name: "Infrastructure",
        description: "Everything about dev infrastructure.",
        parentName: null,
    },
    {
        name: "Cloud",
        description: "Modern cloud computing essentials.",
        parentName: "Infrastructure",
    },
    {
        name: "DevOps",
        description: "Continuous delivery and integration.",
        parentName: "Infrastructure",
    },
    {
        name: "Kubernetes",
        description: "Container orchestration platform.",
        parentName: "Infrastructure",
    },
    {
        name: "AI & Data",
        description: "Topics covering artificial intelligence.",
        parentName: null,
    },
    {
        name: "Machine Learning",
        description: "Algorithms that learn from data.",
        parentName: "AI & Data",
    },
    {
        name: "Deep Learning",
        description: "Neural networks and advanced ML.",
        parentName: "AI & Data",
    },
    {
        name: "Data Science",
        description: "Extracting insights from data.",
        parentName: "AI & Data",
    },
    {
        name: "Web Development",
        description: "Building modern websites.",
        parentName: null,
    },
    {
        name: "Frontend",
        description: "UI/UX and browser-based development.",
        parentName: "Web Development",
    },
    {
        name: "Backend",
        description: "Server-side logic and databases.",
        parentName: "Web Development",
    },
    {
        name: "Fullstack",
        description: "Combining both frontend and backend.",
        parentName: "Web Development",
    },
    {
        name: "Cybersecurity",
        description: "Protecting systems and networks.",
        parentName: null,
    },
    {
        name: "Network Security",
        description: "Securing communication networks.",
        parentName: "Cybersecurity",
    },
    {
        name: "Application Security",
        description: "Securing software and apps.",
        parentName: "Cybersecurity",
    },
    {
        name: "Ethical Hacking",
        description: "Simulated attacks to find vulnerabilities.",
        parentName: "Cybersecurity",
    },
];

export async function seedCategories() {
    for (const category of categoriesData.filter((c) => !c.parentName)) {
        await prisma.category.upsert({
            where: { name: category.name },
            update: {},
            create: {
                name: category.name,
                slug: slugify(category.name, { lower: true }),
                description: category.description,
            },
        });
        console.log(`✅ Seeded category: ${category.name}`);
    }

    for (const category of categoriesData.filter((c) => c.parentName)) {
        const parent = await prisma.category.findUnique({
            where: { name: category.parentName },
        });

        if (!parent) {
            throw new Error(
                `Parent category not found: ${category.parentName}`,
            );
        }

        await prisma.category.upsert({
            where: { name: category.name },
            update: {},
            create: {
                name: category.name,
                slug: slugify(category.name, { lower: true }),
                description: category.description,
                parentId: parent.id,
            },
        });
        console.log(`✅ Seeded category: ${category.name}`);
    }
}
