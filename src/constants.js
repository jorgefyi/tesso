export {
  SEMANTIC_COLOR_IDS,
  LEGACY_SEMANTIC_COLOR_IDS,
  ELEVATION_COLOR_IDS,
  LEGACY_SHADOW_COLOR_IDS,
} from "./names.js";

export const TOKEN_TYPES = new Set([
  "color",
  "dimension",
  "fontFamily",
  "fontWeight",
  "number",
  "shadow",
  "string",
]);

export const TERRAZZO_VERSION = "^2.7.1";
export const PACKAGE_VERSION = "0.3.1";
export const PACKAGE_NAME = "tesso-ui";

export const CONFIG_FILENAME = "tesso.config.json";
export const LEGACY_CONFIG_FILENAME = "fusor-tokens.config.json";
export const PIPELINE_DIR = ".tesso";
export const LEGACY_PIPELINE_DIR = ".fusor-tokens";
export const LEGACY_PREFIX = "ft";
/** Empty: custom properties are `--background`, not `--tesso-background`. */
export const DEFAULT_PREFIX = "";

// Fusor's assets-build is one argv (program + args, no shell), not a list of
// shell commands. See fusor-build AppConfig::assets_build.
export const ASSETS_BUILD_ARGV = ["npx", "tesso-ui", "build"];
export const ASSETS_BUILD_COMMAND = ASSETS_BUILD_ARGV.join(" ");
export const ASSETS_BUILD_TOML = `assets-build = [${ASSETS_BUILD_ARGV.map((a) => JSON.stringify(a)).join(", ")}]`;
/** Fusor 0.1.6 publishes assets as a URL map. */
export const ASSETS_TOML = 'assets = { "/" = "public" }';

export const LEGACY_ASSETS_BUILD_ARGV = ["npx", "fusor-tokens", "build"];

export const DEFAULT_CONFIG = {
  $schema: "./node_modules/tesso-ui/schema.json",
  tokens: ["tokens/**/*.tokens.json"],
  outFile: "public/tokens.css",
  engine: "terrazzo",
  themes: ["light", "dark"],
  prefix: DEFAULT_PREFIX,
};

export const LEGACY_ERROR =
  "Found a fusor-tokens project (.fusor-tokens/ or fusor-tokens.config.json). " +
  "Run `tesso init --migrate` to move it to .tesso/ and rename --ft- variables to plain names such as --foreground. " +
  "That flag does not prompt, so it is safe in CI. In a terminal, `tesso init` asks first.";
