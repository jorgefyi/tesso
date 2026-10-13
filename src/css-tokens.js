import { SEMANTIC_COLOR_IDS } from "./names.js";
import { tokenName } from "./tokens-css.js";

/** Text on a surface. The last pair is the danger button: it has no destructive-foreground. */
export const CONTRAST_PAIRS = [
  ["foreground", "background"],
  ["card-foreground", "card"],
  ["popover-foreground", "popover"],
  ["primary-foreground", "primary"],
  ["secondary-foreground", "secondary"],
  ["muted-foreground", "muted"],
  ["accent-foreground", "accent"],
  ["primary-foreground", "destructive"],
];

const AA = 4.5;

const LENGTH =
  /^(?:0|-?(?:\d+\.?\d*|\.\d+)(?:px|rem|em|%|ch|ex|vw|vh|vmin|vmax|cm|mm|in|pt|pc|q|lh|rlh|cap|ic|dvh|svh|lvh|dvw|svw|lvw))$/;

/**
 * Read `:root` and `.dark`, require every token, valid oklch (or a length for
 * radius), and WCAG AA contrast. Returns errors; does not throw.
 */
export function checkTokensCss(css, config) {
  const errors = [];
  const label = config.outFile;
  if (/prefers-color-scheme/.test(css)) {
    errors.push(
      `${label} must not use prefers-color-scheme. Put .dark on <html> in the app.`,
    );
  }
  const root = themeMap(css, ":root");
  const darkOnly = themeMap(css, ".dark");
  if (!root) errors.push(`${label} is missing :root.`);
  if (!darkOnly) errors.push(`${label} is missing .dark.`);
  if (!root || !darkOnly) return { errors };

  const rootNames = requiredNames(config.prefix);
  for (const name of rootNames) {
    if (!root.has(name)) errors.push(`${label} is missing ${name} on :root.`);
  }
  for (const id of SEMANTIC_COLOR_IDS) {
    const name = tokenName(id, config.prefix);
    if (!darkOnly.has(name)) errors.push(`${label} is missing ${name} on .dark.`);
  }
  if (errors.length) return { errors };

  const dark = new Map(root);
  for (const [name, value] of darkOnly) dark.set(name, value);

  const rootResolved = resolveTheme(root, ":root", label, errors);
  const darkResolved = resolveTheme(dark, ".dark", label, errors);
  if (errors.length) return { errors };

  for (const id of SEMANTIC_COLOR_IDS) {
    const name = tokenName(id, config.prefix);
    assertColor(rootResolved.get(name), name, ":root", label, errors);
    assertColor(darkResolved.get(name), name, ".dark", label, errors);
  }
  const radius = tokenName("radius", config.prefix);
  assertRadius(rootResolved.get(radius), radius, label, errors);
  if (errors.length) return { errors };

  for (const selector of [":root", ".dark"]) {
    const theme = selector === ":root" ? rootResolved : darkResolved;
    for (const [fgId, bgId] of CONTRAST_PAIRS) {
      const fgName = tokenName(fgId, config.prefix);
      const bgName = tokenName(bgId, config.prefix);
      const ratio = contrastRatio(parseOklch(theme.get(fgName)), parseOklch(theme.get(bgName)));
      if (ratio + 1e-9 < AA) {
        errors.push(
          `${fgName} on ${bgName} in ${selector} is ${formatRatio(ratio)}:1, below WCAG AA ${AA}:1.`,
        );
      }
    }
  }

  return {
    errors,
    summary: `ok — ${label} has ${rootNames.length} tokens; foreground and background pairs meet WCAG AA ${AA}:1 on :root and .dark`,
  };
}

/** Custom property names declared on `:root`, without the leading dashes. */
export function rootCustomProperties(css) {
  const root = themeMap(css, ":root");
  if (!root) return [];
  return [...root.keys()].map((name) => name.slice(2));
}

function requiredNames(prefix) {
  return [...SEMANTIC_COLOR_IDS.map((id) => tokenName(id, prefix)), tokenName("radius", prefix)];
}

function themeMap(css, selector) {
  const map = new Map();
  let found = false;
  for (const block of ruleBlocks(stripComments(css))) {
    if (block.prelude !== selector) continue;
    found = true;
    for (const [name, value] of declarations(block.body)) map.set(name, value);
  }
  return found ? map : null;
}

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

function ruleBlocks(css) {
  const blocks = [];
  const walk = (text) => {
    let i = 0;
    while (i < text.length) {
      const open = text.indexOf("{", i);
      if (open === -1) break;
      const prelude = text.slice(i, open).replace(/\s+/g, " ").trim();
      let depth = 1;
      let j = open + 1;
      while (j < text.length && depth > 0) {
        if (text[j] === "{") depth += 1;
        else if (text[j] === "}") depth -= 1;
        j += 1;
      }
      const body = text.slice(open + 1, j - 1);
      if (prelude.startsWith("@")) walk(body);
      else if (prelude) blocks.push({ prelude, body });
      i = j;
    }
  };
  walk(css);
  return blocks;
}

function declarations(body) {
  const map = new Map();
  const flat = body.replace(/\{[^{}]*\}/g, " ");
  for (const part of flat.split(";")) {
    const line = part.trim();
    if (!line) continue;
    const match = /^(--[A-Za-z0-9-]+)\s*:\s*([\s\S]+)$/.exec(line);
    if (match) map.set(match[1], match[2].trim().replace(/\s+/g, " "));
  }
  return map;
}

