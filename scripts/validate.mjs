import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import YAML from "yaml";

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const schemaBytes = await readFile(new URL("../profile.schema.json", import.meta.url));
const source = JSON.parse(await readFile(new URL("../contract-source.json", import.meta.url), "utf8"));
if (createHash("sha256").update(schemaBytes).digest("hex") !== source.schema_sha256) {
  throw new Error("Profile schema differs from its recorded source export.");
}
const schema = JSON.parse(schemaBytes.toString("utf8"));
const validate = ajv.compile(schema);
const launchSchemaBytes = await readFile(new URL("../launch.schema.json", import.meta.url));
if (createHash("sha256").update(launchSchemaBytes).digest("hex") !== source.launch_schema_sha256) {
  throw new Error("Launch schema differs from its recorded source export.");
}
const validateLaunch = ajv.compile(JSON.parse(launchSchemaBytes.toString("utf8")));
const root = new URL("../startups/", import.meta.url);
const names = (await readdir(root)).sort();
const errors = [];
const ids = new Map();

function checkUrl(url, label, protocols = ["https:"]) {
  if (url === undefined) return;
  try {
    const parsed = new URL(url);
    if (!protocols.includes(parsed.protocol) || parsed.username || parsed.password || parsed.hash) {
      errors.push(`${label}: use an allowed URL without credentials or a fragment`);
    }
  } catch {
    errors.push(`${label}: invalid URL`);
  }
}

function semantic(profile, filename) {
  if (filename !== `${profile.slug}.yaml`) errors.push(`${filename}: filename must match slug`);
  if (profile.listing_kind !== "discovery") errors.push(`${filename}: PR contributions must be discoveries`);
  if (profile.product.name === "Example Product" || profile.website.url?.startsWith("https://example.com/")) {
    errors.push(`${filename}: replace the example product and website`);
  }
  for (const key of ["startup_id", "subject_id"]) {
    const id = profile[key];
    if (id === "stp_aaaaaaaaaaaaaaaaaaaaaaaaaa" || id === "sub_bbbbbbbbbbbbbbbbbbbbbbbbbb") {
      errors.push(`${filename}: replace the sample ${key}`);
    }
    if (ids.has(id)) errors.push(`${filename}: ${key} is already used by ${ids.get(id)}`);
    else ids.set(id, filename);
  }
  if (profile.website.state !== "known") errors.push(`${filename}: discovery requires an official website`);
  if (profile.access.state !== "available") errors.push(`${filename}: discovery requires browse, signup, demo or waitlist`);
  if (profile.classification.stage === "unknown") errors.push(`${filename}: discovery requires a known stage`);
  const categories = profile.classification.categories;
  if (categories.join("\0") !== [...new Set(categories)].sort().join("\0")) {
    errors.push(`${filename}: categories must be unique and sorted`);
  }
  const sourceIds = profile.sources.map((source) => source.source_id);
  if (new Set(sourceIds).size !== sourceIds.length) errors.push(`${filename}: source IDs must be unique`);
  const links = profile.links.map((link) => `${link.kind}:${link.url}`);
  if (new Set(links).size !== links.length) errors.push(`${filename}: links must be unique`);
  if (profile.founded.state === "known" && profile.launched.state === "known" && profile.launched.date < profile.founded.date) {
    errors.push(`${filename}: launch date cannot precede founding`);
  }
  checkUrl(profile.website.url, `${filename}: website`);
  checkUrl(profile.access.url, `${filename}: access`);
  checkUrl(profile.pricing.pricing_url, `${filename}: pricing URL`);
  for (const [index, founder] of (profile.founders.people ?? []).entries()) {
    checkUrl(founder.public_url, `${filename}: founder ${index + 1} URL`);
  }
  for (const [index, link] of profile.links.entries()) checkUrl(link.url, `${filename}: link ${index + 1}`);
  for (const [index, source] of profile.sources.entries()) {
    checkUrl(source.url, `${filename}: source ${index + 1}`, ["http:", "https:"]);
  }
}

for (const name of names) {
  if (!name.endsWith(".yaml")) {
    if (name !== ".gitkeep") errors.push(`startups/${name}: only .yaml files are allowed`);
    continue;
  }
  const file = join(fileURLToPath(root), name);
  const document = YAML.parseDocument(await readFile(file, "utf8"), { uniqueKeys: true, strict: true });
  if (document.errors.length) {
    errors.push(...document.errors.map((error) => `${name}: ${error.message}`));
    continue;
  }
  const profile = document.toJS();
  if (!validate(profile)) {
    errors.push(...(validate.errors ?? []).map((error) => `${name}: ${error.instancePath || "/"} ${error.message}`));
    continue;
  }
  semantic(profile, name);
}

const launchRoot = new URL("../launches/", import.meta.url);
const launchNames = (await readdir(launchRoot)).sort();
const launchIds = new Map();
for (const name of launchNames) {
  if (name === ".gitkeep") continue;
  if (!/^([a-z0-9]+(?:-[a-z0-9]+)*)-(lch_[0-9a-z]{26})\.yaml$/u.test(name)) {
    errors.push(`launches/${name}: use <startup-slug>-<launch-id>.yaml`);
    continue;
  }
  const file = join(fileURLToPath(launchRoot), name);
  const document = YAML.parseDocument(await readFile(file, "utf8"), { uniqueKeys: true, strict: true });
  if (document.errors.length) {
    errors.push(...document.errors.map((error) => `launches/${name}: ${error.message}`));
    continue;
  }
  const proposal = document.toJS({ maxAliasCount: 0 });
  if (!validateLaunch(proposal)) {
    errors.push(...(validateLaunch.errors ?? []).map((error) =>
      `launches/${name}: ${error.instancePath || "/"} ${error.message}`));
    continue;
  }
  if (name !== `${proposal.startup_slug}-${proposal.launch_id}.yaml`) {
    errors.push(`launches/${name}: filename differs from the startup and launch identity`);
  }
  if (
    proposal.launch_id === "lch_aaaaaaaaaaaaaaaaaaaaaaaaaa" ||
    proposal.startup_id === "stp_aaaaaaaaaaaaaaaaaaaaaaaaaa" ||
    proposal.title === "Example Product 2.0" ||
    (URL.canParse(proposal.source_url) && new URL(proposal.source_url).hostname === "example.com")
  ) {
    errors.push(`launches/${name}: replace the example identity, claims and source`);
  }
  const prior = launchIds.get(proposal.launch_id);
  if (prior) errors.push(`launches/${name}: launch ID is already used by ${prior}`);
  else launchIds.set(proposal.launch_id, name);
  checkUrl(proposal.source_url, `launches/${name}: source`, ["http:", "https:"]);
}

if (errors.length) {
  process.stderr.write(`${errors.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`Validated ${names.filter((name) => name.endsWith(".yaml")).length} startup profiles and ${launchNames.filter((name) => name.endsWith(".yaml")).length} launch proposals.\n`);
}
