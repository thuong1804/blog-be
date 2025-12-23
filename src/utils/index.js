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

export const checkRequiredField = ({ ...requiredFields }) => {
    for (const [key, value] of Object.entries(requiredFields)) {
        if (value === null || value === undefined || value === "") {
            throw new Error(`Field "${key}" is required!`);
        }
    }
};
