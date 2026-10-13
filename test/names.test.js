import assert from "node:assert/strict";
import test from "node:test";
import { collidesWithTailwind, plainName, rewriteLegacyVariables, unmappedLegacyNames } from "../src/names.js";

test("starter names stay outside Tailwind theme namespaces", () => {
  for (const id of [
    "background",
    "card-foreground",
    "primary",
    "destructive",
    "radius",
  ]) {
    const plain = plainName(id);
    assert.equal(collidesWithTailwind(plain), false, plain);
  }
});

test("reserved Tailwind names are rejected", () => {
  for (const id of ["color.brand", "spacing", "spacing.4", "font.display", "shadow.xl", "radius.xl", "text.sm"]) {
    assert.throws(() => plainName(id), /Tailwind/);
  }
  assert.equal(plainName("radius"), "radius");
});

test("legacy --ft- names map only when a kept token exists", () => {
  const text = [
    "color: var(--ft-color-fg);",
    "background: var(--ft-color-bg);",
    "accent: var(--ft-color-accent);",
    "on-accent: var(--ft-color-accent-fg);",
    "step: var(--ft-color-accent-9);",
    "success: var(--ft-color-success);",
    "radius: var(--ft-radius-md);",
    "font: var(--ft-font-family-sans);",
    "space: var(--ft-space-4);",
  ].join("\n");
  const next = rewriteLegacyVariables(text);
  assert.match(next, /var\(--foreground\)/);
  assert.match(next, /var\(--background\)/);
  assert.match(next, /var\(--primary\)/);
  assert.match(next, /var\(--primary-foreground\)/);
  assert.match(next, /var\(--ft-color-accent-9\)/);
  assert.match(next, /var\(--ft-color-success\)/);
  assert.match(next, /var\(--ft-radius-md\)/);
  assert.match(next, /var\(--ft-font-family-sans\)/);
  assert.match(next, /var\(--ft-space-4\)/);
  assert.doesNotMatch(next, /--primary-9/);
  assert.doesNotMatch(next, /--palette-/);
  assert.doesNotMatch(next, /--tesso-/);
  assert.deepEqual(unmappedLegacyNames(next), [
    "--ft-color-accent-9",
    "--ft-color-success",
    "--ft-font-family-sans",
    "--ft-radius-md",
    "--ft-space-4",
  ]);
});
