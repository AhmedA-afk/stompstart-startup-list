import { mkdir, readFile, writeFile } from "node:fs/promises";

const slug = process.argv[2];
if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug) || slug.length > 80 || process.argv.length !== 3) {
  throw new Error("Usage: npm run new -- <lowercase-startup-slug>");
}
const example = await readFile(new URL("../examples/startup.yaml", import.meta.url), "utf8");
await writeFile(new URL(`../startups/${slug}.yaml`, import.meta.url), example, { flag: "wx" });
await mkdir(new URL(`../startups/${slug}/`, import.meta.url));
process.stdout.write(
  `Created startups/${slug}.yaml and startups/${slug}/. Replace every sample value, add the logo and product images to the folder, then run npm run validate and npm run eligibility -- ${slug}.\n`,
);
