/**
 * Asset harvester. Pulls openly-licensed imagery into raw/<aesthetic>/.
 *
 * Sources, both keyless:
 *   - Wikimedia Commons   objects, textures, architecture, public-domain art
 *   - Openverse           CC-licensed Flickr etc — people, vehicles, interiors, candid
 *
 * Attribution is recorded for every file in raw/ATTRIBUTION.json as it downloads.
 * Most of what comes back is CC-BY or CC-BY-SA, which requires credit — collecting it
 * afterwards is impossible, so it's collected now whether or not we end up needing it.
 *
 * Resumable: files already on disk are skipped, so re-running tops up rather than
 * starting over.
 *
 *   node scripts/images/harvest.mjs [aesthetic] [--dry]
 */
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { PROJECT_ROOT } from "../lib/env.mjs";
import { SLOTS, plannedTotal } from "./slots.mjs";

const RAW = resolve(PROJECT_ROOT, "raw");
const ATTRIB = join(RAW, "ATTRIBUTION.json");

const only = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : null;
const DRY = process.argv.includes("--dry");

const UA = "ScrapBook/0.1 (personal art project; contact via github.com/MarkCockerill12/scrapbook)";
const MIN_BYTES = 12_000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Both APIs drop connections intermittently under sustained use, and a single failed
 * search silently costs a whole slot. Everything network-facing retries with backoff.
 */
async function withRetry(fn, attempts = 4, base = 900) {
  let last;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      if (i < attempts - 1) await sleep(base * 2 ** i + Math.random() * 400);
    }
  }
  throw last;
}

async function getJSON(url) {
  return withRetry(async () => {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  });
}

async function getBuffer(url) {
  return withRetry(async () => {
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(35_000),
    });
    if (!res.ok) throw new Error(String(res.status));
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < MIN_BYTES) throw new Error(`too small (${buf.length}b)`);
    return buf;
  }, 3);
}

/** Wikimedia Commons search -> [{url, title, artist, license, width, height}] */
async function searchCommons(query, limit, minW) {
  const url =
    "https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search" +
    `&gsrsearch=${encodeURIComponent(`filetype:bitmap ${query}`)}` +
    `&gsrlimit=${Math.min(limit * 3, 50)}&gsrnamespace=6` +
    "&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=2000";

  const data = await getJSON(url);
  const pages = Object.values(data?.query?.pages ?? {});
  const out = [];

  for (const p of pages) {
    const info = p.imageinfo?.[0];
    if (!info) continue;
    if (minW && info.width < minW) continue;
    const meta = info.extmetadata ?? {};
    out.push({
      // thumburl is a re-render capped at iiurlwidth; far smaller than a 40MP original.
      url: info.thumburl || info.url,
      title: p.title,
      source: `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title)}`,
      artist: stripTags(meta.Artist?.value) || "unknown",
      license: meta.LicenseShortName?.value || "see source",
      provider: "Wikimedia Commons",
    });
  }
  return out.slice(0, limit);
}

/** Openverse search -> same shape */
async function searchOpenverse(query, limit) {
  const url =
    "https://api.openverse.org/v1/images/?" +
    `q=${encodeURIComponent(query)}&page_size=${Math.min(limit * 2, 40)}` +
    "&license_type=all-cc,commercial&mature=false";

  const data = await getJSON(url);
  return (data.results ?? [])
    .filter((r) => r.url)
    .slice(0, limit)
    .map((r) => ({
      url: r.url,
      title: r.title ?? "untitled",
      source: r.foreign_landing_url ?? r.url,
      artist: r.creator ?? "unknown",
      license: `${(r.license ?? "").toUpperCase()} ${r.license_version ?? ""}`.trim(),
      provider: r.source ?? "Openverse",
    }));
}

function stripTags(html) {
  return html ? html.replace(/<[^>]*>/g, "").trim() : "";
}

function extFor(url) {
  const clean = url.split("?")[0].toLowerCase();
  for (const e of [".jpg", ".jpeg", ".png", ".webp", ".gif"]) {
    if (clean.endsWith(e)) return e === ".jpeg" ? ".jpg" : e;
  }
  return ".jpg";
}

