#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import slugify from "slugify";
import "dotenv/config";

const prisma = new PrismaClient();

// Helper: chuyển chuỗi thành slug chuẩn tiếng Việt, an toàn URL
function generateSlug(text) {
    const cleanText = text
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "")
        .trim();

    return slugify(cleanText, {
        lower: true,
        strict: true,
        locale: "vi",
        trim: true,
    }) || `post-${Date.now()}`;
}

// Helper: tính thời gian đọc ước tính (reading time)
function calculateReadingTime(text) {
    const words = text.trim().split(/\s+/).length;
    const wordsPerMinute = 200;
    return Math.max(1, Math.ceil(words / wordsPerMinute));
}

// Helper: parse CLI arguments dạng --key="value" hoặc --flag
function parseArgs(args) {
    const result = { _: [] };
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg.startsWith("--")) {
            const match = arg.slice(2).match(/^([^=]+)(=(.*))?$/);
            if (match) {
                const key = match[1];
                const value = match[3] !== undefined ? match[3] : true;
                result[key] = value;
            }
        } else {
            result._.push(arg);
        }
    }
    return result;
}

// Helper: Trích xuất Frontmatter & metadata từ file Markdown
function parseMarkdownFile(fileContent) {
    let metadata = {};
    let content = fileContent;

    // 1. Kiểm tra Frontmatter dạng YAML (--- ... ---)
    const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
    const frontmatterMatch = fileContent.match(frontmatterRegex);

    if (frontmatterMatch) {
        const rawMeta = frontmatterMatch[1];
        content = frontmatterMatch[2];

        rawMeta.split(/\r?\n/).forEach((line) => {
            const colonIdx = line.indexOf(":");
            if (colonIdx !== -1) {
                const key = line.slice(0, colonIdx).trim().toLowerCase();
                let val = line.slice(colonIdx + 1).trim();
                val = val.replace(/^["'](.*)["']$/, "$1");
                metadata[key] = val;
            }
        });
    }

    // 2. Tìm title nếu chưa có: lấy dòng # Heading 1 đầu tiên
    if (!metadata.title) {
        const headingMatch = content.match(/^#\s+(.+)$/m);
        if (headingMatch) {
            metadata.title = headingMatch[1].trim();
        }
    }

    // 3. Tìm ảnh đầu tiên nếu chưa có: ![alt](url) hoặc <img src="url">
    if (!metadata.image) {
        const imgMdMatch = content.match(/!\[.*?\]\((https?:\/\/[^\s\)]+)\)/);
        if (imgMdMatch) {
            metadata.image = imgMdMatch[1];
        } else {
            const imgHtmlMatch = content.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/i);
            if (imgHtmlMatch) {
                metadata.image = imgHtmlMatch[1];
            }
        }
    }

    // 4. Tìm metadata inline dạng **Key**: Value
    const inlineMetaRegex = /\*\*(Title|Slug|Category|Tags|Image|Author|Description|Excerpt)\*\*:\s*`?([^`\n\r]+)`?/gi;
    let match;
    while ((match = inlineMetaRegex.exec(content)) !== null) {
        const key = match[1].toLowerCase();
        if (!metadata[key]) {
            metadata[key] = match[2].trim();
        }
    }

    // 5. Tìm đoạn mô tả (description/excerpt) nếu chưa có
    if (!metadata.description || !metadata.excerpt) {
        const cleanParagraphs = content
            .replace(/^#+.*$/gm, "")
            .replace(/!\[.*?\]\(.*?\)/g, "")
            .replace(/\[.*?\]\(.*?\)/g, "")
            .replace(/```[\s\S]*?```/g, "")
            .replace(/[*_`#>-]/g, "")
            .split(/\r?\n\r?\n/)
            .map((p) => p.trim())
            .filter((p) => p.length > 20);

        const firstPara = cleanParagraphs[0] || "Bài viết mới được tạo.";
        const summary = firstPara.length > 160 ? firstPara.slice(0, 157) + "..." : firstPara;

        if (!metadata.description) metadata.description = summary;
        if (!metadata.excerpt) metadata.excerpt = summary;
    }

    return { metadata, content };
}

