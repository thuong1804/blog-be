import fs from "fs";
import path from "path";
import { v2 as cloudinary } from "cloudinary";

export const getTemplate = (fileName, replacements = {}, folder) => {
    let templatePath = path.join(process.cwd(), folder, fileName);
    let template = fs.readFileSync(templatePath, "utf8");

    Object.keys(replacements).forEach((key) => {
        const regex = new RegExp(`{{${key}}}`, "g");
        template = template.replace(regex, replacements[key]);
    });

    return template;
};

export const deleteImage = async (publicId) => {
    const result = await cloudinary.uploader.destroy(publicId, {
        invalidate: true,
    });
    return { result: result.result };
};

export const formatSlug = (slug) => {
    return slug.toLowerCase().replace(/&/g, "and").replace(/\s+/g, "-");
};

const WORDS_PER_MINUTE = 200;

/** Estimate reading time in minutes from markdown content (min 1). */
export const estimateReadingTime = (markdown) => {
    if (typeof markdown !== "string" || !markdown.trim()) return 1;
    const text = markdown
        .replace(/```[\s\S]*?```/g, " ") // fenced code blocks
        .replace(/`[^`]*`/g, " ") // inline code
        .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // images
        .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // link text
        .replace(/<[^>]*>/g, " ") // html tags
        .replace(/[#>*_~+\-|]/g, " ") // markdown punctuation
        .replace(/\s+/g, " ")
        .trim();
    if (!text) return 1;
    return Math.max(1, Math.ceil(text.split(" ").length / WORDS_PER_MINUTE));
};

export const checkRequiredField = ({ ...requiredFields }) => {
    for (const [key, value] of Object.entries(requiredFields)) {
        if (value === null || value === undefined || value === "") {
            throw new Error(`Field "${key}" is required!`);
        }
    }
};
