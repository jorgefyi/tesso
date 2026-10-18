#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  defaultPort,
  evidenceRoot,
  fusorBinHint,
  repoRoot,
  siteDist,
  siteRoot,
  skillRoot,
  statePath,
  verifyDir,
} from "../lib/paths.mjs";
import { createSiteServer, listen } from "../lib/serve.mjs";
import { callDriver, createBrowserDriver } from "../lib/browser-rpc.mjs";
import * as browser from "../lib/browser.mjs";

function usage() {
  return `control-tesso-site — drive the Tesso Fusor site for verification

Usage:
  control-tesso-site launch [--skip-build] [--port <n>] [--headed]
  control-tesso-site doctor
  control-tesso-site browser <subcommand> [options]
  control-tesso-site cleanup
  control-tesso-site evidence-root

Environment:
  RUN_ID / TESSO_RUN_ID   Isolation suffix (default: process pid)
  TESSO_VERIFY_DIR        Override /tmp/tesso-site-verify-$RUN_ID
  TESSO_SITE_PORT         Listen port (default: 44780)
  TESSO_EVIDENCE_DIR      Proof root (default: project media/verify-tesso-site)
  PATH                    Must include fusor 0.1.8 (often ~/.fusor/bin)

Browser subcommands:
  open [--headed]
  goto <path>
  click --role <role> --name <name> | --selector <css>
  press --key <key>
  wait --role <role> --name <name> | --selector <css> [--timeout ms]
  text --role <role> --name <name> | --selector <css> | --text <substr>
  eval --expr <js>
  info
  screenshot --path <file>
  snapshot --aria [--path <file>]
  clipboard
  storage get --key <k> | set --key <k> --value <v> | clear
  html-class
  close
`;
}

function fail(message, code = 1) {
  console.error(message);
  process.exit(code);
}

function readState() {
  const sp = statePath();
  if (!fs.existsSync(sp)) {
    fail(`No state file at ${sp}. Run launch first.`);
  }
  return JSON.parse(fs.readFileSync(sp, "utf8"));
}

function writeState(state) {
  const dir = verifyDir();
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(statePath(), JSON.stringify(state, null, 2) + "\n");
}

function ensureFusor() {
  const hint = fusorBinHint();
  if (!process.env.PATH?.includes(hint) && fs.existsSync(path.join(hint, "fusor"))) {
    process.env.PATH = `${hint}${path.delimiter}${process.env.PATH || ""}`;
  }
  const check = spawnSync("fusor", ["--version"], { encoding: "utf8" });
  if (check.status !== 0) {
    fail(
      `fusor not on PATH. Install with:\n  curl -fsSL https://fusor.build/install.sh | sh -s -- v0.1.8\n  export PATH="$HOME/.fusor/bin:$PATH"`,
    );
  }
  const version = (check.stdout || "").trim();
  if (!version.includes("0.1.8")) {
    console.error(`warning: expected fusor 0.1.8, got ${version}`);
  }
  return version;
}

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    cwd: opts.cwd,
    env: process.env,
    encoding: "utf8",
    stdio: opts.quiet ? "pipe" : "inherit",
  });
  if (result.status !== 0) {
    fail(`${cmd} ${args.join(" ")} failed with exit ${result.status}`);
  }
  return result;
}

