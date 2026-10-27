import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { run } from "../src/cli.js";
import { renderTokensCss, TOKEN_IDS } from "../src/tokens-css.js";

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

test("init writes tokens.css once, config, and Cargo assets", async () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "tesso-init-"));
  fs.writeFileSync(path.join(cwd, "Cargo.toml"), "[package]\nname = \"demo\"\nedition = \"2021\"\n");
  const io = capture();
  const code = await run(["init", "--no-install", "--cwd", cwd], io);
  assert.equal(code, 0, io.error());
  assert.match(io.text(), /link rel="stylesheet" href="\/tokens\.css"/);
  assert.equal(fs.existsSync(path.join(cwd, "tesso.config.json")), true);
  assert.equal(fs.existsSync(path.join(cwd, "tokens")), false);
  assert.equal(fs.existsSync(path.join(cwd, ".tesso")), false);
  const cssPath = path.join(cwd, "public/tokens.css");
  assert.equal(fs.readFileSync(cssPath, "utf8"), renderTokensCss());
  const cargo = fs.readFileSync(path.join(cwd, "Cargo.toml"), "utf8");
  assert.match(cargo, /assets = \{ "\/" = "public" \}/);
  assert.doesNotMatch(cargo, /assets-build/);
  const pkg = JSON.parse(fs.readFileSync(path.join(cwd, "package.json"), "utf8"));
  assert.equal(pkg.devDependencies["tesso-ui"], "^0.4.1");
  assert.equal(pkg.devDependencies["@terrazzo/cli"], undefined);

  const edited = fs.readFileSync(cssPath, "utf8").replace("oklch(99% 0.005 260)", "oklch(98% 0.005 260)");
  fs.writeFileSync(cssPath, edited);
  const again = capture();
  assert.equal(await run(["init", "--no-install", "--cwd", cwd], again), 0);
  assert.match(again.text(), /kept existing/);
  assert.match(again.text(), /--force/);
  assert.equal(fs.readFileSync(cssPath, "utf8"), edited);
  assert.doesNotMatch(fs.readFileSync(path.join(cwd, "Cargo.toml"), "utf8"), /assets-build/);

  const forced = capture();
  assert.equal(await run(["init", "--force", "--no-install", "--cwd", cwd], forced), 0, forced.error());
  assert.match(forced.text(), /replaced public\/tokens.css/);
  assert.equal(fs.readFileSync(cssPath, "utf8"), renderTokensCss());
});

test("check accepts the starter and rejects a broken tokens file", async () => {
  const cwd = fs.mkdtempSync(path.join(repo, ".tmp", "check-"));
  fs.mkdirSync(cwd, { recursive: true });
  const initIo = capture();
  assert.equal(await run(["init", "--no-install", "--cwd", cwd], initIo), 0, initIo.error());
  const cssPath = path.join(cwd, "public/tokens.css");
  const css = fs.readFileSync(cssPath, "utf8");
  assert.match(css, /:root \{/);
  assert.match(css, /\n\.dark \{/);
  assert.doesNotMatch(css, /prefers-color-scheme/);
  assert.doesNotMatch(css, /--tesso-/);
  assert.doesNotMatch(css, /--color-/);
  assert.doesNotMatch(css, /--destructive-foreground/);
  assert.match(css, /--background: oklch\(99% 0\.005 260\);/);
  assert.match(css, /--radius: 0\.625rem;/);
  const dark = css.split("\n.dark {")[1];
  assert.match(dark, /--background: oklch\(18% 0\.02 260\);/);
  assert.doesNotMatch(dark, /--radius:/);

  const checkIo = capture();
  assert.equal(await run(["check", "--cwd", cwd], checkIo), 0, checkIo.error());
  assert.match(checkIo.text(), /WCAG AA 4\.5:1/);
  assert.match(checkIo.text(), new RegExp(String(TOKEN_IDS.length)));
  assert.equal(fs.readFileSync(cssPath, "utf8"), css);

  const missing = css.replace("  --ring: oklch(70% 0.16 264);\n", "");
  fs.writeFileSync(cssPath, missing);
  const missingIo = capture();
  assert.equal(await run(["check", "--cwd", cwd], missingIo), 1);
  assert.match(missingIo.error(), /missing --ring on :root/);

  const bad = css.replace("--primary: oklch(55% 0.18 264);", "--primary: red;");
  fs.writeFileSync(cssPath, bad);
  const badIo = capture();
  assert.equal(await run(["check", "--cwd", cwd], badIo), 1);
  assert.match(badIo.error(), /--primary on :root is "red"/);
  assert.match(badIo.error(), /oklch\(\)/);

  const low = css.replace("--foreground: oklch(18% 0.02 260);", "--foreground: oklch(99% 0.005 260);");
  fs.writeFileSync(cssPath, low);
  const lowIo = capture();
  assert.equal(await run(["check", "--cwd", cwd], lowIo), 1);
  assert.match(lowIo.error(), /--foreground on --background in :root is/);
  assert.match(lowIo.error(), /below WCAG AA 4\.5:1/);
});

test("unknown config keys are rejected", async () => {
  const cwd = fs.mkdtempSync(path.join(repo, ".tmp", "engine-"));
  fs.mkdirSync(cwd, { recursive: true });
  fs.writeFileSync(
    path.join(cwd, "tesso.config.json"),
    JSON.stringify({
      outFile: "public/tokens.css",
      engine: "style-dictionary",
      prefix: "",
    }),
  );
  const io = capture();
  assert.equal(await run(["check", "--cwd", cwd], io), 1);
  assert.match(io.error(), /Unknown config key "engine"/);
});

test("committed example css matches the starter and passes check", async () => {
  const cwd = path.join(repo, "examples/counter-themed");
  const cssPath = path.join(cwd, "public/tokens.css");
  assert.equal(fs.readFileSync(cssPath, "utf8"), renderTokensCss());
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

test("starter set is the 19 plain tokens", async () => {
  const cwd = fs.mkdtempSync(path.join(repo, ".tmp", "count-"));
  fs.mkdirSync(cwd, { recursive: true });
  assert.equal(await run(["init", "--no-install", "--cwd", cwd], capture()), 0);
  const css = fs.readFileSync(path.join(cwd, "public/tokens.css"), "utf8");
  const root = css.split(".dark")[0];
  const names = [...root.matchAll(/--([a-z0-9-]+):/g)].map((match) => match[1]);
  assert.deepEqual(names.sort(), [...TOKEN_IDS].sort());
  assert.equal(names.length, 19);
});
