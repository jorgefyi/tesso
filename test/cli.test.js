import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { run } from "../src/cli.js";
import { SEMANTIC_COLOR_IDS } from "../src/constants.js";

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

test("init scaffolds tokens, config, pipeline, and Cargo metadata", async () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "fusor-init-"));
  fs.writeFileSync(path.join(cwd, "Cargo.toml"), "[package]\nname = \"demo\"\nedition = \"2021\"\n");
  const io = capture();
  const code = await run(["init", "--no-install", "--cwd", cwd], io);
  assert.equal(code, 0, io.error());
  assert.match(io.text(), /link rel="stylesheet" href="\/tokens\.css"/);
  assert.equal(fs.existsSync(path.join(cwd, "tesso.config.json")), true);
  assert.equal(fs.existsSync(path.join(cwd, "tokens/themes/dark.tokens.json")), true);
  assert.equal(fs.existsSync(path.join(cwd, "tokens/themes/light.tokens.json")), false);
  assert.equal(fs.existsSync(path.join(cwd, "tokens/semantic.tokens.json")), true);
  assert.equal(fs.existsSync(path.join(cwd, "public")), true);
  assert.equal(fs.existsSync(path.join(cwd, ".tesso/terrazzo.config.ts")), true);
  const cargo = fs.readFileSync(path.join(cwd, "Cargo.toml"), "utf8");
  assert.match(cargo, /assets = \{ "\/" = "public" \}/);
  assert.match(cargo, /assets-build = \["npx", "tesso-ui", "build"\]/);
  const pkg = JSON.parse(fs.readFileSync(path.join(cwd, "package.json"), "utf8"));
  assert.equal(pkg.devDependencies["@terrazzo/cli"], "^2.7.1");
  assert.equal(pkg.devDependencies["tesso-ui"], "^0.3.0");

  const again = capture();
  assert.equal(await run(["init", "--no-install", "--cwd", cwd], again), 0);
  assert.match(again.text(), /kept existing/);
  const cargoAgain = fs.readFileSync(path.join(cwd, "Cargo.toml"), "utf8");
  assert.equal(cargoAgain.split("assets-build").length, 2);
});