async function cmdLaunch(argv) {
  const skipBuild = argv.includes("--skip-build");
  const portFlag = argv.indexOf("--port");
  const port = portFlag >= 0 ? Number(argv[portFlag + 1]) : defaultPort();
  if (!Number.isInteger(port)) {
    fail("Invalid --port");
  }

  const fusorVersion = ensureFusor();
  const dir = verifyDir();
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(evidenceRoot, { recursive: true });

  // Refuse to clobber a live instance that we started earlier in this dir.
  const existingPath = statePath();
  if (fs.existsSync(existingPath)) {
    const existing = JSON.parse(fs.readFileSync(existingPath, "utf8"));
    if (existing.pid && isAlive(existing.pid)) {
      fail(
        `Instance already running (pid ${existing.pid}) for ${dir}. Run cleanup first or use a new RUN_ID.`,
      );
    }
  }

  if (!skipBuild) {
    if (!fs.existsSync(path.join(siteRoot, "node_modules"))) {
      run("npm", ["install"], { cwd: siteRoot });
    }
    run("fusor", ["install"], { cwd: siteRoot });
    run("fusor", ["build"], { cwd: siteRoot });
    run("node", ["split-not-found.mjs"], { cwd: siteRoot });
  } else if (!fs.existsSync(path.join(siteDist, "index.html"))) {
    fail(`--skip-build requires ${siteDist}/index.html`);
  }

  // Detach a child that owns the HTTP server.
  const child = spawn(
    process.execPath,
    [path.join(skillRoot, "bin/control-tesso-site.mjs"), "_serve", String(port)],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        TESSO_VERIFY_DIR: dir,
        TESSO_SITE_PORT: String(port),
      },
      detached: true,
      stdio: ["ignore", "ignore", "ignore"],
    },
  );
  child.unref();

  const url = `http://127.0.0.1:${port}`;
  const ready = await waitForReady(url, 20000);
  if (!ready) {
    try {
      process.kill(child.pid, "SIGTERM");
    } catch {
      /* ignore */
    }
    fail(`Server did not become ready at ${url}`);
  }

  const state = {
    pid: child.pid,
    port,
    url,
    host: "127.0.0.1",
    dist: siteDist,
    siteRoot,
    verifyDir: dir,
    fusorVersion,
    evidenceRoot,
    startedAt: new Date().toISOString(),
    buildSkipped: skipBuild,
  };
  writeState(state);
  console.log(JSON.stringify({ ok: true, ...state }, null, 2));
}

async function waitForReady(url, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const home = await fetch(`${url}/`);
      const docs = await fetch(`${url}/docs/install`);
      if (home.ok && docs.ok) {
        const html = await home.text();
        if (html.includes("Tesso") && html.includes("Design system starter for Fusor")) {
          return true;
        }
      }
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function cmdServe(argv) {
  const port = Number(argv[0] || defaultPort());
  const server = createSiteServer(siteDist);
  const url = await listen(server, { host: "127.0.0.1", port });
  // Keep alive until killed.
  process.on("SIGTERM", () => {
    server.close(() => process.exit(0));
  });
  process.on("SIGINT", () => {
    server.close(() => process.exit(0));
  });
  // Intentionally no stdout in detached mode; launch polls HTTP.
  void url;
  await new Promise(() => {});
}

async function cmdDriveServe(argv) {
  const baseUrl = argv[0];
  const port = Number(argv[1]);
  if (!baseUrl || !Number.isInteger(port)) {
    fail("_drive-serve requires <baseUrl> <port>");
  }
  const server = createBrowserDriver({ baseUrl });
  await listen(server, { host: "127.0.0.1", port });
  process.on("SIGTERM", () => {
    browser.closeBrowser().finally(() => {
      server.close(() => process.exit(0));
    });
  });
  process.on("SIGINT", () => {
    browser.closeBrowser().finally(() => {
      server.close(() => process.exit(0));
    });
  });
  await new Promise(() => {});
}

async function ensureDriver(state) {
  if (state.driverPid && isAlive(state.driverPid) && state.driverUrl) {
    try {
      await callDriver(state.driverUrl, "ping");
      return state;
    } catch {
      /* restart below */
    }
  }
  const driverPort = state.port + 1;
  const child = spawn(
    process.execPath,
    [
      path.join(skillRoot, "bin/control-tesso-site.mjs"),
      "_drive-serve",
      state.url,
      String(driverPort),
    ],
    {
      cwd: repoRoot,
      env: { ...process.env, TESSO_VERIFY_DIR: state.verifyDir },
      detached: true,
      stdio: ["ignore", "ignore", "ignore"],
    },
  );
  child.unref();
  const driverUrl = `http://127.0.0.1:${driverPort}/`;
  const start = Date.now();
  let ready = false;
  while (Date.now() - start < 15000) {
    try {
      await callDriver(driverUrl, "ping");
      ready = true;
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 150));
    }
  }
  if (!ready) {
    try {
      process.kill(child.pid, "SIGTERM");
    } catch {
      /* ignore */
    }
    fail(`Browser driver did not become ready at ${driverUrl}`);
  }
  state.driverPid = child.pid;
  state.driverPort = driverPort;
  state.driverUrl = driverUrl;
  writeState(state);
  return state;
}

