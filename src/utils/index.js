import fs from "fs";
import path from "path";

export const getTemplate = (fileName, replacements = {}, folder) => {
  let templatePath = path.join(process.cwd(), folder, fileName);
  let template = fs.readFileSync(templatePath, "utf8");

  Object.keys(replacements).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, "g");
    template = template.replace(regex, replacements[key]);
  });

  return template;
};