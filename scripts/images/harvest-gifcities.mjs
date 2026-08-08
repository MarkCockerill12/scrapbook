/**
 * GifCities — the Internet Archive's search over GIFs recovered from GeoCities.
 *
 * This is the right source for Early Internet's animated furniture: under-construction
 * workers, flame dividers, spinning envelopes, hit counters, dancing everything. These
 * are artefacts, not photographs, so Commons and Openverse have none of them — but the
 * Archive rescued them all when GeoCities was shut down.
 *
 * There's no documented JSON API; the search page embeds direct URLs on
 * blob.gifcities.org with width/height attributes, which is enough. Parsed with a
 * regex over <img> tags rather than a DOM library — the markup is flat and stable and
 * this isn't worth a dependency.
 *
 *   node scripts/images/harvest-gifcities.mjs
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { PROJECT_ROOT } from "../lib/env.mjs";

const OUT = resolve(PROJECT_ROOT, "raw/early-internet");
const ATTRIB = resolve(PROJECT_ROOT, "raw/ATTRIBUTION.json");
const UA = "ScrapBook/0.1 (personal art project)";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** slot -> [search terms], how many to keep, and a size filter. */
const WANTED = [
  { slot: "earlynet_construction", terms: ["under construction", "construction worker"], n: 18 },
  { slot: "earlynet_flamebar", terms: ["divider", "flame bar", "rainbow line"], n: 20, minW: 120 },
  { slot: "earlynet_mail", terms: ["email", "envelope"], n: 12 },
  { slot: "earlynet_dancing", terms: ["dancing", "dancing baby"], n: 12 },
  { slot: "earlynet_counter", terms: ["hit counter", "counter"], n: 10 },
  { slot: "earlynet_ufo", terms: ["ufo", "flying saucer", "alien"], n: 16 },
  { slot: "earlynet_star", terms: ["sparkle star", "twinkle"], n: 14 },
  { slot: "earlynet_new", terms: ["new blinking", "new sign"], n: 12 },
  { slot: "earlynet_welcome", terms: ["welcome", "enter here"], n: 12 },
  { slot: "earlynet_skull", terms: ["skull", "spooky"], n: 8 },
  { slot: "earlynet_globe", terms: ["spinning globe", "earth"], n: 10 },
  { slot: "earlynet_computer", terms: ["computer", "floppy disk"], n: 10 },
];

async function search(term, pageSize = 100) {
  const url = `https://gifcities.org/search?q=${encodeURIComponent(term)}&offset=0&page_size=${pageSize}`;
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(String(res.status));
  const html = await res.text();

  const out = [];
  const re = /<img\s+width="(\d+)"\s+height="(\d+)"\s+src="(https:\/\/blob\.gifcities\.org\/[^"]+)"/g;
  let m;
  while ((m = re.exec(html))) {
    out.push({ w: Number(m[1]), h: Number(m[2]), url: m[3] });
  }
  return out;
}

let attribution = {};
try {
  attribution = JSON.parse(await readFile(ATTRIB, "utf8"));
} catch {
  attribution = {};
}

await mkdir(OUT, { recursive: true });
console.log("\nGifCities — GeoCities GIFs recovered by the Internet Archive\n");

let total = 0;

for (const { slot, terms, n, minW = 0 } of WANTED) {
  const seen = new Set();
  const picked = [];

  for (const term of terms) {
    if (picked.length >= n) break;
    let results = [];
    try {
      results = await search(term);
    } catch (err) {
      console.log(`  ${slot.padEnd(24)} search "${term}" failed: ${err.message}`);
      continue;
    }
    for (const r of results) {
      if (picked.length >= n) break;
      if (seen.has(r.url)) continue;
      // Skip 1x1 spacers and anything absurdly large — neither is page furniture.
      if (r.w < Math.max(minW, 20) || r.w > 640 || r.h < 12 || r.h > 480) continue;
      seen.add(r.url);
      picked.push(r);
    }
    await sleep(250);
  }

  let saved = 0;
  for (const r of picked) {
    const name = `${slot}_${String(saved + 1).padStart(2, "0")}.gif`;
    try {
      const res = await fetch(r.url, {
        headers: { "User-Agent": UA },
        signal: AbortSignal.timeout(25_000),
      });
      if (!res.ok) throw new Error(String(res.status));
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 120) throw new Error("too small");
      await writeFile(join(OUT, name), buf);
      attribution[`early-internet/${name}`] = {
        title: slot,
        artist: "unknown (GeoCities, c.1995-2009)",
        license: "unknown — recovered artefact",
        provider: "Internet Archive / GifCities",
        source: r.url,
      };
      saved += 1;
      total += 1;
    } catch {
      /* skip */
    }
    await sleep(60);
  }

  console.log(`  ${slot.padEnd(24)} +${saved}`);
  await writeFile(ATTRIB, JSON.stringify(attribution, null, 2));
}

console.log(`\n${total} GIFs saved to raw/early-internet/`);
console.log("Provenance: recovered GeoCities artefacts, original authors unknown.\n");
