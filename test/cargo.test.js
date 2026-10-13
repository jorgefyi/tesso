import assert from "node:assert/strict";
import test from "node:test";
import { patchCargoToml } from "../src/cargo.js";

test("adds the assets map when the section is missing", () => {
  const { text, notes } = patchCargoToml(`[package]\nname = "demo"\n`);
  assert.match(text, /\[package\.metadata\.fusor\]/);
  assert.match(text, /assets = \{ "\/" = "public" \}/);
  assert.doesNotMatch(text, /assets-build/);
  assert.ok(notes.some((note) => note.includes("package.metadata.fusor")));
});

test("fills a missing assets map and does not replace an existing assets path", () => {
  const source = `[package.metadata.fusor]
entry = "web/index.html"
assets = "static"
`;
  const { text } = patchCargoToml(source);
  assert.match(text, /assets = "static"/);
  assert.doesNotMatch(text, /assets = \{ "\/" = "public" \}/);
  assert.doesNotMatch(text, /assets-build/);
});

test("leaves an existing assets-build command alone", () => {
  const source = `[package.metadata.fusor]
assets = "public"
assets-build = ["node", "build.mjs"]
`;
  const { text, notes } = patchCargoToml(source);
  assert.equal(text, source);
  assert.deepEqual(notes, ['kept assets as a directory string — Fusor 0.1.6 wants assets = { "/" = "public" }']);
});

test("removes a retired tesso build hook and keeps the rest of the section", () => {
  const source = `[package.metadata.fusor]
assets = { "/" = "public" }
assets-build = ["npx", "tesso-ui", "build"]
tailwind = "web/app.css"

[profile.release]
opt-level = "s"
`;
  const { text, notes } = patchCargoToml(source);
  assert.doesNotMatch(text, /assets-build/);
  assert.match(text, /tailwind = "web\/app\.css"\n\n\[profile\.release\]/);
  assert.ok(notes.some((note) => note.includes("removed assets-build")));
  assert.equal(patchCargoToml(text).text, text);
});

test("is idempotent when assets is already set", () => {
  const source = `[package.metadata.fusor]
assets = { "/" = "public" }
output = "dist"

[profile.release]
opt-level = "s"
`;
  const once = patchCargoToml(source).text;
  assert.equal(once, source);
  assert.equal(patchCargoToml(once).text, once);
});
