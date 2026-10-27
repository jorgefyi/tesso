import fs from "node:fs";
import path from "node:path";
import { DEFAULT_REGISTRY, PACKAGE_VERSION } from "./constants.js";

const NAME = /^[a-z][a-z0-9-]*$/;
const VERSION = /^\d+\.\d+\.\d+$/;

/**
 * Where `add` and `list` read component JSON.
 * A flag wins, then `tesso.config.json`'s `registry`, then https://tesso.fyi/r/.
 */
export function resolveRegistry(value, cwd) {
  const raw = value == null || value === "" ? DEFAULT_REGISTRY : String(value);
  if (/^https?:\/\//i.test(raw)) {
    const href = raw.endsWith("/") ? raw : `${raw}/`;
    return { kind: "url", href, label: href };
  }
  const dir = path.resolve(cwd, raw);
  return { kind: "dir", dir, href: dir, label: dir };
}

export async function loadComponents(registry, names) {
  const ordered = [];
  const stack = new Set();
  const visit = async (name) => {
    if (ordered.some((item) => item.name === name)) return;
    if (stack.has(name)) throw new Error(`Component ${name} depends on itself.`);
    if (typeof name !== "string" || !NAME.test(name)) {
      throw new Error(`Unknown component ${name}.`);
    }
    stack.add(name);
    const item = validateComponent(await readComponent(registry, name));
    for (const dependency of item.dependencies) await visit(dependency);
    stack.delete(name);
    ordered.push(item);
  };
  for (const name of names) await visit(name);
  return ordered;
}

export async function listComponents(registry) {
  if (registry.kind === "dir") return listLocal(registry);
  return listRemote(registry);
}

/** Refuse when this CLI is older than a component's minimum tesso-ui version. */
export function assertCliVersion(items) {
  const problems = [];
  for (const item of items) {
    if (compareVersions(PACKAGE_VERSION, item.tessoUi) < 0) {
      problems.push(
        `${item.name} requires tesso-ui ${item.tessoUi} or newer. This CLI is ${PACKAGE_VERSION}.`,
      );
    }
  }
  if (problems.length) throw new Error(problems.join("\n"));
}

/** Refuse when Cargo.toml pins an older fusor-core than the component asks for. */
export function assertFusorVersion(cargoSource, items) {
  if (!cargoSource) return;
  const found = readFusorCoreVersion(cargoSource);
  if (!found) return;
  const problems = [];
  for (const item of items) {
    if (compareVersions(found, item.fusor) < 0) {
      problems.push(
        `${item.name} requires Fusor ${item.fusor} or newer. This app depends on fusor-core ${found}.`,
      );
    }
  }
  if (problems.length) throw new Error(problems.join("\n"));
}

export function compareVersions(left, right) {
  const a = String(left).replace(/^v/, "").split(".").map((part) => Number(part));
  const b = String(right).replace(/^v/, "").split(".").map((part) => Number(part));
  for (let i = 0; i < 3; i += 1) {
    const diff = (a[i] || 0) - (b[i] || 0);
    if (diff !== 0) return diff < 0 ? -1 : 1;
  }
  return 0;
}

export function tokenIds(item) {
  return item.cssVariables.map((name) => name.replace(/^--/, ""));
}

async function readComponent(registry, name) {
  if (registry.kind === "dir") {
    if (!fs.existsSync(registry.dir) || !fs.statSync(registry.dir).isDirectory()) {
      throw new Error(`Registry folder ${registry.label} was not found.`);
    }
    const file = path.join(registry.dir, `${name}.json`);
    if (!fs.existsSync(file)) {
      throw new Error(`Unknown component ${name}. ${name}.json was not found in ${registry.label}.`);
    }
    return parseJson(fs.readFileSync(file, "utf8"), file);
  }
  const url = new URL(`${name}.json`, registry.href).href;
  const text = await fetchText(url, `Unknown component ${name}. ${url} was not found.`);
  return parseJson(text, url);
}

async function listLocal(registry) {
  if (!fs.existsSync(registry.dir) || !fs.statSync(registry.dir).isDirectory()) {
    throw new Error(`Registry folder ${registry.label} was not found.`);
  }
  const names = fs
    .readdirSync(registry.dir)
    .filter((name) => name.endsWith(".json") && name !== "index.json")
    .sort();
  if (names.length === 0) throw new Error(`Registry folder ${registry.label} has no component JSON files.`);
  const items = [];
  for (const name of names) {
    const file = path.join(registry.dir, name);
    items.push(summarize(validateComponent(parseJson(fs.readFileSync(file, "utf8"), file))));
  }
  return items;
}

