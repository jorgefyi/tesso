import fs from "node:fs";
import path from "node:path";
import { readConfig } from "../config.js";
import { unifiedDiff } from "../diff.js";
import { rootCustomProperties } from "../css-tokens.js";
import {
  assertCliVersion,
  assertFusorVersion,
  loadComponents,
  resolveRegistry,
  tokenIds,
} from "../registry.js";

const CSS_TARGET = "public/tesso.css";

function projectTokenIds(cwd, config) {
  const file = path.resolve(cwd, config.outFile);
  if (!fs.existsSync(file)) return [];
  const names = rootCustomProperties(fs.readFileSync(file, "utf8"));
  const prefix = config.prefix ? `${config.prefix}-` : "";
  return names.map((name) => (prefix && name.startsWith(prefix) ? name.slice(prefix.length) : name));
}

export async function addCommand(cwd, names, { stdout, stderr, force, diff, registry }) {
  if (names.length === 0) throw new Error("Name at least one component. Run `tesso list` to see them.");
  const config = readConfig(cwd, { warn: (message) => stderr?.write(`${message}\n`) });
  if (config.prefix !== "") {
    throw new Error(
      `Components use plain variables such as --primary, but tesso.config.json prefix is "${config.prefix}". Set prefix to "" before adding components.`,
    );
  }
  const source = resolveRegistry(registry ?? config.registry, cwd);
  const items = await loadComponents(source, names);
  assertCliVersion(items);
  const cargoFile = path.join(cwd, "Cargo.toml");
  if (fs.existsSync(cargoFile)) assertFusorVersion(fs.readFileSync(cargoFile, "utf8"), items);

  const ids = new Set(projectTokenIds(cwd, config));
  const missing = [];
  for (const item of items) {
    for (const token of tokenIds(item)) {
      if (!ids.has(token)) missing.push(`${item.name} needs ${token}`);
    }
  }
  if (missing.length) {
    throw new Error(`Token set is missing tokens these components use:\n${missing.map((line) => `  ${line}`).join("\n")}`);
  }

  const written = [];
  const skipped = [];
  const kept = [];
  const notes = [];
  const diffs = [];

  for (const item of items) {
    for (const file of item.files) {
      const result = placeFile(cwd, file.target, ensureNewline(file.content), { force, diff });
      collect(result, { written, skipped, kept, diffs });
    }
    if (item.css) collect(placeCss(cwd, item, { force, diff }), { written, skipped, kept, diffs });
    if (!diff || force) {
      notes.push(...ensureRust(cwd, item));
      notes.push(...ensureCargoFeatures(cwd, item));
    }
  }
  if (!diff || force) notes.push(...ensureStylesheetLink(cwd));

  const lines = [`tesso add ${names.join(" ")}`, `  registry ${source.label}`];
  if (written.length) lines.push(`  wrote ${written.join(", ")}`);
  for (const note of notes) lines.push(`  ${note}`);
  for (const note of kept) lines.push(`  ${note}`);
  for (const note of skipped) lines.push(`  ${note}`);
  if (diffs.length) {
    lines.push("");
    lines.push(diffs.join("\n"));
  }
  lines.push("");
  lines.push("Wire the pieces that were written:");
  lines.push('  <link rel="stylesheet" href="/tesso.css" />');
  lines.push('  <Button variant="primary" size="md" on_press="{{ state.save.clone() }}">Save</Button>');
  lines.push('  <Card title="Title" description="Supporting text."><template slot="footer">Footer</template></Card>');
  lines.push('  <Dialog open="{{ state.dialog_open.clone() }}" title="Title" description="What this dialog does."><template slot="footer">Actions</template></Dialog>');
  lines.push("");
  lines.push("Import each component in the Rust module that owns the template (`use crate::button::Button`),");
  lines.push("and declare `mod button;` in src/lib.rs. `add` inserts those lines when the files are already there.");
  lines.push("Dialog traps focus while it is open. See examples/counter-themed for a working page.");
  stdout.write(`${lines.join("\n")}\n`);
}

function collect(result, buckets) {
  if (!result) return;
  if (result.wrote) buckets.written.push(result.wrote);
  if (result.skipped) buckets.skipped.push(result.skipped);
  if (result.kept) buckets.kept.push(result.kept);
  if (result.diff) buckets.diffs.push(result.diff);
}

function placeFile(cwd, label, next, { force, diff }) {
  const dest = path.join(cwd, label);
  if (!fs.existsSync(dest)) {
    const preview = diff ? unifiedDiff(label, "", next) : null;
    if (diff && !force) return { diff: preview, skipped: `would write ${label}` };
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, next);
    return { wrote: label, diff: preview };
  }
  const current = fs.readFileSync(dest, "utf8");
  if (current === next) return { kept: `kept ${label}` };
  const preview = diff ? unifiedDiff(label, current, next) : null;
  if (!force) {
    return {
      diff: preview,
      skipped: `skipped ${label} (it differs from the registry; pass --force to overwrite)`,
    };
  }
  fs.writeFileSync(dest, next);
  return { wrote: label, diff: preview };
}

