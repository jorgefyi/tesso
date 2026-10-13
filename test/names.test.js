import assert from "node:assert/strict";
import test from "node:test";
import { collidesWithTailwind, plainName, rewriteLegacyVariables } from "../src/names.js";

test("starter names stay outside Tailwind theme namespaces", () => {
  for (const id of [
    "background",
    "card-foreground",
    "primary",
    "radius",
    "gray.0",
    "palette-accent.9",
    "space.4",
    "family.sans",
    "type-size.2",
    "weight.medium",
    "line-height.normal",
    "elevation.sm",
    "elevation-color.md",
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

test("legacy --ft- names map to plain names, longest match first", () => {
  const text = [
    "color: var(--ft-color-fg);",
    "background: var(--ft-color-bg);",
    "accent: var(--ft-color-accent);",
    "on-accent: var(--ft-color-accent-fg);",
    "step: var(--ft-color-accent-9);",
    "radius: var(--ft-radius-md);",
    "font: var(--ft-font-family-sans);",
  ].join("\n");
  const next = rewriteLegacyVariables(text);
  assert.match(next, /var\(--foreground\)/);
  assert.match(next, /var\(--background\)/);
  assert.match(next, /var\(--primary\)/);
  assert.match(next, /var\(--primary-foreground\)/);
  assert.match(next, /var\(--palette-accent-9\)/);
  assert.match(next, /var\(--corner-md\)/);
  assert.match(next, /var\(--family-sans\)/);
  assert.doesNotMatch(next, /--ft-/);
  assert.doesNotMatch(next, /--tesso-/);
});
