import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { expandGlobs, loadTokenFile } from "../src/dtcg.js";
import { loadRegistry, validateRegistry } from "../src/registry.js";

const repo = path.resolve(import.meta.dirname, "..");

test("the bundled registry is valid and its files exist", () => {
  const registry = loadRegistry();
  assert.equal(registry.registryUrl, null);
  assert.equal(registry.name, "tesso");
  assert.deepEqual(validateRegistry(registry, path.join(repo, "registry")), []);
  const names = registry.items.map((item) => item.name);
  assert.deepEqual(names, ["button", "card", "dialog"]);
  const dialog = registry.items.find((item) => item.name === "dialog");
  assert.deepEqual(dialog.dependencies, ["button"]);
});

test("component css uses plain variables inside @layer components", () => {
  const registry = loadRegistry();
  const reserved = /var\(--(?:tesso-|ft-|color-|font-|shadow-|radius-|spacing|text-|leading-)/;
  for (const item of registry.items) {
    const css = fs.readFileSync(path.join(repo, "registry/components", item.css.source), "utf8");
    assert.match(css, /@layer components/);
    assert.doesNotMatch(css, /--ft-/);
    assert.doesNotMatch(css, reserved, item.name);
    const variables = css.match(/var\(--[^)]+\)/g) ?? [];
    assert.ok(variables.length > 0, item.name);
  }
});

test("registry tokens exist in the starter set", () => {
  const registry = loadRegistry();
  const files = expandGlobs(repo, ["src/starter/tokens/**/*.tokens.json"]);
  const ids = new Set();
  for (const file of files) {
    for (const token of loadTokenFile(file)) ids.add(token.id);
  }
  for (const item of registry.items) {
    for (const token of item.tokens) {
      assert.equal(ids.has(token), true, `${item.name} token ${token}`);
    }
  }
});

test("dialog markup is a native modal wired to the tested decisions", () => {
  const html = fs.readFileSync(path.join(repo, "registry/components/dialog/dialog.html"), "utf8");
  assert.match(html, /<dialog/);
  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-modal="true"/);
  assert.match(html, /aria-labelledby="\{\{ state\.labelled_by\(\) \}\}"/);
  assert.match(html, /aria-describedby="\{\{ state\.described_by\(\) \}\}"/);
  assert.match(html, /<Children name="footer"><\/Children>/);
  assert.match(html, /on:click="state\.on_backdrop_click\(&event\)"/);
  assert.match(html, /on:cancel="state\.on_cancel\(&event\)"/);
  assert.match(html, /on:close="state\.on_native_close\(\)"/);
  const css = fs.readFileSync(path.join(repo, "registry/components/dialog/dialog.css"), "utf8");
  assert.match(css, /\.tesso-dialog::backdrop/);
  assert.match(css, /var\(--foreground\)/);
  assert.doesNotMatch(css, /\.tesso-dialog\s*\{[^}]*display\s*:/);
  const rust = fs.readFileSync(path.join(repo, "registry/components/dialog/dialog.rs"), "utf8");
  assert.match(rust, /\.show_modal\(\)/);
  assert.match(rust, /dialog_a11y::choose_opener/);
  assert.match(rust, /dialog_a11y::should_restore_focus/);
  assert.match(rust, /dialog_a11y::allows_escape/);
  assert.match(rust, /\.background_inert\(\)/);
  assert.match(rust, /\.escape\(\)/);
  assert.doesNotMatch(rust, /reopen_dialog|EscapeGate/);
  assert.doesNotMatch(rust, /keydown/);
});
