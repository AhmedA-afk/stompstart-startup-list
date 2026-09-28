import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const [slug, startupId] = process.argv.slice(2);
if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug) || slug.length > 80 ||
  !startupId || !/^stp_[0-9a-z]{26}$/u.test(startupId) || process.argv.length !== 4) {
  throw new Error("Usage: npm run new:launch -- <published-startup-slug> <startup-id>");
}
const launchId = `lch_${randomBytes(13).toString("hex")}`;
const example = await readFile(new URL("../examples/launch.yaml", import.meta.url), "utf8");
const text = example
  .replace("example-product", slug)
  .replace("lch_aaaaaaaaaaaaaaaaaaaaaaaaaa", launchId)
  .replace("stp_aaaaaaaaaaaaaaaaaaaaaaaaaa", startupId);
const path = `../launches/${slug}-${launchId}.yaml`;
await writeFile(new URL(path, import.meta.url), text, { flag: "wx" });
process.stdout.write(`Created launches/${slug}-${launchId}.yaml. Replace the example claims and source before submitting.\n`);