// Xử lý tạo 1 bài viết từ file
async function processSingleFile(filePath, options = {}) {
    let resolvedPath = path.isAbsolute(filePath)
        ? filePath
        : path.resolve(process.cwd(), filePath);

    if (!fs.existsSync(resolvedPath)) {
        const possiblePaths = [
            path.resolve(process.cwd(), "public", "markdown", filePath),
            path.resolve(process.cwd(), "public", "markdown", `${filePath}.md`),
            path.resolve(process.cwd(), "public", "markdown", `${filePath}.markdown`),
        ];
        const found = possiblePaths.find((p) => fs.existsSync(p));
        if (found) {
            resolvedPath = found;
        }
    }

    if (!fs.existsSync(resolvedPath)) {
        console.error(`❌ Không tìm thấy file: ${filePath}`);
        return false;
    }

    const fileContent = fs.readFileSync(resolvedPath, "utf-8");
    const { metadata: fileMeta, content: parsedContent } = parseMarkdownFile(fileContent);

    // Lấy tên file làm fallback slug nếu không có title
    const fileBaseName = path.basename(resolvedPath).replace(/\.(md|markdown)$/i, "");

    const title = options.title || fileMeta.title || fileBaseName;
    const slug = options.slug || fileMeta.slug || generateSlug(title || fileBaseName);
    const content = parsedContent || options.content || "";
    const description = options.desc || fileMeta.description || "Mô tả bài viết";
    const excerpt = options.excerpt || fileMeta.excerpt || description;
    const image =
        options.image ||
        fileMeta.image ||
        "https://res.cloudinary.com/deq5l7fn1/image/upload/v1750234769/python-la-gi-1_cibk9b.jpg";

    const isFeatured = options.featured !== undefined ? Boolean(options.featured) : (fileMeta.isfeatured === "true");
    const isPopular = options.popular !== undefined ? Boolean(options.popular) : (fileMeta.ispopular === "true");
    const isUpsert = Boolean(options.upsert);

    // 1. Author
    let author = null;
    if (options["author-id"]) {
        author = await prisma.user.findUnique({
            where: { id: parseInt(options["author-id"], 10) },
        });
    } else if (options.author || fileMeta.author) {
        const authorQuery = options.author || fileMeta.author;
        author = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: authorQuery },
                    { name: { contains: authorQuery, mode: "insensitive" } },
                ],
            },
        });
    }

    if (!author) {
        const availableUsers = await prisma.user.findMany({
            select: { id: true, name: true, email: true },
        });

        if (availableUsers.length > 0) {
            author = availableUsers[Math.floor(Math.random() * availableUsers.length)];
        } else {
            author = await prisma.user.create({
                data: {
                    email: "author@example.com",
                    name: "Admin Author",
                },
            });
        }
    }

    // 2. Category
    const categoryName = options.category || fileMeta.category || "General";
    const categorySlug = generateSlug(categoryName);

    let category = await prisma.category.findFirst({
        where: {
            OR: [
                { name: { equals: categoryName, mode: "insensitive" } },
                { slug: categorySlug },
            ],
        },
    });

    if (!category) {
        category = await prisma.category.create({
            data: {
                name: categoryName,
                slug: categorySlug,
                description: `Chuyên mục ${categoryName}`,
            },
        });
        console.log(`📁 Đã tự tạo Category mới: "${category.name}"`);
    }

    // 3. Tags
    const tagsInput = options.tags || fileMeta.tags || "";
    const tagNames = tagsInput
        ? tagsInput
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
        : [];

    const tagConnections = [];
    for (const tagName of tagNames) {
        let tag = await prisma.tag.findUnique({
            where: { name: tagName },
        });

        if (!tag) {
            tag = await prisma.tag.create({
                data: { name: tagName },
            });
            console.log(`🏷️  Đã tự tạo Tag mới: "${tag.name}"`);
        }
        tagConnections.push({ id: tag.id });
    }

    // 4. Kiểm tra tồn tại
    const existingPost = await prisma.post.findUnique({
        where: { slug },
    });

    const readingTime = calculateReadingTime(content);
    let post;

    if (existingPost) {
        if (!isUpsert) {
            console.log(`⏭️  Bài viết "${slug}" đã tồn tại trong DB (ID: #${existingPost.id}).`);
            console.log(`✨ Xem tại     : http://localhost:3000/post/${existingPost.slug}`);
            console.log(`💡 (Mẹo: Dùng cờ --upsert nếu bạn muốn cập nhật lại nội dung)\n`);
            return existingPost;
        }

        post = await prisma.post.update({
            where: { id: existingPost.id },
            data: {
                title,
                content,
                description,
                excerpt,
                image,
                readingTime,
                isFeatured,
                isPopular,
                categoryId: category.id,
                authorId: author.id,
                tags: {
                    set: tagConnections,
                },
            },
            include: { category: true, tags: true, author: true },
        });
        console.log(`🔄 [UPDATE THÀNH CÔNG] Đã cập nhật bài viết ID: #${post.id}`);
    } else {
        post = await prisma.post.create({
            data: {
                title,
                slug,
                content,
                description,
                excerpt,
                image,
                readingTime,
                isFeatured,
                isPopular,
                categoryId: category.id,
                authorId: author.id,
                tags: {
                    connect: tagConnections,
                },
            },
            include: { category: true, tags: true, author: true },
        });
        console.log(`🎉 [TẠO MỚI THÀNH CÔNG] Đã tạo bài viết ID: #${post.id}`);
    }

    console.log(`--------------------------------------------------`);
    console.log(`📌 Tiêu đề     : ${post.title}`);
    console.log(`🔗 Slug        : ${post.slug}`);
    console.log(`📂 Chuyên mục  : ${post.category?.name}`);
    console.log(`🏷️  Tags       : ${post.tags?.map((t) => t.name).join(", ") || "(Trống)"}`);
    console.log(`⏱️  Thời gian đọc: ~${post.readingTime} phút`);
    console.log(`✨ Xem tại     : http://localhost:3000/post/${post.slug}`);
    console.log(`--------------------------------------------------\n`);

    return post;
}

