import http from "node:http";
import * as browser from "./browser.mjs";

/**
 * Tiny JSON RPC over HTTP so each `control-tesso-site browser …` invocation
 * talks to one long-lived Chromium context owned by the driver process.
 */

export function createBrowserDriver({ baseUrl }) {
  const server = http.createServer(async (req, res) => {
    if (req.method !== "POST") {
      res.writeHead(405);
      res.end("POST only");
      return;
    }
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    let body;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
    } catch {
      res.writeHead(400);
      res.end("bad json");
      return;
    }
    try {
      const result = await dispatch(body, baseUrl);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: err.message || String(err) }));
    }
  });
  return server;
}

async function dispatch(body, baseUrl) {
  const { op, args = {} } = body;
  switch (op) {
    case "open":
      return browser.openBrowser({ baseUrl, headed: Boolean(args.headed) });
    case "close":
      await browser.closeBrowser();
      return { ok: true };
    case "goto":
      return browser.goto(args.path);
    case "click":
      return browser.click(args);
    case "press":
      return browser.press(args);
    case "wait":
      return browser.waitFor(args);
    case "text":
      return browser.textContent(args);
    case "eval":
      return browser.evalJs({ expression: args.expression });
    case "info":
      return browser.info();
    case "screenshot":
      return browser.screenshot({ outPath: args.path });
    case "snapshot":
      return browser.ariaSnapshot({ outPath: args.path });
    case "clipboard":
      return browser.clipboardRead();
    case "storage-get":
      return browser.localStorageGet(args);
    case "storage-set":
      return browser.localStorageSet(args);
    case "storage-clear":
      return browser.localStorageClear();
    case "html-class":
      return browser.htmlClassList();
    case "ping":
      return { ok: true };
    default:
      throw new Error(`Unknown browser op: ${op}`);
  }
}

export async function callDriver(driverUrl, op, args = {}) {
  const res = await fetch(driverUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ op, args }),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Driver non-JSON (${res.status}): ${text}`);
  }
  if (!res.ok) {
    throw new Error(data.error || `Driver error ${res.status}`);
  }
  return data;
}
