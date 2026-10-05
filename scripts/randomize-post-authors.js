import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient();

// Danh sách User IDs từ hình ảnh Prisma Studio của người dùng: [1, 2, 3, 9, 10, 11, 12]
const TARGET_USER_IDS = [1, 2, 3, 9, 10, 11, 12];

async function main() {
    console.log("🔍 Đang kiểm tra danh sách Users trong database...");

    const users = await prisma.user.findMany({
        where: { id: { in: TARGET_USER_IDS } },
        select: { id: true, name: true, email: true },
    });

    console.log(`✅ Tìm thấy ${users.length} users tương ứng:`);
    users.forEach((u) => console.log(`   - ID: ${u.id} | ${u.name || "(Chưa có tên)"} (${u.email})`));

    const validUserIds = users.map((u) => u.id);
    if (validUserIds.length === 0) {
        console.error("❌ Không tìm thấy user nào khớp với danh sách ID!");
        process.exit(1);
    }

    const posts = await prisma.post.findMany({
        select: { id: true, title: true, authorId: true },
    });

    console.log(`\n📚 Đang cập nhật ngẫu nhiên tác giả cho ${posts.length} bài viết...`);

    let updatedCount = 0;
    for (const post of posts) {
        // Chọn ngẫu nhiên 1 ID từ danh sách hợp lệ
        const randomAuthorId = validUserIds[Math.floor(Math.random() * validUserIds.length)];

        await prisma.post.update({
            where: { id: post.id },
            data: { authorId: randomAuthorId },
        });

        updatedCount++;
    }

    console.log(`\n🎉 CẬP NHẬT HOÀN TẤT: Đã gán ngẫu nhiên tác giả cho ${updatedCount} bài viết!`);

    // Thống kê phân bổ bài viết theo từng user
    const stats = await prisma.post.groupBy({
        by: ["authorId"],
        _count: { id: true },
    });

    console.log("\n📊 Thống kê số bài viết theo từng User ID:");
    stats.forEach((s) => {
        const u = users.find((user) => user.id === s.authorId);
        console.log(`   - User #${s.authorId} (${u?.name || u?.email || "Unknown"}): ${s._count.id} bài viết`);
    });
}

main()
    .catch((err) => {
        console.error("❌ Lỗi:", err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
