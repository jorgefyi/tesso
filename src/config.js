import fs from "node:fs";
import path from "node:path";
import { CONFIG_FILENAME } from "./constants.js";

const PREFIX_NAME = /^$|^[A-Za-z][A-Za-z0-9-]*$/;

export { CONFIG_FILENAME };

export function configPath(cwd) {
  return path.join(cwd, CONFIG_FILENAME);
}

export function readConfig(cwd, { warn } = {}) {
  const file = configPath(cwd);
  if (!fs.existsSync(file)) {
    throw new Error(`Missing ${CONFIG_FILENAME}. Run tesso init in the app root.`);
  }
  let json;
  try {
    json = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`${CONFIG_FILENAME} is not valid JSON (${error.message}).`);
  }
  return validateConfig(json, { warn });
}

export function validateConfig(json) {
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    throw new Error("tesso.config.json must be a JSON object.");
  }
  const allowed = new Set(["$schema", "outFile", "prefix", "registry"]);
  for (const key of Object.keys(json)) {
    if (!allowed.has(key)) {
      throw new Error(`Unknown config key "${key}".`);
    }
  }
  for (const key of ["outFile", "prefix"]) {
    if (json[key] == null) throw new Error(`Config is missing "${key}".`);
  }
  if (typeof json.outFile !== "string" || json.outFile.length === 0) {
    throw new Error('Config "outFile" must be a non-empty string.');
  }
  if (typeof json.prefix !== "string" || !PREFIX_NAME.test(json.prefix)) {
    throw new Error(
      'Config "prefix" must be empty, or start with a letter and contain only letters, numbers, or "-". An empty prefix emits plain names such as --background.',
    );
  }
  if (json.registry != null) {
    if (typeof json.registry !== "string" || !/^https?:\/\//i.test(json.registry)) {
      throw new Error(
        'Config "registry" must be an http(s) URL. Omit it to use the registry shipped with tesso-ui.',
      );
    }
  }
  return json;
}

export function writeDefaultConfig(cwd, config) {
  const file = configPath(cwd);
  fs.writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`);
  return file;
}
