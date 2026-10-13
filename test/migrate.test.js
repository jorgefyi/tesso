import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { run } from "../src/cli.js";

const repo = path.resolve(import.meta.dirname, "..");
fs.mkdirSync(path.join(repo, ".tmp"), { recursive: true });

function capture() {
  let out = "";
  let err = "";
  return {
    stdout: { write: (chunk) => { out += chunk; } },
    stderr: { write: (chunk) => { err += chunk; } },
    text: () => out,
    error: () => err,
  };
}

test("init --migrate renames matching --ft- names and lists the rest", async () => {
  const cwd = fs.mkdtempSync(path.join(repo, ".tmp", "tesso-ft-"));
  fs.mkdirSync(path.join(cwd, "public"), { recursive: true });
  fs.writeFileSync(
    path.join(cwd, "public/app.css"),
    "body { color: var(--ft-color-fg); background: var(--ft-color-success); font: var(--ft-font-size-2); }\n",
  );
  const io = capture();
  assert.equal(await run(["init", "--migrate", "--no-install", "--cwd", cwd], io), 0, io.error());
  const appCss = fs.readFileSync(path.join(cwd, "public/app.css"), "utf8");
  assert.match(appCss, /var\(--foreground\)/);
  assert.match(appCss, /var\(--ft-color-success\)/);
  assert.match(appCss, /var\(--ft-font-size-2\)/);
  assert.match(io.text(), /left these --ft- names unchanged \(no kept token\): --ft-color-success, --ft-font-size-2/);
  assert.doesNotMatch(appCss, /--tesso-/);
  assert.equal(fs.existsSync(path.join(cwd, ".tesso")), false);
  const pkg = JSON.parse(fs.readFileSync(path.join(cwd, "package.json"), "utf8"));
  assert.equal(pkg.devDependencies["tesso-ui"], "^0.4.1");
});

test("init without --migrate leaves --ft- names alone", async () => {
  const cwd = fs.mkdtempSync(path.join(repo, ".tmp", "tesso-ft-keep-"));
  fs.mkdirSync(path.join(cwd, "public"), { recursive: true });
  fs.writeFileSync(path.join(cwd, "public/app.css"), "body { color: var(--ft-color-fg); }\n");
  const io = capture();
  assert.equal(await run(["init", "--no-install", "--cwd", cwd], io), 0, io.error());
  assert.match(fs.readFileSync(path.join(cwd, "public/app.css"), "utf8"), /--ft-color-fg/);
  assert.doesNotMatch(io.text(), /renamed --ft-/);
});