async function existingCount(dir, slot) {
  try {
    const files = await readdir(dir);
    return files.filter((f) => f.startsWith(`${slot}_`)).length;
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------- run

let attribution = {};
try {
  attribution = JSON.parse(await readFile(ATTRIB, "utf8"));
} catch {
  attribution = {};
}

const aesthetics = only ? [only] : Object.keys(SLOTS);
if (only && !SLOTS[only]) {
  console.error(`Unknown aesthetic '${only}'. Known: ${Object.keys(SLOTS).join(", ")}`);
  process.exit(1);
}

console.log(
  `\nHarvesting ${aesthetics.length} aesthetic(s) — ${plannedTotal()} images planned across the full map\n`,
);

let got = 0;
let skipped = 0;
let failed = 0;

for (const aesthetic of aesthetics) {
  const dir = join(RAW, aesthetic);
  if (!DRY) await mkdir(dir, { recursive: true });

  for (const [slot, cfg] of Object.entries(SLOTS[aesthetic])) {
    const have = await existingCount(dir, slot);
    const need = cfg.n - have;
    if (need <= 0) {
      skipped += have;
      console.log(`  ${slot.padEnd(26)} have ${have}/${cfg.n} — skip`);
      continue;
    }

    /**
     * Progressive broadening. A five-word query like "turquoise tropical shallow
     * water caustics" is precise and frequently returns nothing at all, which leaves
     * the slot empty rather than imperfect. Dropping trailing terms trades specificity
     * for a result — a merely-good tropical water photo beats no photo.
     */
    const variants = (() => {
      const words = cfg.q.split(/\s+/);
      const out = [cfg.q];
      if (words.length > 3) out.push(words.slice(0, 3).join(" "));
      if (words.length > 2) out.push(words.slice(0, 2).join(" "));
      return [...new Set(out)];
    })();

    const results = [];
    const seen = new Set();

    for (const q of variants) {
      if (results.length >= need) break;
      const want = need - results.length;

      const batches = await Promise.all([
        cfg.src === "openverse"
          ? Promise.resolve([])
          : searchCommons(q, cfg.src === "commons" ? want : Math.ceil(want / 2), cfg.minW).catch(
              () => [],
            ),
        cfg.src === "commons"
          ? Promise.resolve([])
          : searchOpenverse(q, cfg.src === "openverse" ? want : Math.ceil(want / 2)).catch(
              () => [],
            ),
      ]);

      for (const r of batches.flat()) {
        if (results.length >= need) break;
        if (seen.has(r.url)) continue;
        seen.add(r.url);
        results.push(r);
      }
    }

    if (!results.length) {
      console.log(`  ${slot.padEnd(26)} nothing found for "${cfg.q}"`);
      continue;
    }

    if (DRY) {
      console.log(`  ${slot.padEnd(26)} would fetch ${results.length}/${need}`);
      continue;
    }

    let n = have;
    let saved = 0;
    for (const r of results) {
      const name = `${slot}_${String(n + 1).padStart(2, "0")}${extFor(r.url)}`;
      try {
        // MIN_BYTES guards against error pages and 1x1 placeholders arriving as "images".
        const buf = await getBuffer(r.url);
        await writeFile(join(dir, name), buf);
        attribution[`${aesthetic}/${name}`] = {
          title: r.title,
          artist: r.artist,
          license: r.license,
          provider: r.provider,
          source: r.source,
        };
        n += 1;
        saved += 1;
        got += 1;
      } catch {
        failed += 1;
      }
      // Be a good citizen with two free APIs.
      await sleep(120);
    }

    console.log(`  ${slot.padEnd(26)} +${saved} (now ${n}/${cfg.n})`);
    await writeFile(ATTRIB, JSON.stringify(attribution, null, 2));
  }

  console.log(`— ${aesthetic} done\n`);
}

if (!DRY) await writeFile(ATTRIB, JSON.stringify(attribution, null, 2));

console.log(`\nDownloaded ${got}  ·  already had ${skipped}  ·  failed ${failed}`);
console.log(`Attribution: raw/ATTRIBUTION.json\n`);
