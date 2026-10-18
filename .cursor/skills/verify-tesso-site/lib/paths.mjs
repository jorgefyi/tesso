import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Skill root: .cursor/skills/verify-tesso-site */
export const skillRoot = path.resolve(__dirname, "..");

/** Repository root (two levels above .cursor/skills/verify-tesso-site). */
export const repoRoot = path.resolve(skillRoot, "../../..");

export const siteRoot = path.join(repoRoot, "site");
export const siteDist = path.join(siteRoot, "dist");

/**
 * Isolation root for one verification run.
 * Override with TESSO_VERIFY_DIR. Default: /tmp/tesso-site-verify-$RUN_ID
 */
export function verifyDir() {
  if (process.env.TESSO_VERIFY_DIR) {
    return path.resolve(process.env.TESSO_VERIFY_DIR);
  }
  const runId = process.env.RUN_ID || process.env.TESSO_RUN_ID || String(process.pid);
  return path.join("/tmp", `tesso-site-verify-${runId}`);
}

export function statePath() {
  return path.join(verifyDir(), "state.json");
}

export function defaultPort() {
  const raw = process.env.TESSO_SITE_PORT || "44780";
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid TESSO_SITE_PORT: ${raw}`);
  }
  return port;
}

/** Durable proof location named in the skill Evidence section. */
export const evidenceRoot =
  process.env.TESSO_EVIDENCE_DIR ||
  "/cursor/stores/bc-e139e1a6-3f39-591d-a24b-dec202a1d280/media/verify-tesso-site";

export function fusorBinHint() {
  return path.join(homedir(), ".fusor", "bin");
}
