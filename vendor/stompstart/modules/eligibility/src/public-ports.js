// The eligibility ports over the public web: pages and files over HTTPS, the Wayback index,
// RDAP, Stompstart's public API and the startup list's open pull requests on GitHub. Pictures are
// fingerprinted with cwebp and dwebp. Only Node built-ins, so this runs in the list's CI too.
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { registrableDomain } from "./index.js";
const run = promisify(execFile);
const PAGE_BYTES = 2_000_000;
const FILE_BYTES = 8_000_000;
const TIMEOUT_MS = 15_000;
const USER_AGENT = "StompstartEligibility/1 (+https://stompstart.com/contribute)";
async function fetchBounded(url, limit, accept) {
    if (new URL(url).protocol !== "https:")
        return null;
    try {
        const response = await fetch(url, {
            headers: { "user-agent": USER_AGENT, accept },
            redirect: "follow",
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        const reader = response.body?.getReader();
        const chunks = [];
        let size = 0;
        while (reader) {
            const { done, value } = await reader.read();
            if (done)
                break;
            size += value.byteLength;
            if (size > limit) {
                await reader.cancel();
                break;
            }
            chunks.push(value);
        }
        return { response, bytes: Buffer.concat(chunks) };
    }
    catch {
        return null;
    }
}
/** A 64-bit difference hash: shrink to 9 by 8 on white, then compare each pixel to its right. */
export async function differenceHash(bytes) {
    const directory = await mkdtemp(join(tmpdir(), "stompstart-eligibility-"));
    try {
        const input = join(directory, "input");
        const small = join(directory, "small.webp");
        const raw = join(directory, "small.ppm");
        await writeFile(input, bytes, { mode: 0o600 });
        await run("cwebp", [
            "-quiet",
            "-blend_alpha",
            "0xffffff",
            "-resize",
            "9",
            "8",
            input,
            "-o",
            small,
        ]);
        await run("dwebp", ["-quiet", small, "-ppm", "-o", raw]);
        const ppm = await readFile(raw);
        // P6, width, height, max value, then RGB bytes.
        const header = /^P6\s+(\d+)\s+(\d+)\s+(\d+)\s/u.exec(ppm.toString("latin1", 0, 64));
        if (header?.[1] !== "9" || header[2] !== "8")
            return null;
        const pixels = ppm.subarray(header[0].length);
        const grey = (x, y) => {
            const at = (y * 9 + x) * 3;
            return (0.299 * (pixels[at] ?? 0) + 0.587 * (pixels[at + 1] ?? 0) + 0.114 * (pixels[at + 2] ?? 0));
        };
        let hash = 0n;
        for (let y = 0; y < 8; y += 1) {
            for (let x = 0; x < 8; x += 1)
                hash = (hash << 1n) | (grey(x, y) > grey(x + 1, y) ? 1n : 0n);
        }
        return hash;
    }
    catch {
        return null;
    }
    finally {
        await rm(directory, { recursive: true, force: true });
    }
}
/**
 * Ports over the public web. `stompstart` is the site whose API lists existing records; `github`
 * names the startup list and an optional token for its open pull requests.
 */
export function publicEligibilityPorts(options) {
    const githubHeaders = {
        accept: "application/vnd.github+json",
        "user-agent": USER_AGENT,
        ...(options.github.token ? { authorization: `Bearer ${options.github.token}` } : {}),
    };
    const json = async (url, headers = { "user-agent": USER_AGENT }) => {
        try {
            const response = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
            return response.ok ? (await response.json()) : null;
        }
        catch {
            return null;
        }
    };
    const sameStartup = (name, domain, other) => {
        const plain = (value) => value.toLowerCase().replace(/[^a-z0-9]/gu, "");
        let otherDomain = "";
        try {
            otherDomain = registrableDomain(new URL(other.website).hostname);
        }
        catch {
            // A record without a usable website matches by name only.
        }
        return otherDomain === domain || plain(other.name) === plain(name);
    };
    let open = null;
    const openPullRequests = options.openPullRequests ??
        (async () => {
            const files = [];
            const base = `https://api.github.com/repos/${options.github.repository}`;
            for (let page = 1; page <= 10; page += 1) {
                const pulls = (await json(`${base}/pulls?state=open&per_page=100&page=${page}`, githubHeaders));
                if (!pulls || pulls.length === 0)
                    break;
                for (const pull of pulls) {
                    const changed = (await json(`${base}/pulls/${pull.number}/files?per_page=100`, githubHeaders));
                    const file = changed?.find((entry) => /^startups\/[a-z0-9-]+\.yaml$/u.test(entry.filename));
                    if (!file)
                        continue;
                    const text = await fetchBounded(file.raw_url, PAGE_BYTES, "text/plain");
                    const yaml = text?.bytes.toString("utf8") ?? "";
                    const field = (key) => new RegExp(`^${key}:\\s*["']?([^"'\\n]+)["']?\\s*$`, "mu").exec(yaml)?.[1]?.trim() ??
                        "";
                    files.push({ number: pull.number, name: field("name"), website: field("website") });
                }
                if (pulls.length < 100)
                    break;
            }
            return files;
        });
    return {
        async page(url) {
            const fetched = await fetchBounded(url, PAGE_BYTES, "text/html,application/xhtml+xml,*/*;q=0.5");
            if (!fetched)
                return null;
            return {
                status: fetched.response.status,
                url: fetched.response.url || url,
                contentType: fetched.response.headers.get("content-type") ?? "",
                text: fetched.bytes.toString("utf8"),
            };
        },
        async bytes(url) {
            const fetched = await fetchBounded(url, FILE_BYTES, "image/*");
            return fetched?.response.ok ? fetched.bytes : null;
        },
        async earliestCapture(host) {
            let rows;
            try {
                const response = await fetch(`https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(host)}&output=json&limit=1&fl=timestamp&filter=statuscode:200`, { headers: { "user-agent": USER_AGENT }, signal: AbortSignal.timeout(TIMEOUT_MS) });
                if (!response.ok)
                    return undefined;
                rows = (await response.json());
            }
            catch {
                return undefined;
            }
            const stamp = rows[1]?.[0];
            return stamp && /^\d{8}/u.test(stamp)
                ? `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}`
                : null;
        },
        async registered(domain) {
            const answer = (await json(`https://rdap.org/domain/${encodeURIComponent(domain)}`));
            // rdap.org can answer with the registry's own object; only the domain's is its registration.
            if (answer?.ldhName?.toLowerCase() !== domain)
                return null;
            const date = answer.events?.find((event) => event.eventAction === "registration")?.eventDate;
            return date ? date.slice(0, 10) : null;
        },
        async existing(query) {
            if (options.existing)
                return options.existing(query);
            const found = new Set();
            const records = [];
            for (const path of [
                `/api/archive?q=${encodeURIComponent(query.name)}&limit=50`,
                `/api/archive?q=${encodeURIComponent(query.domain)}&limit=50`,
                "/api/startups?limit=100",
            ]) {
                const page = (await json(new URL(path, options.stompstart).href));
                for (const record of page?.records ?? []) {
                    records.push({ slug: record.slug, name: record.name, website: record.website ?? "" });
                }
            }
            for (const record of records) {
                if (sameStartup(query.name, query.domain, record))
                    found.add(record.slug);
            }
            return [...found].sort();
        },
        async earlierPullRequests(query) {
            open ??= openPullRequests();
            return (await open)
                .filter((file) => file.number < query.before && sameStartup(query.name, query.domain, file))
                .map((file) => file.number)
                .sort((left, right) => left - right);
        },
        fingerprint: differenceHash,
    };
}
//# sourceMappingURL=public-ports.js.map