function resolveTheme(decls, selector, label, errors) {
  const resolved = new Map();
  const resolving = new Set();

  const visit = (name) => {
    if (resolved.has(name)) return resolved.get(name);
    if (!decls.has(name)) {
      errors.push(`${label}: ${name} on ${selector} is not set in this theme.`);
      return null;
    }
    if (resolving.has(name)) {
      errors.push(`${label}: ${name} on ${selector} refers to itself through var().`);
      return null;
    }
    resolving.add(name);
    const raw = decls.get(name);
    const alias = parseVar(raw);
    let value = raw;
    if (alias) {
      if (decls.has(alias.name)) {
        const next = visit(alias.name);
        if (next == null) {
          resolving.delete(name);
          resolved.set(name, null);
          return null;
        }
        value = next;
      } else if (alias.fallback != null) {
        value = alias.fallback;
      } else {
        errors.push(
          `${label}: ${name} on ${selector} is var(${alias.name}), and ${alias.name} is not set in this theme.`,
        );
        resolving.delete(name);
        resolved.set(name, null);
        return null;
      }
    }
    resolving.delete(name);
    resolved.set(name, value);
    return value;
  };

  for (const name of decls.keys()) visit(name);
  return resolved;
}

function parseVar(value) {
  const match = /^var\(\s*(--[A-Za-z0-9-]+)\s*(?:,\s*([^)]*))?\)$/.exec(value.trim());
  if (!match) return null;
  const fallback = match[2] != null ? match[2].trim() : null;
  return { name: match[1], fallback: fallback === "" ? null : fallback };
}

function assertColor(value, name, selector, label, errors) {
  if (value == null) return;
  if (/^oklch\(/i.test(value)) {
    const parsed = parseOklch(value);
    if (!parsed) {
      errors.push(`${label}: ${name} on ${selector} is "${value}", which is not valid oklch().`);
      return;
    }
    if (!parsed.opaque) {
      errors.push(`${label}: ${name} on ${selector} must be an opaque oklch() color.`);
      return;
    }
    return;
  }
  errors.push(`${label}: ${name} on ${selector} is "${value}", which must be oklch() or var().`);
}

function assertRadius(value, name, label, errors) {
  if (value == null) return;
  if (LENGTH.test(value) || /^calc\([^;{}]+\)$/.test(value)) return;
  errors.push(`${label}: ${name} on :root is "${value}", which must be a length or var().`);
}

/** Parse `oklch(L C H)` or `oklch(L C H / alpha)`. L may be a percent or 0–1. */
export function parseOklch(input) {
  const match = /^oklch\(\s*([\s\S]*?)\s*\)$/i.exec(String(input).trim());
  if (!match) return null;
  let body = match[1].trim();
  let alpha = "1";
  const slash = body.indexOf("/");
  if (slash !== -1) {
    alpha = body.slice(slash + 1).trim();
    body = body.slice(0, slash).trim();
  }
  const parts = body.includes(",")
    ? body.split(",").map((part) => part.trim()).filter(Boolean)
    : body.split(/\s+/).filter(Boolean);
  if (parts.length !== 3) return null;
  const l = parseLightness(parts[0]);
  const c = parseChroma(parts[1]);
  const h = parseHue(parts[2]);
  const a = parseAlpha(alpha);
  if (l == null || c == null || h == null || a == null) return null;
  return { l, c, h, opaque: Math.abs(a - 1) < 1e-6, alpha: a };
}

function parseLightness(token) {
  if (token.endsWith("%")) {
    const n = Number(token.slice(0, -1));
    if (!Number.isFinite(n) || n < 0 || n > 100) return null;
    return n / 100;
  }
  const n = Number(token);
  if (!Number.isFinite(n) || n < 0 || n > 1) return null;
  return n;
}

function parseChroma(token) {
  if (token.endsWith("%")) {
    const n = Number(token.slice(0, -1));
    if (!Number.isFinite(n) || n < 0) return null;
    return (n / 100) * 0.4;
  }
  const n = Number(token);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function parseHue(token) {
  const match = /^(-?(?:\d+\.?\d*|\.\d+))(deg|rad|grad|turn)?$/.exec(token);
  if (!match) return null;
  const n = Number(match[1]);
  if (!Number.isFinite(n)) return null;
  switch (match[2]) {
    case "rad":
      return (n * 180) / Math.PI;
    case "grad":
      return n * 0.9;
    case "turn":
      return n * 360;
    default:
      return n;
  }
}

function parseAlpha(token) {
  if (token.endsWith("%")) {
    const n = Number(token.slice(0, -1));
    if (!Number.isFinite(n) || n < 0 || n > 100) return null;
    return n / 100;
  }
  const n = Number(token);
  if (!Number.isFinite(n) || n < 0 || n > 1) return null;
  return n;
}

/** WCAG relative luminance contrast. `oklch` values come from `parseOklch`. */
export function contrastRatio(a, b) {
  const ya = relativeLuminance(a);
  const yb = relativeLuminance(b);
  const hi = Math.max(ya, yb);
  const lo = Math.min(ya, yb);
  return (hi + 0.05) / (lo + 0.05);
}

function relativeLuminance(color) {
  const h = (color.h * Math.PI) / 180;
  const a = color.c * Math.cos(h);
  const b = color.c * Math.sin(h);
  const l_ = color.l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = color.l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = color.l - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  const r = clamp(+4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
  const g = clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
  const bl = clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s);
  return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
}

function clamp(n) {
  return Math.min(1, Math.max(0, n));
}

function formatRatio(n) {
  return (Math.round(n * 100) / 100).toFixed(2);
}
