import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { validateComponent } from "../src/registry.js";
import { TOKEN_IDS } from "../src/tokens-css.js";

const repo = path.resolve(import.meta.dirname, "..");
const registry = path.join(repo, "registry");

function load(name) {
  return JSON.parse(fs.readFileSync(path.join(registry, `${name}.json`), "utf8"));
}

test("each component is one JSON file and the old source copies are gone", () => {
  assert.equal(fs.existsSync(path.join(registry, "components")), false);
  assert.equal(fs.existsSync(path.join(registry, "registry.json")), false);
  const names = fs.readdirSync(registry).filter((name) => name.endsWith(".json")).sort();
  assert.deepEqual(names, ["button.json", "card.json", "dialog.json"]);
  const dialog = validateComponent(load("dialog"));
  assert.deepEqual(dialog.dependencies, ["button"]);
  assert.equal(dialog.tessoUi, "0.4.1");
  assert.equal(dialog.fusor, "0.1.7");
  assert.equal(load("button").fusor, "0.1.7");
  assert.equal(load("card").fusor, "0.1.7");
  const button = load("button").files.find((file) => file.target.endsWith("button.rs")).content;
  assert.match(button, /#\[input\(default = "primary"\)\]\s+variant: &'static str,/);
  assert.match(button, /#\[input\(default = "md"\)\]\s+size: &'static str,/);
  const dialogRust = load("dialog").files.find((file) => file.target.endsWith("dialog.rs")).content;
  assert.match(dialogRust, /#\[derive\(fusor::Inputs\)\]\s+pub struct DialogInputs/);
});

test("component css uses plain variables inside @layer components", () => {
  const reserved = /var\(--(?:tesso-|ft-|color-|font-|shadow-|radius-|spacing|text-|leading-)/;
  for (const name of ["button", "card", "dialog"]) {
    const item = validateComponent(load(name));
    const css = item.css.content;
    assert.match(css, /@layer components/);
    assert.doesNotMatch(css, /--ft-/);
    assert.doesNotMatch(css, reserved, name);
    const variables = css.match(/var\(--[^)]+\)/g) ?? [];
    assert.ok(variables.length > 0, name);
    for (const variable of item.cssVariables) {
      assert.equal(TOKEN_IDS.includes(variable.slice(2)), true, `${name} ${variable}`);
    }
  }
});

test("button focus keeps a ring for keyboard and clears it only for pointer", () => {
  const css = load("button").css.content;
  assert.match(css, /\.tesso-button:focus \{\s*outline: 2px solid var\(--ring\);\s*outline-offset: 2px;\s*\}/);
  assert.match(css, /\.tesso-button:focus:not\(:focus-visible\) \{\s*outline: none;\s*\}/);
  assert.doesNotMatch(css, /\.tesso-button:focus \{\s*outline: none;/);
  const built = fs.readFileSync(path.join(repo, "site", "public", "tesso.css"), "utf8");
  assert.match(built, /\.tesso-button:focus:not\(:focus-visible\)/);
  assert.doesNotMatch(built, /\.tesso-button:focus \{\s*outline: none;/);
});

test("dialog markup is a native modal wired to the tested decisions", () => {
  const item = load("dialog");
  const html = item.files.find((file) => file.target.endsWith("dialog.html")).content;
  assert.match(html, /<dialog/);
  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-modal="true"/);
  assert.match(html, /aria-labelledby="\{\{ state\.labelled_by\(\) \}\}"/);
  assert.match(html, /aria-describedby="\{\{ state\.described_by\(\) \}\}"/);
  assert.match(html, /<Children name="footer"><\/Children>/);
  assert.match(html, /on:click="state\.on_backdrop_click\(&event\)"/);
  assert.match(html, /on:cancel="state\.on_cancel\(&event\)"/);
  assert.match(html, /on:close="state\.on_native_close\(\)"/);
  assert.match(item.css.content, /\.tesso-dialog::backdrop/);
  assert.match(item.css.content, /var\(--foreground\)/);
  assert.doesNotMatch(item.css.content, /\.tesso-dialog\s*\{[^}]*display\s*:/);
  const rust = item.files.find((file) => file.target.endsWith("dialog.rs")).content;
  assert.match(rust, /\.show_modal\(\)/);
  assert.match(rust, /dialog_a11y::choose_opener/);
  assert.match(rust, /dialog_a11y::should_restore_focus/);
  assert.match(rust, /dialog_a11y::allows_escape/);
  assert.match(rust, /\.background_inert\(\)/);
  assert.match(rust, /\.escape\(\)/);
  assert.doesNotMatch(rust, /reopen_dialog|EscapeGate/);
  assert.doesNotMatch(rust, /keydown/);
  assert.doesNotMatch(html, /<svg/i);
});
