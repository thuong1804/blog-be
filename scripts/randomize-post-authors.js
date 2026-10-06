import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient();

// Target User IDs list: [1, 2, 3, 9, 10, 11, 12]
const TARGET_USER_IDS = [1, 2, 3, 9, 10, 11, 12];

async function main() {
    console.log("🔍 Checking Users in database...");

    const users = await prisma.user.findMany({
        where: { id: { in: TARGET_USER_IDS } },
        select: { id: true, name: true, email: true },
    });

    console.log(`✅ Found ${users.length} matching users:`);
    users.forEach((u) => console.log(`   - ID: ${u.id} | ${u.name || "(No name)"} (${u.email})`));

    const validUserIds = users.map((u) => u.id);
    if (validUserIds.length === 0) {
        console.error("❌ No users found matching the ID list!");
        process.exit(1);
    }

    const posts = await prisma.post.findMany({
        select: { id: true, title: true, authorId: true },
    });

    console.log(`\n📚 Randomly assigning authors to ${posts.length} posts...`);

    let updatedCount = 0;
    for (const post of posts) {
        // Pick a random ID from valid list
        const randomAuthorId = validUserIds[Math.floor(Math.random() * validUserIds.length)];

        await prisma.post.update({
            where: { id: post.id },
            data: { authorId: randomAuthorId },
        });

        updatedCount++;
    }

    console.log(`\n🎉 UPDATE COMPLETED: Randomly assigned authors to ${updatedCount} posts!`);

    // Post distribution statistics by user
    const stats = await prisma.post.groupBy({
        by: ["authorId"],
        _count: { id: true },
    });

    console.log("\n📊 Post statistics by User ID:");
    stats.forEach((s) => {
        const u = users.find((user) => user.id === s.authorId);
        console.log(`   - User #${s.authorId} (${u?.name || u?.email || "Unknown"}): ${s._count.id} posts`);
    });
}

main()
    .catch((err) => {
        console.error("❌ Error:", err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
