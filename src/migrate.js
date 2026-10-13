import fs from "node:fs";
import path from "node:path";
import { rewriteLegacyVariables, unmappedLegacyNames } from "./names.js";

const SKIP_DIRS = new Set(["node_modules", "target", "dist", ".git", ".tmp"]);
const TEXT_EXTENSIONS = new Set([".css", ".html", ".rs", ".js", ".mjs", ".md"]);

/**
 * Rename `--ft-*` variables that have a kept token. Names with no kept
 * token stay as they are and are listed. Does not move folders or configs.
 */
export function migrateFtNames(cwd) {
  const rewritten = rewritePrefixInTree(cwd);
  const notes = [
    rewritten.files.length
      ? `renamed --ft- variables that have a kept token in ${rewritten.files.join(", ")}`
      : "no --ft- references found",
  ];
  if (rewritten.leftoverNames.length) {
    notes.push(
      `left these --ft- names unchanged (no kept token): ${rewritten.leftoverNames.join(", ")}`,
    );
  }
  return notes;
}

function rewritePrefixInTree(cwd) {
  const files = [];
  const leftoverNames = new Set();
  const visit = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      if (ent.name.startsWith(".")) continue;
      if (SKIP_DIRS.has(ent.name)) continue;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        visit(full);
        continue;
      }
      if (!TEXT_EXTENSIONS.has(path.extname(ent.name))) continue;
      const text = fs.readFileSync(full, "utf8");
      if (!text.includes("--ft-")) continue;
      const next = rewriteLegacyVariables(text);
      if (next !== text) {
        fs.writeFileSync(full, next);
        files.push(path.relative(cwd, full).split(path.sep).join("/"));
      }
      for (const name of unmappedLegacyNames(next)) leftoverNames.add(name);
    }
  };
  visit(cwd);
  return { files, leftoverNames: [...leftoverNames].sort() };
}
