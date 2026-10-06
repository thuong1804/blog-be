#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import slugify from "slugify";
import "dotenv/config";

const prisma = new PrismaClient();

// Helper: convert string to URL-safe slug
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

// Helper: calculate estimated reading time
function calculateReadingTime(text) {
    const words = text.trim().split(/\s+/).length;
    const wordsPerMinute = 200;
    return Math.max(1, Math.ceil(words / wordsPerMinute));
}

// Helper: parse CLI arguments (--key="value" or --flag)
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

// Helper: Extract frontmatter & metadata from Markdown file
function parseMarkdownFile(fileContent) {
    let metadata = {};
    let content = fileContent;

    // 1. Check YAML frontmatter (--- ... ---)
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

    // 2. Find title if not present: get the first # Heading 1 line
    if (!metadata.title) {
        const headingMatch = content.match(/^#\s+(.+)$/m);
        if (headingMatch) {
            metadata.title = headingMatch[1].trim();
        }
    }

    // 3. Find first image if not present: ![alt](url) or <img src="url">
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

    // 4. Find inline metadata formatted as **Key**: Value
    const inlineMetaRegex = /\*\*(Title|Slug|Category|Tags|Image|Author|Description|Excerpt)\*\*:\s*`?([^`\n\r]+)`?/gi;
    let match;
    while ((match = inlineMetaRegex.exec(content)) !== null) {
        const key = match[1].toLowerCase();
        if (!metadata[key]) {
            metadata[key] = match[2].trim();
        }
    }

    // 5. Find description/excerpt if not present
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

        const firstPara = cleanParagraphs[0] || "Newly created post.";
        const summary = firstPara.length > 160 ? firstPara.slice(0, 157) + "..." : firstPara;

        if (!metadata.description) metadata.description = summary;
        if (!metadata.excerpt) metadata.excerpt = summary;
    }

    return { metadata, content };
}

// Process creating a post from file
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
        console.error(`❌ File not found: ${filePath}`);
        return false;
    }

    const fileContent = fs.readFileSync(resolvedPath, "utf-8");
    const { metadata: fileMeta, content: parsedContent } = parseMarkdownFile(fileContent);

    // Use filename as fallback slug if no title
    const fileBaseName = path.basename(resolvedPath).replace(/\.(md|markdown)$/i, "");

    const title = options.title || fileMeta.title || fileBaseName;
    const slug = options.slug || fileMeta.slug || generateSlug(title || fileBaseName);
    const content = parsedContent || options.content || "";
    const description = options.desc || fileMeta.description || "Post description";
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
                description: `Category ${categoryName}`,
            },
        });
        console.log(`📁 Created new Category: "${category.name}"`);
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
            console.log(`🏷️  Created new Tag: "${tag.name}"`);
        }
        tagConnections.push({ id: tag.id });
    }

    // 4. Check existence
    const existingPost = await prisma.post.findUnique({
        where: { slug },
    });

    const readingTime = calculateReadingTime(content);
    let post;

    if (existingPost) {
        if (!isUpsert) {
            console.log(`⏭️  Post "${slug}" already exists in DB (ID: #${existingPost.id}).`);
            console.log(`✨ View at     : http://localhost:3000/post/${existingPost.slug}`);
            console.log(`💡 (Tip: Use --upsert flag if you want to update content)\n`);
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
        console.log(`🔄 [UPDATE SUCCESS] Updated post ID: #${post.id}`);
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
        console.log(`🎉 [CREATE SUCCESS] Created post ID: #${post.id}`);
    }

    console.log(`--------------------------------------------------`);
    console.log(`📌 Title        : ${post.title}`);
    console.log(`🔗 Slug         : ${post.slug}`);
    console.log(`📂 Category     : ${post.category?.name}`);
    console.log(`🏷️  Tags         : ${post.tags?.map((t) => t.name).join(", ") || "(Empty)"}`);
    console.log(`⏱️  Reading time: ~${post.readingTime} min`);
    console.log(`✨ View at      : http://localhost:3000/post/${post.slug}`);
    console.log(`--------------------------------------------------\n`);

    return post;
}

async function main() {
    const rawArgs = process.argv.slice(2);
    const parsedArgs = parseArgs(rawArgs);

    // If --all or --sync flag: Scan all files in public/markdown/
    if (parsedArgs.all || parsedArgs.sync) {
        const mdDir = path.resolve(process.cwd(), "public", "markdown");
        if (!fs.existsSync(mdDir)) {
            console.error(`❌ Directory ${mdDir} does not exist.`);
            process.exit(1);
        }

        const files = fs.readdirSync(mdDir).filter((f) => /\.(md|markdown)$/i.test(f));
        console.log(`🔍 Found ${files.length} files in ${mdDir}...\n`);

        for (const file of files) {
            console.log(`📄 Processing: ${file}`);
            await processSingleFile(file, parsedArgs);
        }

        console.log(`✅ Finished syncing all markdown files!`);
        return;
    }

    if (parsedArgs._.length === 0 && !parsedArgs.title) {
        console.log(`
🚀 QUICK CREATE POST CLI
==============================================
Usage:
  node scripts/create-post.js <file_name_or_path> [options]

Example when adding a new file to public/markdown/:
  node scripts/create-post.js new_file.md
  node scripts/create-post.js new_file.md --category="Python" --tags="Python,AI"
  node scripts/create-post.js new_file.md --upsert

Or automatically scan all new files in public/markdown/:
  node scripts/create-post.js --all
  node scripts/create-post.js --all --upsert

Options:
  --title="..."         Override title
  --slug="..."          Override slug
  --category="..."      Category name (auto-create if absent)
  --tags="..."          Tags list (e.g., "Python,AI")
  --image="..."         Featured image URL
  --author="..."        Author email
  --desc="..."          Short description
  --upsert              Overwrite if post already exists
  --all                 Scan and create all markdown files in public/markdown/
        `);
        process.exit(0);
    }

    const filePath = parsedArgs._[0];
    await processSingleFile(filePath, parsedArgs);
}

main()
    .catch((error) => {
        console.error("❌ Execution error:", error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
