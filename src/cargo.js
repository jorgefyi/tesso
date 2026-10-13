import fs from "node:fs";
import path from "node:path";
import { ASSETS_TOML } from "./constants.js";

const SECTION = "[package.metadata.fusor]";

export function patchCargoToml(source) {
  const newline = source.includes("\r\n") ? "\r\n" : "\n";
  const text = source.replace(/\r\n/g, "\n");
  const lines = text.split("\n");
  const header = lines.findIndex((line) => line.trim() === SECTION);

  if (header === -1) {
    const block = ["", SECTION, ASSETS_TOML, ""].join("\n");
    const body = text.endsWith("\n") || text.length === 0 ? text : `${text}\n`;
    return {
      text: `${body}${block}`.replace(/\n/g, newline),
      notes: [`added ${SECTION}`],
    };
  }

  let end = lines.length;
  for (let i = header + 1; i < lines.length; i++) {
    if (/^\s*\[/.test(lines[i])) {
      end = i;
      break;
    }
  }
  const section = lines.slice(header + 1, end);
  const notes = [];

  const buildIndex = section.findIndex((line) => /^\s*assets-build\s*=/.test(line));
  if (buildIndex !== -1 && isRetiredAssetsBuild(section[buildIndex])) {
    section.splice(buildIndex, 1);
    notes.push("removed assets-build");
  }

  let insertAt = section.length;
  while (insertAt > 0 && section[insertAt - 1].trim() === "") insertAt--;
  const add = (line) => section.splice(insertAt++, 0, line);

  const assetsIndex = section.findIndex((line) => /^\s*assets\s*=/.test(line));
  if (assetsIndex === -1) {
    add(ASSETS_TOML);
    notes.push(`set ${ASSETS_TOML}`);
  } else if (/^\s*assets\s*=\s*"/.test(section[assetsIndex])) {
    notes.push(
      'kept assets as a directory string — Fusor 0.1.6 wants assets = { "/" = "public" }',
    );
  }

  const next = [...lines.slice(0, header + 1), ...section, ...lines.slice(end)];
  return { text: next.join("\n").replace(/\n/g, newline), notes };
}

/** `tesso build` no longer exists, so drop the hook init used to write. */
function isRetiredAssetsBuild(line) {
  const compact = line.replace(/\s+/g, "");
  return (
    compact === 'assets-build=["npx","tesso-ui","build"]' ||
    compact === 'assets-build=["npx","fusor-tokens","build"]'
  );
}

/** The `tailwind` path in `[package.metadata.fusor]`, or null when unset. */
export function readFusorTailwind(source) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const header = lines.findIndex((line) => line.trim() === SECTION);
  if (header === -1) return null;
  for (let i = header + 1; i < lines.length; i++) {
    if (/^\s*\[/.test(lines[i])) break;
    const match = /^\s*tailwind\s*=\s*["']([^"']+)["']/.exec(lines[i]);
    if (match) return match[1];
  }
  return null;
}

export function patchCargoFile(cwd) {
  const file = path.join(cwd, "Cargo.toml");
  if (!fs.existsSync(file)) {
    return { file, notes: ["no Cargo.toml found — add [package.metadata.fusor] when the Fusor app exists"] };
  }
  const source = fs.readFileSync(file, "utf8");
  const { text, notes } = patchCargoToml(source);
  if (text !== source) fs.writeFileSync(file, text);
  return { file, notes: notes.length ? notes : ["Cargo.toml already wired"] };
}