async function cmdDoctor() {
  const state = readState();
  const issues = [];
  if (!state.pid || !isAlive(state.pid)) {
    issues.push(`server pid ${state.pid} is not running`);
  }
  let homeStatus = null;
  let docsStatus = null;
  let homeHasBrand = false;
  let docsIsHtml = false;
  try {
    const home = await fetch(`${state.url}/`);
    homeStatus = home.status;
    const html = await home.text();
    homeHasBrand = html.includes(">Tesso<") || html.includes("Tesso");
    if (!home.ok) issues.push(`GET / -> ${home.status}`);
    if (!homeHasBrand) issues.push("GET / missing Tesso brand text");
  } catch (err) {
    issues.push(`GET / failed: ${err.message}`);
  }
  try {
    const docs = await fetch(`${state.url}/docs/install`);
    docsStatus = docs.status;
    const html = await docs.text();
    docsIsHtml = html.includes("<!doctype html>") || html.includes("Install");
    if (!docs.ok) {
      issues.push(
        `GET /docs/install -> ${docs.status} (SPA rewrite missing; do not use fusor preview alone)`,
      );
    }
    if (!docsIsHtml) issues.push("GET /docs/install did not return HTML");
  } catch (err) {
    issues.push(`GET /docs/install failed: ${err.message}`);
  }

  const report = {
    ok: issues.length === 0,
    url: state.url,
    pid: state.pid,
    port: state.port,
    verifyDir: state.verifyDir,
    dist: state.dist,
    fusorVersion: state.fusorVersion,
    evidenceRoot: state.evidenceRoot,
    homeStatus,
    docsStatus,
    homeHasBrand,
    docsIsHtml,
    issues,
  };
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(2);
}

function parseFlags(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        out[key] = next;
        i++;
      } else {
        out[key] = true;
      }
    } else {
      out._.push(a);
    }
  }
  return out;
}

async function cmdBrowser(argv) {
  const sub = argv[0];
  if (!sub) fail(usage());
  const flags = parseFlags(argv.slice(1));
  let state = readState();
  const print = (obj) => console.log(JSON.stringify(obj, null, 2));

  if (sub === "open") {
    state = await ensureDriver(state);
    const result = await callDriver(state.driverUrl, "open", {
      headed: Boolean(flags.headed),
    });
    print({ ok: true, driverUrl: state.driverUrl, ...result });
    return;
  }

  if (!state.driverUrl || !state.driverPid || !isAlive(state.driverPid)) {
    state = await ensureDriver(state);
    await callDriver(state.driverUrl, "open", { headed: Boolean(flags.headed) });
  }

  const call = (op, args) => callDriver(state.driverUrl, op, args);

  switch (sub) {
    case "close": {
      try {
        await call("close");
      } catch {
        /* ignore */
      }
      if (state.driverPid && isAlive(state.driverPid)) {
        try {
          process.kill(state.driverPid, "SIGTERM");
        } catch {
          /* ignore */
        }
      }
      delete state.driverPid;
      delete state.driverPort;
      delete state.driverUrl;
      writeState(state);
      print({ ok: true });
      break;
    }
    case "goto": {
      const target = flags._[0] || flags.path;
      if (!target) fail("browser goto <path>");
      print(await call("goto", { path: target }));
      break;
    }
    case "click": {
      print(
        await call("click", {
          role: flags.role,
          name: flags.name,
          selector: flags.selector,
          text: flags.text,
        }),
      );
      break;
    }
    case "press": {
      if (!flags.key) fail("browser press --key <key>");
      print(await call("press", { key: flags.key }));
      break;
    }
    case "wait": {
      print(
        await call("wait", {
          role: flags.role,
          name: flags.name,
          selector: flags.selector,
          text: flags.text,
          timeout: flags.timeout,
        }),
      );
      break;
    }
    case "text": {
      print(
        await call("text", {
          role: flags.role,
          name: flags.name,
          selector: flags.selector,
          text: flags.text,
        }),
      );
      break;
    }
    case "eval": {
      const expression = flags.expr || flags.expression;
      if (!expression) fail("browser eval --expr <js>");
      print(await call("eval", { expression }));
      break;
    }
    case "info": {
      print(await call("info"));
      break;
    }
    case "screenshot": {
      const outPath = path.resolve(flags.path || path.join(evidenceRoot, "screenshot.png"));
      print(await call("screenshot", { path: outPath }));
      break;
    }
    case "snapshot": {
      const outPath = flags.path
        ? path.resolve(flags.path)
        : path.join(evidenceRoot, "aria.txt");
      const result = await call("snapshot", { path: outPath });
      print({ path: result.path, preview: (result.snapshot || "").slice(0, 500) });
      break;
    }
    case "clipboard": {
      print(await call("clipboard"));
      break;
    }
    case "storage": {
      const action = flags._[0];
      if (action === "get") {
        if (!flags.key) fail("browser storage get --key <k>");
        print(await call("storage-get", { key: flags.key }));
      } else if (action === "set") {
        if (!flags.key) fail("browser storage set --key <k> --value <v>");
        print(await call("storage-set", { key: flags.key, value: String(flags.value ?? "") }));
      } else if (action === "clear") {
        print(await call("storage-clear"));
      } else {
        fail("browser storage get|set|clear");
      }
      break;
    }
    case "html-class": {
      print(await call("html-class"));
      break;
    }
    default:
      fail(`Unknown browser subcommand: ${sub}\n${usage()}`);
  }
}

