import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { unifiedDiff } from "../src/diff.js";
import { DARK_COLORS, LIGHT_COLORS, renderTokensCss } from "../src/tokens-css.js";

const site = path.resolve(import.meta.dirname, "..", "site");
const config = JSON.parse(fs.readFileSync(path.join(site, "tesso.config.json"), "utf8"));
const themeFiles = ["web/index.html", "src/theme.rs"];

function regenerateHint() {
  return [
    `Regenerate: node -e "import('./src/tokens-css.js').then(m=>process.stdout.write(m.renderTokensCss('${config.prefix}')))" > site/${config.outFile}`,
    "PowerShell > writes UTF-16. Use Git Bash, or Set-Content -NoNewline -Encoding utf8.",
  ].join("\n");
}

function assertStarterTokens(written, label) {
  const expected = renderTokensCss(config.prefix);
  if (written === expected) return;
  assert.fail(`${regenerateHint()}\n\n${unifiedDiff(label, written, expected)}`);
}

test("site/public/tokens.css is what tesso init writes for site/tesso.config.json", () => {
  const written = fs
    .readFileSync(path.join(site, config.outFile), "utf8")
    .replace(/\r\n/g, "\n");
  assertStarterTokens(written, `site/${config.outFile}`);
});

test("theme-color quotes the starter backgrounds", () => {
  for (const rel of themeFiles) {
    const text = fs.readFileSync(path.join(site, rel), "utf8");
    assert.ok(text.includes(LIGHT_COLORS.background), `${rel} quotes ${LIGHT_COLORS.background}`);
    assert.ok(text.includes(DARK_COLORS.background), `${rel} quotes ${DARK_COLORS.background}`);
  }
});

test("theme-color does not use #000000 or #fafcff", () => {
  for (const rel of themeFiles) {
    const text = fs.readFileSync(path.join(site, rel), "utf8");
    assert.equal(text.includes("#000000"), false, `${rel} contains #000000`);
    assert.equal(text.includes("#fafcff"), false, `${rel} contains #fafcff`);
  }
});

test("a pure-black tokens background fails starter equality", () => {
  const drifted = renderTokensCss(config.prefix).replace(
    `--background: ${DARK_COLORS.background};`,
    "--background: oklch(0% 0 0);",
  );
  assert.throws(() => assertStarterTokens(drifted, "pure-black fixture"), /oklch\(0% 0 0\)/);
});
