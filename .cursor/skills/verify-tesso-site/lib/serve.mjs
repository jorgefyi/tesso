import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { URL } from "node:url";

/**
 * Static server for site/dist with the same SPA rewrites as site/vercel.json.
 * fusor preview/dev return 404 for /docs/*; production Vercel rewrites those
 * paths to index.html. Verification must use this server (or an equivalent).
 */

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".wasm": "application/wasm",
  ".map": "application/json",
  ".txt": "text/plain; charset=utf-8",
};

const DOC_PAGES = new Set([
  "install",
  "init",
  "check",
  "add",
  "button",
  "card",
  "dialog",
]);

function rewriteTarget(pathname) {
  const clean = pathname.replace(/\/+$/, "") || "/";
  const docs = clean.match(/^\/docs\/([^/]+)$/);
  if (docs && DOC_PAGES.has(docs[1])) {
    return "/index.html";
  }
  if (clean === "/test") {
    return "/index.html";
  }
  return null;
}

function safeJoin(root, requestPath) {
  const decoded = decodeURIComponent(requestPath.split("?")[0]);
  const joined = path.normalize(path.join(root, decoded));
  if (!joined.startsWith(root)) {
    return null;
  }
  return joined;
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || "application/octet-stream";
  const body = fs.readFileSync(filePath);
  res.writeHead(200, {
    "content-type": type,
    "content-length": body.length,
    "cache-control": "no-store",
  });
  res.end(body);
}

function sendNotFound(res, distRoot) {
  const fallback = path.join(distRoot, "404.html");
  if (fs.existsSync(fallback)) {
    const body = fs.readFileSync(fallback);
    res.writeHead(404, {
      "content-type": "text/html; charset=utf-8",
      "content-length": body.length,
      "cache-control": "no-store",
    });
    res.end(body);
    return;
  }
  res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  res.end("Not found");
}

export function createSiteServer(distRoot) {
  const root = path.resolve(distRoot);
  if (!fs.existsSync(path.join(root, "index.html"))) {
    throw new Error(`Missing ${path.join(root, "index.html")}. Run fusor build in site/ first.`);
  }

  return http.createServer((req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
    let pathname = url.pathname;
    if (pathname === "/") {
      pathname = "/index.html";
    }

    const rewritten = rewriteTarget(url.pathname);
    if (rewritten) {
      sendFile(res, path.join(root, "index.html"));
      return;
    }

    const filePath = safeJoin(root, pathname);
    if (!filePath) {
      res.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
      res.end("Bad path");
      return;
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      sendFile(res, filePath);
      return;
    }

    // Directory index
    const indexInDir = path.join(filePath, "index.html");
    if (fs.existsSync(indexInDir) && fs.statSync(indexInDir).isFile()) {
      sendFile(res, indexInDir);
      return;
    }

    sendNotFound(res, root);
  });
}

export function listen(server, { host = "127.0.0.1", port }) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve(`http://${host}:${port}`);
    });
  });
}
