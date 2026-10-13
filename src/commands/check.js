import fs from "node:fs";
import path from "node:path";
import { checkTokensCss } from "../css-tokens.js";
import { readConfig } from "../config.js";

export async function checkCommand(cwd, { stdout, stderr }) {
  const config = readConfig(cwd, { warn: (message) => stderr?.write(`${message}\n`) });
  const file = path.resolve(cwd, config.outFile);
  if (!fs.existsSync(file)) {
    throw new Error(`Missing ${config.outFile}. Run tesso init to write it.`);
  }
  const css = fs.readFileSync(file, "utf8");
  const result = checkTokensCss(css, config);
  if (result.errors.length) {
    throw new Error(result.errors.join("\n"));
  }
  stdout.write(`${result.summary}\n`);
}
