import * as fs from "node:fs";
import * as path from "node:path";

const TEMPLATE_DIR = path.join(process.cwd(), "src", "public");
const PARTIALS_DIR = path.join(TEMPLATE_DIR, "partials");

export function assembleHtml(): string {
  const templatePath = path.join(TEMPLATE_DIR, "index.template.html");
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: ${templatePath}`);
  }

  let html = fs.readFileSync(templatePath, "utf-8");

  // Regex to match <!-- @include "relative/path.html" -->
  const includeRegex = /<!--\s*@include\s*["']([^"']+)["']\s*-->/g;

  html = html.replace(includeRegex, (_match, includePath) => {
    const fullPath = path.join(TEMPLATE_DIR, includePath);
    if (!fs.existsSync(fullPath)) {
      console.warn(`[HTML Builder] Included file not found: ${fullPath}`);
      return `<!-- Missing include: ${includePath} -->`;
    }
    return fs.readFileSync(fullPath, "utf-8");
  });

  return html;
}

export function buildHtmlFile(): void {
  const assembled = assembleHtml();
  const outPath = path.join(TEMPLATE_DIR, "index.html");
  fs.writeFileSync(outPath, assembled, "utf-8");
  console.log(`✅ Built modular index.html (${(assembled.length / 1024).toFixed(1)} KB)`);
}

if (import.meta.main) {
  buildHtmlFile();
}
