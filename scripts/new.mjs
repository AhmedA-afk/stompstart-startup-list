import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const slug = process.argv[2];
if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug) || slug.length > 80) {
  throw new Error("Usage: npm run new -- <lowercase-startup-slug>");
}
const example = await readFile(new URL("../examples/example.yaml", import.meta.url), "utf8");
const profile = example
  .replace("stp_aaaaaaaaaaaaaaaaaaaaaaaaaa", `stp_${randomBytes(13).toString("hex")}`)
  .replace("sub_bbbbbbbbbbbbbbbbbbbbbbbbbb", `sub_${randomBytes(13).toString("hex")}`)
  .replace("src_aaaaaaaaaaaa", `src_${randomBytes(6).toString("hex")}`)
  .replace("example-product", slug);
const target = new URL(`../startups/${slug}.yaml`, import.meta.url);
await writeFile(target, profile, { flag: "wx" });
process.stdout.write(`Created startups/${slug}.yaml. Replace the example facts and URLs before submitting.\n`);