async function killPid(pid) {
  if (!pid || !isAlive(pid)) return;
  try {
    process.kill(pid, "SIGTERM");
  } catch (err) {
    console.error(`warn: kill ${pid}: ${err.message}`);
    return;
  }
  for (let i = 0; i < 20; i++) {
    if (!isAlive(pid)) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  if (isAlive(pid)) {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      /* ignore */
    }
  }
}

async function cmdCleanup() {
  const sp = statePath();
  if (!fs.existsSync(sp)) {
    console.log(JSON.stringify({ ok: true, note: "no state file", evidenceRoot }, null, 2));
    return;
  }
  const state = JSON.parse(fs.readFileSync(sp, "utf8"));
  if (state.driverUrl) {
    try {
      await callDriver(state.driverUrl, "close");
    } catch {
      /* ignore */
    }
  }
  await killPid(state.driverPid);
  await killPid(state.pid);
  fs.unlinkSync(sp);
  // Remove empty verify dir scratch files but never evidenceRoot.
  const dir = state.verifyDir || verifyDir();
  try {
    for (const name of fs.readdirSync(dir)) {
      if (name === "state.json") continue;
      // Keep nothing else by default; only state lived here.
      const p = path.join(dir, name);
      if (fs.statSync(p).isFile()) fs.unlinkSync(p);
    }
    fs.rmdirSync(dir);
  } catch {
    /* dir may be non-empty or missing */
  }
  console.log(
    JSON.stringify(
      {
        ok: true,
        killedPid: state.pid,
        evidenceRoot: state.evidenceRoot || evidenceRoot,
        note: "Proof artifacts under evidenceRoot were not removed",
      },
      null,
      2,
    ),
  );
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (!cmd || cmd === "-h" || cmd === "--help") {
    console.log(usage());
    return;
  }
  switch (cmd) {
    case "launch":
      await cmdLaunch(rest);
      break;
    case "_serve":
      await cmdServe(rest);
      break;
    case "_drive-serve":
      await cmdDriveServe(rest);
      break;
    case "doctor":
      await cmdDoctor();
      break;
    case "browser":
      await cmdBrowser(rest);
      break;
    case "cleanup":
      await cmdCleanup();
      break;
    case "evidence-root":
      console.log(evidenceRoot);
      break;
    default:
      fail(`Unknown command: ${cmd}\n${usage()}`);
  }
}

main().catch((err) => {
  console.error(err?.stack || err);
  process.exit(1);
});
