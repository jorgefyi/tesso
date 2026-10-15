import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const siteDir = path.dirname(fileURLToPath(import.meta.url));
const registryDir = path.resolve(siteDir, "../registry");
const outDir = path.join(siteDir, "public", "r");

fs.mkdirSync(outDir, { recursive: true });
const names = fs
  .readdirSync(registryDir)
  .filter((name) => name.endsWith(".json") && name !== "index.json")
  .sort();

const components = [];
for (const filename of names) {
  const source = path.join(registryDir, filename);
  const json = JSON.parse(fs.readFileSync(source, "utf8"));
  fs.copyFileSync(source, path.join(outDir, filename));
  components.push({
    name: json.name,
    title: json.title,
    description: json.description,
    dependencies: json.dependencies ?? [],
  });
}

const index = {
  registry: "https://tesso.fyi/r/",
  components,
};
fs.writeFileSync(path.join(outDir, "index.json"), `${JSON.stringify(index, null, 2)}\n`);
