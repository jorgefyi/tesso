import { listComponents, resolveRegistry } from "../registry.js";

export async function listCommand(config, { stdout, cwd, registry }) {
  const source = resolveRegistry(registry ?? config?.registry, cwd);
  const items = await listComponents(source);
  const lines = [`Components from ${source.label}:`, ""];
  for (const item of items) {
    const deps = item.dependencies.length ? ` (needs ${item.dependencies.join(", ")})` : "";
    lines.push(`  ${item.name.padEnd(10)} ${item.title} — ${item.description}${deps}`);
  }
  lines.push("");
  lines.push("Add one with `tesso add <component>`. A file that already differs is left alone unless you pass --force.");
  stdout.write(`${lines.join("\n")}\n`);
}
