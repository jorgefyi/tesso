import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const NOT_FOUND = "That path is not a docs page.";

export function splitNotFound(html) {
  const pattern =
    /[ \t]*<section\b[^>]*\bdata-page=(["'])missing\1[^>]*>[\s\S]*?<\/section>\n?/;
  if (!pattern.test(html)) {
    throw new Error('data-page="missing" section not found');
  }
  const index = html.replace(pattern, "");
  if (index.includes(NOT_FOUND)) {
    throw new Error("not-found copy remains in index.html");
  }
  if (!html.includes(NOT_FOUND)) {
    throw new Error("not-found copy is missing from the full page");
  }
  return { index, notFound: html };
}

function main() {
  const siteDir = path.dirname(fileURLToPath(import.meta.url));
  const dist = path.join(siteDir, "dist");
  const indexPath = path.join(dist, "index.html");
  const html = fs.readFileSync(indexPath, "utf8");
  const { index, notFound } = splitNotFound(html);
  fs.writeFileSync(path.join(dist, "404.html"), notFound);
  fs.writeFileSync(indexPath, index);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
