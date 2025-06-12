import pkg from '@prisma/client'
const { PrismaClient } = pkg
const prisma = new PrismaClient();

async function main() {

  await prisma.post.createMany({
    data: [
      {
        title: "Giới thiệu về Node.js",
        slug: "gioi-thieu-nodejs",
        content: "Nội dung chi tiết về Node.js...",
        description: "Tìm hiểu về Node.js và cách hoạt động của nó.",
        image: "https://placehold.co/600x400?text=Node.js",
        category: "Backend",
        authorId: 1,
      },
      {
        title: "Bắt đầu với PostgreSQL",
        slug: "bat-dau-postgresql",
        content: "Hướng dẫn cơ bản về PostgreSQL...",
        description: "Cài đặt và sử dụng PostgreSQL trong dự án thực tế.",
        image: "https://placehold.co/600x400?text=PostgreSQL",
        category: "Database",
        authorId: 1,
      },
      {
        title: "REST API với Express",
        slug: "rest-api-express",
        content: "Tạo REST API nhanh chóng với Express.js...",
        description: "Viết server API hiệu quả với Express.js.",
        image: "https://placehold.co/600x400?text=Express.js",
        category: "API",
        authorId: 1,
      },
    ],
  });
}

main()
  .then(() => {
    console.log("✅ Seed completed.");
    prisma.$disconnect();
  })
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
