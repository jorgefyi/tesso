import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repo = path.resolve(import.meta.dirname, "..");
const outDir = path.join(repo, "site", "public", "r");

test("the site build copies registry JSON to /r", () => {
  const result = spawnSync(process.execPath, ["build-registry.mjs"], {
    cwd: path.join(repo, "site"),
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  const source = fs.readFileSync(path.join(repo, "registry", "button.json"), "utf8");
  assert.equal(fs.readFileSync(path.join(outDir, "button.json"), "utf8"), source);
  const index = JSON.parse(fs.readFileSync(path.join(outDir, "index.json"), "utf8"));
  assert.equal(index.registry, "https://tesso.fyi/r/");
  assert.deepEqual(
    index.components.map((item) => item.name),
    ["button", "card", "dialog"],
  );
  assert.equal(index.components[0].files, undefined);
  assert.equal(fs.existsSync(path.join(outDir, "registry.json")), false);
});
