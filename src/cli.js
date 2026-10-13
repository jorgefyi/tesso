import path from "node:path";
import { addCommand } from "./commands/add.js";
import { checkCommand } from "./commands/check.js";
import { initCommand } from "./commands/init.js";
import { listCommand } from "./commands/list.js";
import { PACKAGE_VERSION } from "./constants.js";
import { readConfig } from "./config.js";

const HELP = `tesso — plain CSS tokens and components for Fusor

Usage:
  tesso init [--force] [--migrate] [--no-install]
  tesso check
  tesso add <component...> [--overwrite]
  tesso list

Commands:
  init    Write tesso.config.json and the tokens CSS file when that file
          is missing. The file is not overwritten unless you pass --force.
          --migrate renames matching --ft-* variables in project files.
  check   Read the tokens CSS file. Require every token, valid oklch(),
          and WCAG AA contrast for foreground and background pairs.
  add     Copy component source into this Fusor app
  list    Show the components in the built-in registry

Options:
  --cwd <dir>     App root (default: current directory)
  --force         init: replace an existing tokens CSS file
  --migrate       init: rename matching --ft-* variables
  --no-install    Accepted. init does not install packages
  --overwrite     add: replace component files that already exist
  --help          Show this help
  --version       Print ${PACKAGE_VERSION}
`;

export async function run(argv, io = {}) {
  const stdout = io.stdout ?? process.stdout;
  const stderr = io.stderr ?? process.stderr;
  try {
    const parsed = parseArgs(argv, io.cwd);
    if (parsed.help || parsed.command === "help") {
      stdout.write(HELP);
      return 0;
    }
    if (parsed.version) {
      stdout.write(`${PACKAGE_VERSION}\n`);
      return 0;
    }
    if (parsed.command === "init") {
      await initCommand(parsed.cwd, {
        stdout,
        stderr,
        migrate: parsed.migrate,
        force: parsed.force,
      });
      return 0;
    }
    if (parsed.command === "check") {
      await checkCommand(parsed.cwd, { stdout, stderr });
      return 0;
    }
    if (parsed.command === "list") {
      listCommand(readOptionalConfig(parsed.cwd, stderr), { stdout });
      return 0;
    }
    if (parsed.command === "add") {
      addCommand(parsed.cwd, parsed.args, { stdout, stderr, overwrite: parsed.overwrite });
      return 0;
    }
    stderr.write(`Unknown command "${parsed.command ?? ""}".\n\n${HELP}`);
    return 1;
  } catch (error) {
    stderr.write(`${error.message}\n`);
    return 1;
  }
}

function readOptionalConfig(cwd, stderr) {
  try {
    return readConfig(cwd, { warn: (message) => stderr?.write(`${message}\n`) });
  } catch {
    return {};
  }
}

function parseArgs(argv, defaultCwd) {
  let cwd = defaultCwd ?? process.cwd();
  let help = false;
  let version = false;
  let overwrite = false;
  let migrate = false;
  let force = false;
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") help = true;
    else if (arg === "--version" || arg === "-v") version = true;
    else if (arg === "--no-install") {
      /* init no longer installs packages */
    } else if (arg === "--overwrite") overwrite = true;
    else if (arg === "--migrate") migrate = true;
    else if (arg === "--force") force = true;
    else if (arg === "--cwd") {
      const value = argv[++i];
      if (!value) throw new Error("--cwd needs a directory.");
      cwd = path.resolve(value);
    } else if (arg.startsWith("--cwd=")) {
      cwd = path.resolve(arg.slice("--cwd=".length));
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown option ${arg}.`);
    } else rest.push(arg);
  }
  return {
    command: rest[0],
    args: rest.slice(1),
    cwd,
    help,
    version,
    overwrite,
    migrate,
    force,
  };
}
