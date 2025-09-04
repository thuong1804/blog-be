import fs from "fs";
import path from "path";
import { v2 as cloudinary } from "cloudinary";

export const getTemplate = (fileName, replacements = {}, folder) => {
  let templatePath = path.join(process.cwd(), folder, fileName);
  let template = fs.readFileSync(templatePath, "utf8");

  Object.keys(replacements).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, "g");
    template = template.replace(regex, replacements[key]);
  });

  return template;
};

export const deleteImage = async (publicId) => {
  const result = await cloudinary.uploader.destroy(publicId, { invalidate: true });
  return { result: result.result };
}