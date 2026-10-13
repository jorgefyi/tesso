import { SEMANTIC_COLOR_IDS } from "./names.js";

/** Light values. Same oklch as 0.3.1. */
export const LIGHT_COLORS = {
  accent: "oklch(91% 0.01 260)",
  "accent-foreground": "oklch(18% 0.02 260)",
  background: "oklch(99% 0.005 260)",
  border: "oklch(86% 0.012 260)",
  card: "oklch(97% 0.006 260)",
  "card-foreground": "oklch(18% 0.02 260)",
  destructive: "oklch(55% 0.19 25)",
  foreground: "oklch(18% 0.02 260)",
  input: "oklch(86% 0.012 260)",
  muted: "oklch(94% 0.008 260)",
  "muted-foreground": "oklch(44% 0.018 260)",
  popover: "oklch(97% 0.006 260)",
  "popover-foreground": "oklch(18% 0.02 260)",
  primary: "oklch(55% 0.18 264)",
  "primary-foreground": "oklch(99% 0.005 260)",
  ring: "oklch(70% 0.16 264)",
  secondary: "oklch(94% 0.008 260)",
  "secondary-foreground": "oklch(18% 0.02 260)",
};

/** Dark values. Same oklch as 0.3.1. `--radius` stays on `:root`. */
export const DARK_COLORS = {
  accent: "oklch(44% 0.018 260)",
  "accent-foreground": "oklch(99% 0.005 260)",
  background: "oklch(18% 0.02 260)",
  border: "oklch(36% 0.018 260)",
  card: "oklch(27% 0.02 260)",
  "card-foreground": "oklch(99% 0.005 260)",
  destructive: "oklch(68% 0.17 25)",
  foreground: "oklch(99% 0.005 260)",
  input: "oklch(52% 0.016 260)",
  muted: "oklch(36% 0.018 260)",
  "muted-foreground": "oklch(86% 0.012 260)",
  popover: "oklch(27% 0.02 260)",
  "popover-foreground": "oklch(99% 0.005 260)",
  primary: "oklch(70% 0.16 264)",
  "primary-foreground": "oklch(18% 0.02 260)",
  ring: "oklch(92% 0.04 264)",
  secondary: "oklch(36% 0.018 260)",
  "secondary-foreground": "oklch(99% 0.005 260)",
};

export const RADIUS = "0.625rem";

/** 18 colors plus `--radius`, in the order `init` writes them. */
export const TOKEN_IDS = [...SEMANTIC_COLOR_IDS, "radius"];

export function tokenName(id, prefix = "") {
  return prefix ? `--${prefix}-${id}` : `--${id}`;
}

/** Starter stylesheet. The project owns the file after `init` writes it. */
export function renderTokensCss(prefix = "") {
  const light = [
    ...SEMANTIC_COLOR_IDS.map((id) => [id, LIGHT_COLORS[id]]),
    ["radius", RADIUS],
  ].sort((a, b) => a[0].localeCompare(b[0]));
  const dark = SEMANTIC_COLOR_IDS.map((id) => [id, DARK_COLORS[id]]).sort((a, b) =>
    a[0].localeCompare(b[0]),
  );
  const lines = [
    "/* Design tokens. Edit these values; tesso check reads this file. */",
    "",
    ":root {",
    ...light.map(([id, value]) => `  ${tokenName(id, prefix)}: ${value};`),
    "}",
    "",
    ".dark {",
    ...dark.map(([id, value]) => `  ${tokenName(id, prefix)}: ${value};`),
    "}",
    "",
  ];
  return lines.join("\n");
}