async function main() {
    const rawArgs = process.argv.slice(2);
    const parsedArgs = parseArgs(rawArgs);

    // Nếu truyền cờ --all hoặc --sync: Quét toàn bộ file trong public/markdown/
    if (parsedArgs.all || parsedArgs.sync) {
        const mdDir = path.resolve(process.cwd(), "public", "markdown");
        if (!fs.existsSync(mdDir)) {
            console.error(`❌ Thư mục ${mdDir} không tồn tại.`);
            process.exit(1);
        }

        const files = fs.readdirSync(mdDir).filter((f) => /\.(md|markdown)$/i.test(f));
        console.log(`🔍 Tìm thấy ${files.length} file trong ${mdDir}...\n`);

        for (const file of files) {
            console.log(`📄 Đang xử lý: ${file}`);
            await processSingleFile(file, parsedArgs);
        }

        console.log(`✅ Đã đồng bộ xong toàn bộ file markdown!`);
        return;
    }

    if (parsedArgs._.length === 0 && !parsedArgs.title) {
        console.log(`
🚀 CLI TẠO NHANH BÀI VIẾT (Quick Create Post)
==============================================
Sử dụng:
  node scripts/create-post.js <tên_file_hoặc_đường_dẫn> [options]

Ví dụ khi bạn mới thêm file vào public/markdown/:
  node scripts/create-post.js ten_file_moi.md
  node scripts/create-post.js ten_file_moi.md --category="Python" --tags="Python,AI"
  node scripts/create-post.js ten_file_moi.md --upsert

Hoặc tự động quét tất cả các file mới trong public/markdown/:
  node scripts/create-post.js --all
  node scripts/create-post.js --all --upsert

Options:
  --title="..."         Ghi đè tiêu đề
  --slug="..."          Ghi đè slug
  --category="..."      Tên danh mục (tự tạo nếu chưa có)
  --tags="..."          Danh sách tags (vd: "Python,AI")
  --image="..."         URL ảnh đại diện
  --author="..."        Email tác giả
  --desc="..."          Mô tả ngắn
  --upsert              Ghi đè nếu bài đã tồn tại
  --all                 Quét và tạo tất cả file markdown trong public/markdown/
        `);
        process.exit(0);
    }

    const filePath = parsedArgs._[0];
    await processSingleFile(filePath, parsedArgs);
}

main()
    .catch((error) => {
        console.error("❌ Lỗi khi thực hiện:", error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
