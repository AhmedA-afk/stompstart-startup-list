import { mkdir, readFile, writeFile } from "node:fs/promises";

const [slug, name] = process.argv.slice(2);
const pattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
if (!slug || !name || !pattern.test(slug) || !pattern.test(name) || process.argv.length !== 4) {
  throw new Error("Usage: npm run new:launch -- <published-startup-slug> <launch-name>");
}
const example = await readFile(new URL("../examples/launch.yaml", import.meta.url), "utf8");
await mkdir(new URL(`../launches/${slug}/`, import.meta.url), { recursive: true });
await writeFile(new URL(`../launches/${slug}/${name}.yaml`, import.meta.url), example, { flag: "wx" });
process.stdout.write(
  `Created launches/${slug}/${name}.yaml. Replace the example claims and source before submitting.\n`,
);