async function listRemote(registry) {
  const url = new URL("index.json", registry.href).href;
  const text = await fetchText(url, `Registry index ${url} was not found.`);
  const json = parseJson(text, url);
  const components = json.components ?? json.items;
  if (!Array.isArray(components) || components.length === 0) {
    throw new Error(`Registry index ${url} has no components.`);
  }
  return components.map((item, index) => {
    if (!item || typeof item.name !== "string") {
      throw new Error(`Registry index ${url} item ${index} is missing a name.`);
    }
    return {
      name: item.name,
      title: item.title ?? item.name,
      description: item.description ?? "",
      dependencies: Array.isArray(item.dependencies) ? item.dependencies : [],
    };
  });
}

async function fetchText(url, missingMessage) {
  let response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(15000), redirect: "follow" });
  } catch (error) {
    const reason = error?.cause?.message || error.message;
    throw new Error(`Could not reach the registry at ${url}. ${reason}`);
  }
  if (response.status === 404) throw new Error(missingMessage);
  if (!response.ok) {
    throw new Error(`Could not reach the registry at ${url}. The server responded ${response.status}.`);
  }
  return response.text();
}

function parseJson(text, label) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} is not valid JSON (${error.message}).`);
  }
}

export function validateComponent(json) {
  const errors = [];
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    throw new Error("A component file must be a JSON object.");
  }
  const name = typeof json.name === "string" ? json.name : "component";
  if (!NAME.test(json.name ?? "")) errors.push(`${name} needs a kebab-case name`);
  if (typeof json.title !== "string" || json.title.length === 0) errors.push(`${name} is missing title`);
  if (typeof json.description !== "string" || json.description.length === 0) {
    errors.push(`${name} is missing description`);
  }
  if (!Array.isArray(json.dependencies)) errors.push(`${name} dependencies must be an array`);
  else if (json.dependencies.some((dependency) => typeof dependency !== "string" || !NAME.test(dependency))) {
    errors.push(`${name} dependencies must be component names`);
  }
  if (!Array.isArray(json.cssVariables) || json.cssVariables.length === 0) {
    errors.push(`${name} cssVariables must list the custom properties it uses`);
  } else if (json.cssVariables.some((variable) => typeof variable !== "string" || !/^--[a-z0-9-]+$/.test(variable))) {
    errors.push(`${name} cssVariables must look like --primary`);
  }
  if (!VERSION.test(json.tessoUi ?? "")) errors.push(`${name} tessoUi must be a version like 0.4.1`);
  if (!VERSION.test(json.fusor ?? "")) errors.push(`${name} fusor must be a version like 0.1.6`);
  if (!Array.isArray(json.files) || json.files.length === 0) errors.push(`${name} files must be a non-empty array`);
  else {
    for (const file of json.files) {
      if (!file || typeof file.target !== "string" || typeof file.content !== "string") {
        errors.push(`${name} files need a target path and content`);
        continue;
      }
      if (!isSafeRelative(file.target)) errors.push(`${name} target must stay inside the project: ${file.target}`);
    }
  }
  if (json.css != null) {
    if (typeof json.css.target !== "string" || typeof json.css.marker !== "string" || typeof json.css.content !== "string") {
      errors.push(`${name} css needs target, marker, and content`);
    } else if (!isSafeRelative(json.css.target) || !/^[a-z0-9-]+$/.test(json.css.marker)) {
      errors.push(`${name} css target or marker is invalid`);
    }
  }
  if (json.rustModules != null) {
    if (!Array.isArray(json.rustModules)) errors.push(`${name} rustModules must be an array`);
    else {
      for (const rustModule of json.rustModules) {
        if (!rustModule || typeof rustModule.module !== "string" || !/^[a-z_][a-z0-9_]*$/.test(rustModule.module)) {
          errors.push(`${name} rustModules entries need a module name`);
        }
      }
    }
  }
  if (json.cargo != null) {
    const features = json.cargo.webSysFeatures;
    if (!Array.isArray(features) || features.some((feature) => typeof feature !== "string")) {
      errors.push(`${name} cargo.webSysFeatures must be an array of strings`);
    }
  }
  if (errors.length) throw new Error(errors.join("\n"));
  return json;
}

function summarize(item) {
  return {
    name: item.name,
    title: item.title,
    description: item.description,
    dependencies: item.dependencies,
  };
}

function readFusorCoreVersion(source) {
  const block = /fusor-core\s*=\s*\{[^}]*version\s*=\s*"([^"]+)"/.exec(source);
  if (block) return block[1];
  const plain = /fusor-core\s*=\s*"([^"]+)"/.exec(source);
  return plain ? plain[1] : null;
}

function isSafeRelative(value) {
  if (typeof value !== "string" || value.length === 0) return false;
  if (value.startsWith("/") || value.includes("\\") || value.split("/").includes("..")) return false;
  return true;
}