function placeCss(cwd, item, options) {
  const marker = item.css.marker;
  const start = `/* tesso:${marker} */`;
  const end = `/* /tesso:${marker} */`;
  const block = `${start}\n${item.css.content.trim()}\n${end}\n`;
  const label = item.css.target || CSS_TARGET;
  const file = path.join(cwd, label);
  const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  const pattern = new RegExp(`${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}\\n?`);
  const hadSection = pattern.test(current);
  let next;
  if (!current) next = block;
  else if (hadSection) next = current.replace(pattern, block);
  else next = `${current.trimEnd()}\n\n${block}`;
  if (!next.endsWith("\n")) next = `${next}\n`;
  if (current === next) return { kept: `kept ${label} section ${marker}` };
  const preview = options.diff ? unifiedDiff(label, current, next) : null;
  if (hadSection && !options.force) {
    return {
      diff: preview,
      skipped: `skipped ${label} section ${marker} (it differs from the registry; pass --force to overwrite)`,
    };
  }
  if (options.diff && !options.force) return { diff: preview, skipped: `would write ${label} (${marker})` };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, next);
  return { wrote: `${label} (${marker})`, diff: preview };
}

function ensureNewline(text) {
  return text.endsWith("\n") ? text : `${text}\n`;
}

function ensureRust(cwd, item) {
  const notes = [];
  const modules = item.rustModules ?? [];
  if (modules.length === 0) return notes;
  const lib = path.join(cwd, "src/lib.rs");
  if (!fs.existsSync(lib)) {
    notes.push("no src/lib.rs — declare the new modules next to mod app");
    return notes;
  }
  let source = fs.readFileSync(lib, "utf8");
  let changed = false;
  for (const rustModule of modules) {
    const declaration = `mod ${rustModule.module};`;
    if (new RegExp(`^\\s*(pub\\s+)?mod\\s+${rustModule.module}\\s*;`, "m").test(source)) continue;
    source = source.endsWith("\n") ? `${source}${declaration}\n` : `${source}\n${declaration}\n`;
    changed = true;
  }
  if (changed) {
    fs.writeFileSync(lib, source);
    notes.push("updated src/lib.rs");
  }
  const app = path.join(cwd, "src/app.rs");
  if (!fs.existsSync(app)) {
    const uses = modules.filter((rustModule) => rustModule.use).map((rustModule) => rustModule.use);
    if (uses.length) notes.push(`add to the page module: ${uses.join(" ")}`);
    return notes;
  }
  let appSource = fs.readFileSync(app, "utf8");
  let appChanged = false;
  for (const rustModule of modules) {
    if (!rustModule.use || appSource.includes(rustModule.use)) continue;
    const uses = [...appSource.matchAll(/^use [^\n]*;\n/gm)];
    if (uses.length) {
      const last = uses[uses.length - 1];
      const at = last.index + last[0].length;
      appSource = `${appSource.slice(0, at)}${rustModule.use}\n${appSource.slice(at)}`;
    } else {
      appSource = `${rustModule.use}\n${appSource}`;
    }
    appChanged = true;
  }
  if (appChanged) {
    fs.writeFileSync(app, appSource);
    notes.push("updated src/app.rs");
  }
  return notes;
}

function ensureCargoFeatures(cwd, item) {
  const features = item.cargo?.webSysFeatures ?? [];
  if (features.length === 0) return [];
  const file = path.join(cwd, "Cargo.toml");
  if (!fs.existsSync(file)) return ["no Cargo.toml — add web-sys with the HtmlDialogElement feature for Dialog"];
  const source = fs.readFileSync(file, "utf8");
  const next = ensureWebSysFeatures(source, features);
  if (next === source) return [];
  fs.writeFileSync(file, next);
  return [`enabled web-sys features: ${features.join(", ")}`];
}

export function ensureWebSysFeatures(source, features) {
  if (!source.includes("web-sys")) {
    const line = `web-sys = { version = "0.3", features = [${features.map((feature) => JSON.stringify(feature)).join(", ")}] }\n`;
    const deps = source.indexOf("[dependencies]");
    if (deps === -1) return `${source.trimEnd()}\n\n[dependencies]\n${line}`;
    const insertAt = source.indexOf("\n[", deps + 1);
    if (insertAt === -1) return `${source.trimEnd()}\n${line}`;
    return `${source.slice(0, insertAt)}\n${line}${source.slice(insertAt)}`;
  }
  const match = /web-sys\s*=\s*\{[\s\S]*?features\s*=\s*\[([\s\S]*?)\]/.exec(source);
  if (!match) return source;
  const missing = features.filter((feature) => !match[1].includes(`"${feature}"`));
  if (missing.length === 0) return source;
  const added = missing.map((feature) => `"${feature}"`).join(", ");
  const current = match[1].trim().replace(/,\s*$/, "");
  const insertion = current ? `${current}, ${added}` : added;
  return source.slice(0, match.index) + match[0].replace(match[1], insertion) + source.slice(match.index + match[0].length);
}

function ensureStylesheetLink(cwd) {
  const candidates = ["web/index.html", "index.html"];
  const file = candidates.map((relative) => path.join(cwd, relative)).find((candidate) => fs.existsSync(candidate));
  if (!file) return ['add <link rel="stylesheet" href="/tesso.css" /> to the document head'];
  const source = fs.readFileSync(file, "utf8");
  if (source.includes('href="/tesso.css"') || source.includes("href='/tesso.css'")) return [];
  const link = '    <link rel="stylesheet" href="/tesso.css" />\n';
  const tokens = source.indexOf('href="/tokens.css"');
  if (tokens !== -1) {
    const lineEnd = source.indexOf("\n", tokens);
    const next = `${source.slice(0, lineEnd + 1)}${link}${source.slice(lineEnd + 1)}`;
    fs.writeFileSync(file, next);
    return [`linked /tesso.css from ${path.relative(cwd, file)}`];
  }
  const head = source.indexOf("</head>");
  if (head === -1) return ['add <link rel="stylesheet" href="/tesso.css" /> to the document head'];
  fs.writeFileSync(file, `${source.slice(0, head)}${link}${source.slice(head)}`);
  return [`linked /tesso.css from ${path.relative(cwd, file)}`];
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
