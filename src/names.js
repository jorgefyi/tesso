/**
 * CSS variable names for Tesso tokens.
 *
 * The token file uses plain names (`--background`, `--radius`). Tailwind's
 * theme namespaces (`--color-*`, `--radius-*`, `--font-*`, `--shadow-*`,
 * `--spacing`, …) stay out of that file. `tesso init` writes the `@theme inline`
 * bridge into the app's Tailwind stylesheet, where those namespaces belong.
 */

/**
 * Semantic colors every new theme must define. The CSS name is the id.
 * shadcn v4 has no `--destructive-foreground`.
 */
export const SEMANTIC_COLOR_IDS = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "border",
  "input",
  "ring",
];

/** fusor-tokens 0.1 ids. Still accepted so `tesso init --migrate` can build old JSON. */
export const LEGACY_SEMANTIC_COLOR_IDS = [
  "color.bg",
  "color.bg.subtle",
  "color.bg.muted",
  "color.fg",
  "color.fg.muted",
  "color.fg.subtle",
  "color.border",
  "color.border.strong",
  "color.accent",
  "color.accent.fg",
  "color.danger",
  "color.success",
  "color.warning",
  "color.warning.fg",
  "color.focus.ring",
];

export const ELEVATION_COLOR_IDS = ["elevation-color.sm", "elevation-color.md", "elevation-color.lg"];

export const LEGACY_SHADOW_COLOR_IDS = ["color.shadow.sm", "color.shadow.md", "color.shadow.lg"];

/**
 * Old fusor-tokens ids that still have a token in the shadcn set.
 * Longer ids are applied first, and a rewrite does not consume a longer
 * `--ft-` name (`--ft-color-accent-9` stays; `--ft-color-accent` becomes `--primary`).
 * Ids with no kept equivalent are not listed: migrate leaves those `--ft-*` names alone.
 */
export const LEGACY_ID_NAMES = {
  "color.bg": "background",
  "color.bg.subtle": "card",
  "color.bg.muted": "muted",
  "color.fg": "foreground",
  "color.fg.muted": "muted-foreground",
  "color.border": "border",
  "color.accent": "primary",
  "color.accent.fg": "primary-foreground",
  "color.danger": "destructive",
  "color.focus.ring": "ring",
};

/**
 * Tailwind CSS 4 theme namespaces. A custom property in one of these, set on
 * `:root`, overrides the utility that namespace owns. `--radius` itself is
 * shadcn's base and is not `--radius-*`.
 */
const RESERVED = [
  /^color-/,
  /^font-/,
  /^text-/,
  /^tracking-/,
  /^leading-/,
  /^breakpoint-/,
  /^container-/,
  /^spacing(-|$)/,
  /^radius-/,
  /^shadow-/,
  /^inset-shadow-/,
  /^drop-shadow-/,
  /^blur-/,
  /^perspective-/,
  /^aspect-/,
  /^ease-/,
  /^animate-/,
  /^default-/,
];

export function collidesWithTailwind(plain) {
  return RESERVED.some((pattern) => pattern.test(plain));
}

/** DTCG id → unprefixed custom-property name, without leading dashes. */
export function plainName(id) {
  const plain = Object.prototype.hasOwnProperty.call(LEGACY_ID_NAMES, id)
    ? LEGACY_ID_NAMES[id]
    : id.replaceAll(".", "-");
  if (collidesWithTailwind(plain)) {
    throw new Error(
      `Token "${id}" would emit --${plain}, which is reserved by Tailwind (--color-*, --spacing, --radius-*, --font-*, --shadow-*, and the other theme namespaces). Rename the token so the custom property stays outside those namespaces. The Tailwind bridge maps plain names such as --primary onto --color-primary.`,
    );
  }
  if (!/^[a-zA-Z][a-zA-Z0-9-]*$/.test(plain)) {
    throw new Error(`Token "${id}" cannot become a CSS variable named --${plain}.`);
  }
  return plain;
}

/** `--background`, or `--brand-background` when a custom prefix is set. */
export function cssVariable(id, prefix = "") {
  const plain = plainName(id);
  return prefix ? `--${prefix}-${plain}` : `--${plain}`;
}

/** Pairs of `--ft-old` → `--new`, longest old name first. */
export function legacyVariableRewrites() {
  return Object.entries(LEGACY_ID_NAMES)
    .map(([id, plain]) => [`--ft-${id.replaceAll(".", "-")}`, `--${plain}`])
    .sort((a, b) => b[0].length - a[0].length);
}

export function rewriteLegacyVariables(text) {
  let next = text;
  for (const [from, to] of legacyVariableRewrites()) {
    next = next.replace(new RegExp(`${escapeRegExp(from)}(?![A-Za-z0-9-])`, "g"), to);
  }
  return next;
}

/** `--ft-*` names still present after a rewrite. Sorted, unique. */
export function unmappedLegacyNames(text) {
  return [...new Set(text.match(/--ft-[A-Za-z0-9-]+/g) ?? [])].sort();
}

/** Colors the Tailwind bridge exposes as `--color-*`. */
export const BRIDGE_COLOR_NAMES = SEMANTIC_COLOR_IDS;

export const THEME_MARKER = "/* tesso:theme */";

/** `@theme inline` block. Radius steps follow shadcn: sm/md/lg/xl from `--radius`. */
export function renderThemeInline() {
  const lines = [THEME_MARKER, "@theme inline {"];
  for (const name of BRIDGE_COLOR_NAMES) {
    lines.push(`  --color-${name}: var(--${name});`);
  }
  lines.push("  --radius-sm: calc(var(--radius) - 4px);");
  lines.push("  --radius-md: calc(var(--radius) - 2px);");
  lines.push("  --radius-lg: var(--radius);");
  lines.push("  --radius-xl: calc(var(--radius) + 4px);");
  lines.push("}");
  return lines.join("\n");
}

/**
 * Insert or replace the bridge. Returns the next file text and whether it changed.
 * A missing file is created with `@import "tailwindcss"` so Fusor can compile it.
 */
export function applyThemeInline(source) {
  const block = renderThemeInline();
  if (source == null) {
    return { text: `@import "tailwindcss";\n\n${block}\n`, changed: true, created: true };
  }
  const pattern = new RegExp(`${escapeRegExp(THEME_MARKER)}\\s*@theme inline \\{[\\s\\S]*?\\}\\n?`);
  if (pattern.test(source)) {
    const text = source.replace(pattern, `${block}\n`);
    return { text, changed: text !== source, created: false };
  }
  const importMatch = /@import\s+["']tailwindcss["']\s*;?/.exec(source);
  if (importMatch) {
    const at = importMatch.index + importMatch[0].length;
    const text = `${source.slice(0, at)}\n\n${block}\n${source.slice(at)}`;
    return { text, changed: true, created: false };
  }
  const text = `${block}\n\n${source.replace(/^\n*/, "")}`;
  return { text: text.endsWith("\n") ? text : `${text}\n`, changed: true, created: false };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
