import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { run } from "../src/cli.js";

const repo = path.resolve(import.meta.dirname, "..");
const registry = path.join(repo, "registry");

function componentFile(name, target) {
  const item = JSON.parse(fs.readFileSync(path.join(registry, `${name}.json`), "utf8"));
  const file = item.files.find((entry) => entry.target === target);
  return file.content.endsWith("\n") ? file.content : `${file.content}\n`;
}

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

async function app() {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "tesso-add-"));
  fs.writeFileSync(path.join(cwd, "Cargo.toml"), '[package]\nname = "demo"\nedition = "2021"\n\n[dependencies]\nwasm-bindgen = "=0.2.117"\n');
  fs.mkdirSync(path.join(cwd, "src"), { recursive: true });
  fs.writeFileSync(path.join(cwd, "src/lib.rs"), "mod app;\n");
  fs.writeFileSync(path.join(cwd, "src/app.rs"), "use fusor::prelude::*;\nstruct App;\n");
  fs.mkdirSync(path.join(cwd, "web"), { recursive: true });
  fs.writeFileSync(
    path.join(cwd, "web/index.html"),
    '<!doctype html><html><head><link rel="stylesheet" href="/tokens.css" /></head><body></body></html>\n',
  );
  const io = capture();
  assert.equal(await run(["init", "--no-install", "--cwd", cwd], io), 0, io.error());
  return cwd;
}

test("add writes component files and skips a file that differs", async () => {
  const cwd = await app();
  const io = capture();
  assert.equal(await run(["add", "button", "card", "--registry", registry, "--cwd", cwd], io), 0, io.error());
  assert.match(io.text(), new RegExp(registry.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.equal(
    fs.readFileSync(path.join(cwd, "web/components/button.html"), "utf8"),
    componentFile("button", "web/components/button.html"),
  );
  assert.equal(fs.readFileSync(path.join(cwd, "src/button.rs"), "utf8"), componentFile("button", "src/button.rs"));
  assert.match(fs.readFileSync(path.join(cwd, "public/tesso.css"), "utf8"), /@layer components/);
  assert.match(fs.readFileSync(path.join(cwd, "public/tesso.css"), "utf8"), /--primary/);
  assert.doesNotMatch(fs.readFileSync(path.join(cwd, "public/tesso.css"), "utf8"), /--tesso-/);
  assert.match(fs.readFileSync(path.join(cwd, "src/lib.rs"), "utf8"), /mod button;/);
  assert.match(fs.readFileSync(path.join(cwd, "src/app.rs"), "utf8"), /use crate::button::Button;/);
  assert.match(fs.readFileSync(path.join(cwd, "web/index.html"), "utf8"), /href="\/tesso.css"/);
  assert.match(io.text(), /wrote /);

  fs.writeFileSync(path.join(cwd, "web/components/button.html"), "<!-- local edit -->\n");
  const again = capture();
  assert.equal(await run(["add", "button", "--registry", registry, "--cwd", cwd], again), 0, again.error());
  assert.match(again.text(), /skipped web\/components\/button.html/);
  assert.match(again.text(), /--force/);
  assert.equal(fs.readFileSync(path.join(cwd, "web/components/button.html"), "utf8"), "<!-- local edit -->\n");

  const preview = capture();
  assert.equal(await run(["add", "button", "--diff", "--registry", registry, "--cwd", cwd], preview), 0, preview.error());
  assert.match(preview.text(), /--- web\/components\/button.html/);
  assert.match(preview.text(), /-<\!-- local edit -->/);
  assert.equal(fs.readFileSync(path.join(cwd, "web/components/button.html"), "utf8"), "<!-- local edit -->\n");

  const overwrite = capture();
  assert.equal(await run(["add", "button", "--force", "--registry", registry, "--cwd", cwd], overwrite), 0, overwrite.error());
  assert.equal(
    fs.readFileSync(path.join(cwd, "web/components/button.html"), "utf8"),
    componentFile("button", "web/components/button.html"),
  );
});

test("add rejects an unknown component", async () => {
  const cwd = await app();
  const io = capture();
  assert.equal(await run(["add", "slider", "--registry", registry, "--cwd", cwd], io), 1);
  assert.match(io.error(), /Unknown component slider/);
  assert.equal(fs.existsSync(path.join(cwd, "src/slider.rs")), false);
});

test("add dialog also installs its button dependency", async () => {
  const cwd = await app();
  const io = capture();
  assert.equal(await run(["add", "dialog", "--registry", registry, "--cwd", cwd], io), 0, io.error());
  assert.equal(fs.existsSync(path.join(cwd, "src/dialog.rs")), true);
  assert.equal(fs.existsSync(path.join(cwd, "src/dialog_a11y.rs")), true);
  assert.equal(fs.existsSync(path.join(cwd, "src/button.rs")), true);
  const cargo = fs.readFileSync(path.join(cwd, "Cargo.toml"), "utf8");
  for (const feature of [
    "Window",
    "Document",
    "Element",
    "HtmlElement",
    "Node",
    "Event",
    "EventTarget",
    "HtmlDialogElement",
    "DomTokenList",
  ]) {
    assert.match(cargo, new RegExp(`"${feature}"`));
  }
  const html = fs.readFileSync(path.join(cwd, "web/components/dialog.html"), "utf8");
  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-modal="true"/);
  assert.match(html, /aria-labelledby="\{\{ state\.labelled_by\(\) \}\}"/);
  assert.match(html, /aria-describedby="\{\{ state\.described_by\(\) \}\}"/);
  assert.match(html, /<Children name="footer"><\/Children>/);
});

test("add refuses a component that needs a newer tesso-ui", async () => {
  const cwd = await app();
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "tesso-registry-"));
  const button = JSON.parse(fs.readFileSync(path.join(registry, "button.json"), "utf8"));
  button.tessoUi = "9.0.0";
  fs.writeFileSync(path.join(folder, "button.json"), `${JSON.stringify(button)}\n`);
  const io = capture();
  assert.equal(await run(["add", "button", "--registry", folder, "--cwd", cwd], io), 1);
  assert.match(io.error(), /button requires tesso-ui 9\.0\.0 or newer/);
  assert.match(io.error(), /This CLI is 0\.4\.1/);
  assert.equal(fs.existsSync(path.join(cwd, "src/button.rs")), false);
});

test("add fails clearly when the registry cannot be reached", async () => {
  const cwd = await app();
  const io = capture();
  assert.equal(await run(["add", "button", "--registry", "http://127.0.0.1:9/r/", "--cwd", cwd], io), 1);
  assert.match(io.error(), /Could not reach the registry at http:\/\/127\.0\.0\.1:9\/r\/button\.json/);
  assert.equal(fs.existsSync(path.join(cwd, "src/button.rs")), false);
});

test("list prints the built-in components", async () => {
  const io = capture();
  assert.equal(await run(["list", "--registry", registry, "--cwd", repo], io), 0, io.error());
  assert.match(io.text(), /button/);
  assert.match(io.text(), /card/);
  assert.match(io.text(), /dialog/);
});
