export { SEMANTIC_COLOR_IDS } from "./names.js";

export const PACKAGE_VERSION = "0.4.1";
/** Registry `tesso add` uses when no --registry flag or config value is set. */
export const DEFAULT_REGISTRY = "https://tesso.fyi/r/";
export const PACKAGE_NAME = "tesso-ui";

export const CONFIG_FILENAME = "tesso.config.json";
/** Empty: custom properties are `--background`, not `--tesso-background`. */
export const DEFAULT_PREFIX = "";

/** Fusor 0.1.6 publishes assets as a URL map. */
export const ASSETS_TOML = 'assets = { "/" = "public" }';

export const DEFAULT_CONFIG = {
  $schema: "./node_modules/tesso-ui/schema.json",
  outFile: "public/tokens.css",
  prefix: DEFAULT_PREFIX,
};
