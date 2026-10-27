import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { splitNotFound } from "../site/split-not-found.mjs";

const html = fs.readFileSync(path.join(import.meta.dirname, "../site/web/index.html"), "utf8");

const pages = ["home", "install", "init", "check", "add", "button", "card", "dialog", "test", "missing"];

test("every docs page escapes tag names written as text", () => {
  const sections = [...html.matchAll(/<section\b[^>]*\bdata-page="([^"]+)"[^>]*>([\s\S]*?)<\/section>/g)];
  assert.deepEqual(
    sections.map((match) => match[1]),
    pages,
  );
  for (const [, page, body] of sections) {
    for (const block of body.matchAll(/<(code|pre)\b[^>]*>([\s\S]*?)<\/\1>/g)) {
      assert.equal(
        /<[a-zA-Z/!]/.test(block[2]),
        false,
        `${page} ${block[1]} has a raw tag: ${block[2]}`,
      );
    }
  }
  assert.match(html, /Put <code>\.dark<\/code> on <code>&lt;html&gt;<\/code>/);
  assert.match(html, /native <code>&lt;dialog&gt;<\/code>/);
  assert.match(html, /<pre>&lt;link rel="stylesheet" href="\/tokens\.css" \/&gt;\n&lt;link rel="stylesheet" href="\/tesso\.css" \/&gt;<\/pre>/);
});

test("the not-found sentence is only in the missing section", () => {
  const sections = [...html.matchAll(/<section\b[^>]*\bdata-page="([^"]+)"[^>]*>([\s\S]*?)<\/section>/g)];
  for (const [, page, body] of sections) {
    assert.equal(body.includes("That path is not a docs page."), page === "missing", page);
  }
  assert.equal(html.includes('hidden="{{ state.hide_missing() }}"'), false);
});

test("split-not-found keeps the sentence on 404.html only", () => {
  const sample = `<main>\n<section data-page="home">Home</section>\n<section data-page="missing">\n<h1>Page not found</h1>\n<p>That path is not a docs page.</p>\n</section>\n</main>\n`;
  const { index, notFound } = splitNotFound(sample);
  assert.equal(index.includes("That path is not a docs page."), false);
  assert.match(index, /data-page="home"/);
  assert.equal(index.includes('data-page="missing"'), false);
  assert.equal(notFound.includes("That path is not a docs page."), true);
  assert.match(notFound, /data-page="missing"/);
});
