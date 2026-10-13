import fs from "node:fs";
import path from "node:path";
import { patchCargoFile, readFusorTailwind } from "../cargo.js";
import { DEFAULT_CONFIG, PACKAGE_NAME, PACKAGE_VERSION } from "../constants.js";
import { configPath, readConfig, writeDefaultConfig } from "../config.js";
import { migrateFtNames } from "../migrate.js";
import { applyThemeInline } from "../names.js";
import { renderTokensCss } from "../tokens-css.js";

export async function initCommand(cwd, { stdout, stderr, migrate, force }) {
  const created = [];
  const skipped = [];
  const notes = [];

  if (migrate) {
    const migrated = migrateFtNames(cwd);
    notes.push(...migrated);
  }

  const configFile = configPath(cwd);
  if (fs.existsSync(configFile)) skipped.push(path.basename(configFile));
  else {
    writeDefaultConfig(cwd, DEFAULT_CONFIG);
    created.push(path.basename(configFile));
  }

  const config = readConfig(cwd, { warn: (message) => stderr?.write(`${message}\n`) });
  const tokenFile = path.resolve(cwd, config.outFile);
  const tokenLabel = config.outFile.split(path.sep).join("/");
  if (fs.existsSync(tokenFile) && !force) {
    skipped.push(`${tokenLabel} (pass --force to replace it)`);
  } else {
    fs.mkdirSync(path.dirname(tokenFile), { recursive: true });
    const existed = fs.existsSync(tokenFile);
    fs.writeFileSync(tokenFile, renderTokensCss(config.prefix));
    if (existed) notes.push(`replaced ${tokenLabel}`);
    else created.push(tokenLabel);
  }

  const pkgNotes = ensurePackageJson(cwd);
  const cargo = patchCargoFile(cwd);
  const theme = writeTailwindBridge(cwd);

  const lines = ["tesso init"];
  if (created.length) lines.push(`  created ${created.join(", ")}`);
  if (skipped.length) lines.push(`  kept existing ${skipped.join(", ")}`);
  for (const note of notes) lines.push(`  ${note}`);
  for (const note of pkgNotes) lines.push(`  ${note}`);
  for (const note of cargo.notes) lines.push(`  ${note}`);
  if (theme) lines.push(`  ${theme}`);
  lines.push("");
  lines.push("Add this to the HTML <head>, before other styles:");
  lines.push('  <link rel="stylesheet" href="/tokens.css" />');
  lines.push("");
  lines.push(`Edit ${tokenLabel}, then run tesso check.`);
  lines.push("Add components with `tesso list` and `tesso add button`.");
  stdout.write(`${lines.join("\n")}\n`);
}

function ensurePackageJson(cwd) {
  const file = path.join(cwd, "package.json");
  const notes = [];
  let pkg = { private: true };
  if (fs.existsSync(file)) {
    try {
      pkg = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (error) {
      throw new Error(`package.json is not valid JSON (${error.message}).`);
    }
  } else {
    notes.push("created package.json");
  }
  if (!pkg || typeof pkg !== "object" || Array.isArray(pkg)) {
    throw new Error("package.json must be a JSON object.");
  }
  pkg.devDependencies ??= {};
  if (pkg.dependencies?.[PACKAGE_NAME] || pkg.devDependencies?.[PACKAGE_NAME]) {
    notes.push("npm devDependencies already present");
  } else {
    pkg.devDependencies[PACKAGE_NAME] = `^${PACKAGE_VERSION}`;
    notes.push(`added devDependencies: ${PACKAGE_NAME}`);
  }
  fs.writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`);
  return notes;
}

function writeTailwindBridge(cwd) {
  const cargoFile = path.join(cwd, "Cargo.toml");
  if (!fs.existsSync(cargoFile)) return null;
  const relative = readFusorTailwind(fs.readFileSync(cargoFile, "utf8"));
  if (!relative) return null;
  const file = path.resolve(cwd, relative);
  const before = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  const applied = applyThemeInline(before);
  if (applied.changed) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, applied.text);
  }
  const label = relative.split(path.sep).join("/");
  if (applied.created) return `created ${label} with @import "tailwindcss" and @theme inline`;
  if (applied.changed) return `wrote @theme inline into ${label}`;
  return `kept the tesso @theme inline block in ${label}`;
}
