import { PrismaClient } from "@prisma/client";
import { seedCategories } from "./seed/categories.seed.js";
import { seedPosts } from "./seed/post.seed.js";
import { seedTags } from "./seed/tags.seed.js";

const prisma = new PrismaClient();

async function main() {
    console.log("Starting seeding process...");
    await seedCategories();
    await seedTags();
    await seedPosts();
    console.log("Seeding completed!");
}

main()
    .catch((e) => {
        console.error("Seeding failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
