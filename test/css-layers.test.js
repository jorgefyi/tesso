import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repo = path.resolve(import.meta.dirname, "..");

const PREFLIGHT = `
@layer base {
  *, :before, :after { margin: 0; padding: 0; }
  button, input, select, optgroup, textarea { font: inherit; color: inherit; background-color: #0000; border-radius: 0; }
}
`;

const VARIANTS = ["primary", "secondary", "quiet", "danger"];
const SIZES = ["sm", "md", "lg"];

function componentCss() {
  return ["button", "card", "dialog"]
    .map((name) => {
      const json = JSON.parse(fs.readFileSync(path.join(repo, "registry", `${name}.json`), "utf8"));
      return json.css.content;
    })
    .join("\n");
}

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

function parseLayers(css) {
  const order = [];
  const rules = [];
  const add = (name) => {
    if (name && !order.includes(name)) order.push(name);
  };
  const source = stripComments(css);
  let i = 0;
  while (i < source.length) {
    const at = source.indexOf("@layer", i);
    if (at === -1) break;
    let j = at + "@layer".length;
    while (source[j] === " " || source[j] === "\n" || source[j] === "\t") j += 1;
    const headEnd = source.slice(j).search(/[{;]/);
    const head = source.slice(j, j + headEnd).trim();
    const punct = source[j + headEnd];
    const names = head.split(",").map((name) => name.trim()).filter(Boolean);
    if (punct === ";") {
      for (const name of names) add(name);
      i = j + headEnd + 1;
      continue;
    }
    add(names[0]);
    let depth = 0;
    let k = j + headEnd;
    const start = k + 1;
    for (; k < source.length; k += 1) {
      if (source[k] === "{") depth += 1;
      else if (source[k] === "}") {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    extractRules(source.slice(start, k), names[0], rules);
    i = k + 1;
  }
  return { order, rules };
}

function extractRules(body, layer, rules) {
  let depth = 0;
  let start = 0;
  for (let i = 0; i < body.length; i += 1) {
    if (body[i] === "{") {
      if (depth === 0) {
        const selector = body.slice(start, i).trim();
        const declStart = i + 1;
        let inner = 1;
        let k = i + 1;
        for (; k < body.length; k += 1) {
          if (body[k] === "{") inner += 1;
          else if (body[k] === "}") {
            inner -= 1;
            if (inner === 0) break;
          }
        }
        if (selector && !selector.startsWith("@")) {
          for (const part of selector.split(",")) {
            rules.push({ layer, selector: part.trim(), decls: declarations(body.slice(declStart, k)), index: rules.length });
          }
        }
        i = k;
        start = k + 1;
      } else depth += 1;
    }
  }
}

function declarations(block) {
  const decls = [];
  for (const piece of block.split(";")) {
    const split = piece.split(":");
    if (split.length < 2) continue;
    const prop = split.shift().trim();
    const value = split.join(":").trim();
    if (prop && value) decls.push([prop, value]);
  }
  return decls;
}

function matches(selector, element) {
  if (selector === "*") return true;
  if (selector.includes(":") || selector.includes("[") || selector.includes(">")) return false;
  const match = selector.match(/^([a-zA-Z][\w-]*)?((?:\.[_a-zA-Z][\w-]*)*)$/);
  if (!match) return false;
  const tag = match[1];
  const classes = match[2] ? match[2].split(".").filter(Boolean) : [];
  if (tag && tag !== element.tag) return false;
  return classes.every((name) => element.classes.has(name));
}

function specificity(selector) {
  if (selector === "*") return [0, 0, 0];
  return [0, (selector.match(/\./g) || []).length, /^[a-zA-Z]/.test(selector) ? 1 : 0];
}

function expand(prop, value) {
  if (prop === "background") return [["background-color", value]];
  if (prop === "font") {
    if (value.trim() === "inherit") return [["font-size", "inherit"]];
    const size = value.match(/(\d*\.?\d+rem)/);
    return [["font-size", size ? size[1] : value]];
  }
  return [[prop, value]];
}

function winning(css, element, prop) {
  const { order, rules } = parseLayers(`${css}\n${PREFLIGHT}`);
  let best = null;
  for (const rule of rules) {
    if (!matches(rule.selector, element)) continue;
    const spec = specificity(rule.selector);
    const layer = order.indexOf(rule.layer);
    for (const [rawProp, rawValue] of rule.decls) {
      for (const [name, value] of expand(rawProp, rawValue)) {
        if (name !== prop) continue;
        const candidate = { layer, spec, index: rule.index, value };
        if (
          !best ||
          candidate.layer > best.layer ||
          (candidate.layer === best.layer &&
            (candidate.spec[1] > best.spec[1] ||
              (candidate.spec[1] === best.spec[1] && candidate.spec[2] > best.spec[2]) ||
              (candidate.spec[1] === best.spec[1] && candidate.spec[2] === best.spec[2] && candidate.index > best.index)))
        ) {
          best = candidate;
        }
      }
    }
  }
  return best ? best.value : null;
}

test("variant and size classes survive Tailwind preflight", () => {
  const css = componentCss();
  const button = JSON.parse(fs.readFileSync(path.join(repo, "registry", "button.json"), "utf8"));
  const markup = button.files.find((file) => file.target.endsWith("button.html")).content;
  for (const variant of VARIANTS) {
    assert.match(css, new RegExp(`\\.tesso-button-${variant}\\b`));
    assert.match(markup, new RegExp(`tesso-button-${variant}`));
  }
  for (const size of SIZES) assert.match(markup, new RegExp(`tesso-button-${size}`));
  assert.match(css, /\.tesso-button-sm\b/);
  assert.match(css, /\.tesso-button-lg\b/);
  const built = fs.readFileSync(path.join(repo, "site", "public", "tesso.css"), "utf8");
  for (const variant of VARIANTS) assert.match(built, new RegExp(`\\.tesso-button-${variant}\\b`));
  assert.match(built, /\.tesso-button-sm\b/);
  assert.match(built, /\.tesso-button-lg\b/);

  const danger = { tag: "button", classes: new Set(["tesso-button", "tesso-button-danger", "tesso-button-lg"]) };
  assert.equal(winning(css, danger, "padding"), "0.75rem 1.25rem");
  assert.equal(winning(css, danger, "background-color"), "var(--destructive)");
  assert.equal(winning(css, danger, "font-size"), "1rem");
  assert.equal(winning(css, danger, "border-radius"), "calc(var(--radius) - 2px)");

  const secondary = { tag: "button", classes: new Set(["tesso-button", "tesso-button-secondary", "tesso-button-md"]) };
  assert.equal(winning(css, secondary, "padding"), "0.5rem 1rem");
  assert.equal(winning(css, secondary, "background-color"), "var(--secondary)");

  const quiet = { tag: "button", classes: new Set(["tesso-button", "tesso-button-quiet", "tesso-button-sm"]) };
  assert.equal(winning(css, quiet, "padding"), "0.25rem 0.75rem");
  assert.equal(winning(css, quiet, "background-color"), "var(--muted)");
  assert.equal(winning(css, quiet, "font-size"), "0.75rem");

  const card = { tag: "article", classes: new Set(["tesso-card"]) };
  assert.equal(winning(css, card, "padding"), "1.5rem");
  assert.equal(winning(css, card, "background-color"), "var(--card)");
  assert.equal(winning(built, card, "padding"), "1.5rem");
});
