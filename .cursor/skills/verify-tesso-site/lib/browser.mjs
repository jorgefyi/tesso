import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

/**
 * One shared Chromium context per process, pointed at the verification origin.
 * Theme state lives in localStorage; clear it between journeys when needed.
 */

let browser;
let context;
let page;

function requirePage() {
  if (!page) {
    throw new Error("No browser page. Run: control-tesso-site browser open");
  }
  return page;
}

export async function openBrowser({ baseUrl, headed = false }) {
  if (browser) {
    await closeBrowser();
  }
  browser = await chromium.launch({
    headless: !headed,
    args: ["--disable-dev-shm-usage"],
  });
  context = await browser.newContext({
    baseURL: baseUrl,
    viewport: { width: 1280, height: 800 },
    permissions: ["clipboard-read", "clipboard-write"],
  });
  page = await context.newPage();
  await page.goto("/", { waitUntil: "networkidle" });
  return { url: page.url(), title: await page.title() };
}

export async function closeBrowser() {
  if (browser) {
    await browser.close();
  }
  browser = undefined;
  context = undefined;
  page = undefined;
}

function locatorFor({ role, name, selector, text }) {
  const p = requirePage();
  if (selector) {
    return p.locator(selector);
  }
  if (role && name) {
    return p.getByRole(role, { name: new RegExp(name, "i") });
  }
  if (role) {
    return p.getByRole(role);
  }
  if (text) {
    return p.getByText(text, { exact: false });
  }
  throw new Error("Need --selector, --role/--name, or --text");
}

export async function goto(pathname) {
  const p = requirePage();
  await p.goto(pathname, { waitUntil: "networkidle" });
  return { url: p.url(), title: await p.title() };
}

export async function click(opts) {
  const loc = locatorFor(opts).first();
  await loc.click();
  return { ok: true };
}

export async function press({ key }) {
  const p = requirePage();
  await p.keyboard.press(key);
  return { ok: true, key };
}

export async function evalJs({ expression }) {
  const p = requirePage();
  const value = await p.evaluate((expr) => {
    // eslint-disable-next-line no-eval
    return eval(expr);
  }, expression);
  return { value };
}

export async function screenshot({ outPath }) {
  const p = requirePage();
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  await p.screenshot({ path: outPath, fullPage: false });
  return { path: outPath };
}

export async function ariaSnapshot({ outPath }) {
  const p = requirePage();
  const root = p.locator("body");
  const snapshot = await root.ariaSnapshot();
  if (outPath) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, snapshot, "utf8");
  }
  return { snapshot, path: outPath || null };
}

export async function textContent(opts) {
  const loc = locatorFor(opts).first();
  const text = await loc.innerText();
  return { text: text.trim() };
}

export async function waitFor({ role, name, selector, text, state = "visible", timeout = 10000 }) {
  const loc = locatorFor({ role, name, selector, text }).first();
  await loc.waitFor({ state, timeout: Number(timeout) });
  return { ok: true };
}

export async function clipboardRead() {
  const p = requirePage();
  const value = await p.evaluate(async () => navigator.clipboard.readText());
  return { value };
}

export async function localStorageGet({ key }) {
  const p = requirePage();
  const value = await p.evaluate((k) => localStorage.getItem(k), key);
  return { key, value };
}

export async function localStorageSet({ key, value }) {
  const p = requirePage();
  await p.evaluate(([k, v]) => localStorage.setItem(k, v), [key, value]);
  return { key, value };
}

export async function localStorageClear() {
  const p = requirePage();
  await p.evaluate(() => localStorage.clear());
  return { ok: true };
}

export async function htmlClassList() {
  const p = requirePage();
  const classes = await p.evaluate(() => Array.from(document.documentElement.classList));
  return { classes };
}

export async function info() {
  const p = requirePage();
  return {
    url: p.url(),
    title: await p.title(),
    classes: (await htmlClassList()).classes,
  };
}