test("build and check produce plain light and .dark variables", async () => {
  const cwd = fs.mkdtempSync(path.join(repo, ".tmp", "build-"));
  fs.mkdirSync(cwd, { recursive: true });
  const initIo = capture();
  assert.equal(await run(["init", "--no-install", "--cwd", cwd], initIo), 0, initIo.error());

  const buildIo = capture();
  assert.equal(await run(["build", "--cwd", cwd], buildIo), 0, buildIo.error());
  const cssPath = path.join(cwd, "public/tokens.css");
  const css = fs.readFileSync(cssPath, "utf8");
  assert.match(css, /:root \{/);
  assert.match(css, /\n\.dark \{/);
  assert.doesNotMatch(css, /prefers-color-scheme/);
  assert.doesNotMatch(css, /--tesso-/);
  assert.doesNotMatch(css, /--color-/);
  assert.doesNotMatch(css, /--font-/);
  assert.doesNotMatch(css, /--shadow-/);
  assert.doesNotMatch(css, /--radius-/);
  assert.doesNotMatch(css, /--spacing/);
  assert.match(css, /--background: oklch\(99% 0\.005 260\);/);
  assert.match(css, /--foreground: oklch\(18% 0\.02 260\);/);
  assert.match(css, /--primary: oklch\(55% 0\.18 264\);/);
  assert.match(css, /--destructive: oklch\(55% 0\.19 25\);/);
  assert.match(css, /--radius: 0\.625rem;/);
  assert.match(css, /--ring: oklch\(70% 0\.16 264\);/);
  assert.doesNotMatch(css, /--destructive-foreground/);
  assert.doesNotMatch(css, /--success/);
  assert.doesNotMatch(css, /--warning/);
  assert.doesNotMatch(css, /--gray-/);
  assert.doesNotMatch(css, /--space-/);
  assert.doesNotMatch(css, /--elevation/);
  assert.doesNotMatch(css, /--palette-/);

  const dark = css.split("\n.dark {")[1];
  assert.match(dark, /--background: oklch\(18% 0\.02 260\);/);
  assert.match(dark, /--foreground: oklch\(99% 0\.005 260\);/);
  assert.match(dark, /--primary: oklch\(70% 0\.16 264\);/);
  assert.match(dark, /--ring: oklch\(92% 0\.04 264\);/);
  assert.match(dark, /--border: oklch\(36% 0\.018 260\);/);
  assert.doesNotMatch(dark, /--radius:/);

  const second = fs.readFileSync(cssPath, "utf8");
  const rebuild = capture();
  assert.equal(await run(["build", "--cwd", cwd], rebuild), 0, rebuild.error());
  assert.equal(fs.readFileSync(cssPath, "utf8"), second);

  const before = fs.readFileSync(cssPath, "utf8");
  const checkIo = capture();
  assert.equal(await run(["check", "--cwd", cwd], checkIo), 0, checkIo.error());
  assert.match(checkIo.text(), new RegExp(String(SEMANTIC_COLOR_IDS.length)));
  assert.equal(fs.readFileSync(cssPath, "utf8"), before);

  const broken = path.join(cwd, "tokens/themes/dark.tokens.json");
  const original = fs.readFileSync(broken, "utf8");
  fs.writeFileSync(
    broken,
    original.replace(
      '"ring": { "$type": "color", "$value": "oklch(92% 0.04 264)" }',
      '"ring": { "$type": "color", "$value": "oklch(70% 0.16 264)" }',
    ),
  );
  const sameRing = capture();
  assert.equal(await run(["check", "--cwd", cwd], sameRing), 1);
  assert.match(sameRing.error(), /focus ring/);
  assert.equal(fs.readFileSync(cssPath, "utf8"), before);
  fs.writeFileSync(
    broken,
    original.replace(
      '"foreground": { "$type": "color", "$value": "oklch(99% 0.005 260)" }',
      '"foreground": { "$type": "color", "$value": "{missing}" }',
    ),
  );
  const bad = capture();
  assert.equal(await run(["check", "--cwd", cwd], bad), 1);
  assert.match(bad.error(), /missing/);
  assert.equal(fs.readFileSync(cssPath, "utf8"), before);
});

test("style-dictionary engine is rejected", async () => {
  const cwd = fs.mkdtempSync(path.join(repo, ".tmp", "engine-"));
  fs.mkdirSync(cwd, { recursive: true });
  fs.writeFileSync(
    path.join(cwd, "tesso.config.json"),
    JSON.stringify({
      tokens: ["tokens/**/*.tokens.json"],
      outFile: "public/tokens.css",
      engine: "style-dictionary",
      themeAttribute: "data-theme",
      themes: ["light", "dark"],
      prefix: "ft",
    }),
  );
  const io = capture();
  assert.equal(await run(["check", "--cwd", cwd], io), 1);
  assert.match(io.error(), /style-dictionary/);
});

test("committed example css is a fresh build", async () => {
  const cwd = path.join(repo, "examples/counter-themed");
  const cssPath = path.join(cwd, "public/tokens.css");
  const before = fs.readFileSync(cssPath, "utf8");
  const io = capture();
  assert.equal(await run(["build", "--cwd", cwd], io), 0, io.error());
  assert.equal(fs.readFileSync(cssPath, "utf8"), before);
  const check = capture();
  assert.equal(await run(["check", "--cwd", cwd], check), 0, check.error());
});

test("init writes the Tailwind bridge when Fusor sets tailwind", async () => {
  const cwd = fs.mkdtempSync(path.join(repo, ".tmp", "tw-"));
  fs.mkdirSync(path.join(cwd, "web"), { recursive: true });
  fs.writeFileSync(
    path.join(cwd, "Cargo.toml"),
    '[package]\nname = "demo"\nedition = "2021"\n\n[package.metadata.fusor]\nentry = "web/index.html"\ntailwind = "web/app.css"\n',
  );
  fs.writeFileSync(path.join(cwd, "web/app.css"), '@import "tailwindcss";\n\nbody { margin: 0; }\n');
  const io = capture();
  assert.equal(await run(["init", "--no-install", "--cwd", cwd], io), 0, io.error());
  const css = fs.readFileSync(path.join(cwd, "web/app.css"), "utf8");
  assert.match(css, /@import "tailwindcss";/);
  assert.match(css, /\/\* tesso:theme \*\//);
  assert.match(css, /@theme inline \{/);
  assert.match(css, /--color-primary: var\(--primary\);/);
  assert.match(css, /--color-background: var\(--background\);/);
  assert.match(css, /--radius-sm: calc\(var\(--radius\) - 4px\);/);
  assert.match(css, /--radius-md: calc\(var\(--radius\) - 2px\);/);
  assert.match(css, /--radius-lg: var\(--radius\);/);
  assert.match(css, /--radius-xl: calc\(var\(--radius\) \+ 4px\);/);
  assert.match(css, /body \{ margin: 0; \}/);
  assert.equal(css.match(/@theme inline/g).length, 1);
  const again = capture();
  assert.equal(await run(["init", "--no-install", "--cwd", cwd], again), 0, again.error());
  assert.equal(fs.readFileSync(path.join(cwd, "web/app.css"), "utf8"), css);
  assert.match(again.text(), /kept the tesso @theme inline block/);

  const plain = fs.mkdtempSync(path.join(repo, ".tmp", "notw-"));
  fs.writeFileSync(path.join(plain, "Cargo.toml"), '[package]\nname = "demo"\nedition = "2021"\n');
  assert.equal(await run(["init", "--no-install", "--cwd", plain], capture()), 0);
  assert.equal(fs.existsSync(path.join(plain, "web/app.css")), false);
});

test("starter set stays inside the MVP token budget", async () => {
  const cwd = fs.mkdtempSync(path.join(repo, ".tmp", "count-"));
  fs.mkdirSync(cwd, { recursive: true });
  assert.equal(await run(["init", "--no-install", "--cwd", cwd], capture()), 0);
  const { validateTokenSet } = await import("../src/dtcg.js");
  const { readConfig } = await import("../src/config.js");
  const { ids } = validateTokenSet(cwd, readConfig(cwd));
  assert.equal(ids.length, 19, `token count ${ids.length}`);
});
