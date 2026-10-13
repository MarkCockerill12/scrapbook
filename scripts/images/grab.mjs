/**
 * Targeted grabber — one slot at a time, any MediaWiki, Openverse, or explicit URLs.
 *
 * harvest.mjs fills every slot from a fixed query table and is blind to what comes
 * back. This is the hand tool: search a specific source for a specific slot, download
 * into raw/<aesthetic>/<slot>_NN, and emit a numbered contact sheet so every image is
 * LOOKED AT before a page is allowed to use it (a wrong photo is worse than none).
 *
 *   node scripts/images/grab.mjs <aesthetic> <slot> <source> "<query>" [--n=8] [--minW=1000]
 *   node scripts/images/grab.mjs --sheet <aesthetic> <slot>          # re-sheet what's on disk
 *   node scripts/images/grab.mjs --drop <aesthetic> <slot> 2,5,7     # delete by sheet index, renumber
 *   node scripts/images/grab.mjs --keep <aesthetic> <slot> 1,3       # keep only these, renumber
 *
 * <source>:
 *   commons                      Wikimedia Commons (CC / PD)
 *   openverse                    Openverse (Flickr CC etc.)
 *   wiki:<host>                  any MediaWiki file search — e.g. wiki:aesthetics.fandom.com,
 *                                wiki:www.mariowiki.com, wiki:sonic.fandom.com
 *   title:<host>                 query is a `|`-separated list of exact File: titles on <host>
 *   page:<host>                  every image used ON an article — e.g. page:aesthetics.fandom.com "Frutiger Aero"
 *                                (add --skip=N to start further into the article's image list)
 *   lead:<host>                  query is a `|`-separated list of ARTICLE titles; takes each one's
 *                                lead/infobox image (cover art, logos) — e.g. lead:en.wikipedia.org "Halo 3|Gears of War"
 *   url                          query is a `|`-separated list of direct image URLs
 *
 * Sheets land in .shots/grab/<aesthetic>__<slot>.png. Attribution is appended to
 * raw/ATTRIBUTION.json for every file.
 */
import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join, resolve, extname } from "node:path";
import sharp from "sharp";
import { PROJECT_ROOT } from "../lib/env.mjs";

const RAW = resolve(PROJECT_ROOT, "raw");
const ATTRIB = join(RAW, "ATTRIBUTION.json");
const SHEETS = resolve(PROJECT_ROOT, ".shots/grab");
const UA =
  "ScrapBook/0.2 (personal art project; github.com/MarkCockerill12/scrapbook) node-fetch";

const argv = process.argv.slice(2);
const flag = (n, d) => argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? d;
const pos = argv.filter((a) => !a.startsWith("--") || ["--sheet", "--drop", "--keep"].includes(a));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withRetry(fn, attempts = 4, base = 1500) {
  let last;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      if (i < attempts - 1) await sleep(base * 2 ** i);
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
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return res.json();
  });
}

async function getBuffer(url) {
  return withRetry(async () => {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Referer: new URL(url).origin + "/" },
      signal: AbortSignal.timeout(40_000),
    });
    // upload.wikimedia.org rate-limits thumbnail renders hard; honour Retry-After.
    if (res.status === 429) {
      await sleep(Math.min(Number(res.headers.get("retry-after") ?? 8), 30) * 1000);
      throw new Error("429");
    }
    if (!res.ok) throw new Error(String(res.status));
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 6_000) throw new Error(`too small (${buf.length}b)`);
    return buf;
  });
}

const stripTags = (h) => (h ? h.replace(/<[^>]*>/g, "").trim() : "");

function apiFor(host) {
  if (host === "commons") return "https://commons.wikimedia.org/w/api.php";
  if (host.includes("fandom.com")) return `https://${host}/api.php`;
  if (host.includes("wikipedia.org")) return `https://${host}/w/api.php`;
  return `https://${host}/api.php`;
}

function fromPages(pages, host, minW) {
  const out = [];
  for (const p of pages) {
    const info = p.imageinfo?.[0];
    if (!info) continue;
    if (/\.(svg|ogg|ogv|webm|pdf|tif|tiff|djvu|mp4|gif)$/i.test(info.url) && !flag("gif", "")) continue;
    if (minW && info.width < minW) continue;
    const meta = info.extmetadata ?? {};
    out.push({
      // Originals come straight from cache; thumbnails at odd sizes are rendered on
      // demand and are what upload.wikimedia.org rate-limits (429). Take the original
      // unless it's enormous.
      url: info.width <= 3200 && (info.size ?? 0) < 6_000_000 ? info.url : info.thumburl || info.url,
      title: p.title,
      width: info.width,
      source: info.descriptionurl ?? `https://${host}/wiki/${encodeURIComponent(p.title)}`,
      artist: stripTags(meta.Artist?.value) || "unknown",
      license: meta.LicenseShortName?.value || "see source",
      provider: host,
    });
  }
  return out;
}

async function searchWiki(host, query, limit, minW) {
  const api = apiFor(host);
  const q = host === "commons" ? `filetype:bitmap ${query}` : query;
  const url =
    `${api}?action=query&format=json&generator=search` +
    `&gsrsearch=${encodeURIComponent(q)}&gsrlimit=${Math.min(limit * 4, 50)}&gsrnamespace=6` +
    "&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=1920";
  const data = await getJSON(url);
  const pages = Object.values(data?.query?.pages ?? {}).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  return fromPages(pages, host === "commons" ? "commons.wikimedia.org" : host, minW);
}

async function byTitles(host, titles) {
  const api = apiFor(host);
  const url =
    `${api}?action=query&format=json&titles=${encodeURIComponent(titles.join("|"))}` +
    "&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=1920";
  const data = await getJSON(url);
  return fromPages(Object.values(data?.query?.pages ?? {}), host, 0);
}

async function onPage(host, title) {
  const api = apiFor(host);
  const url =
    `${api}?action=query&format=json&generator=images&titles=${encodeURIComponent(title)}` +
    "&gimlimit=max&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=1920";
  const data = await getJSON(url);
  const all = fromPages(Object.values(data?.query?.pages ?? {}), host, Number(flag("minW", "500")));
  return all.slice(Number(flag("skip", "0")));
}

async function leadImages(host, titles) {
  const api = apiFor(host);
  const out = [];
  for (let i = 0; i < titles.length; i += 20) {
    const chunk = titles.slice(i, i + 20);
    const url =
      `${api}?action=query&format=json&redirects=1&titles=${encodeURIComponent(chunk.join("|"))}` +
      "&prop=pageimages&piprop=original|thumbnail|name&pithumbsize=1920&pilicense=any";
    const data = await getJSON(url);
    const pages = Object.values(data?.query?.pages ?? {});
    // keep the caller's order
    const norm = new Map();
    for (const n of data?.query?.normalized ?? []) norm.set(n.to, n.from);
    for (const r of data?.query?.redirects ?? []) norm.set(r.to, norm.get(r.from) ?? r.from);
    pages.sort((a, b) => chunk.indexOf(norm.get(a.title) ?? a.title) - chunk.indexOf(norm.get(b.title) ?? b.title));
    for (const p of pages) {
      if (!p.original?.source) {
        console.log(`  no lead image: ${p.title}`);
        continue;
      }
      out.push({
        // A 6000px original is 15MB for a picture shown at 400px; the 1920 thumb will do.
        url: (p.original.width ?? 0) > 2400 && p.thumbnail?.source ? p.thumbnail.source : p.original.source,
        title: p.pageimage,
        source: `https://${host}/wiki/File:${encodeURIComponent(p.pageimage)}`,
        artist: "see source",
        license: "see source",
        provider: host,
      });
    }
  }
  return out;
}

async function searchOpenverse(query, limit) {
  const url =
    "https://api.openverse.org/v1/images/?" +
    `q=${encodeURIComponent(query)}&page_size=${Math.min(limit * 2, 20)}&mature=false` +
    // Openverse also indexes Commons, whose CDN rate-limits us — keep to Flickr unless asked.
    `&source=${flag("ovsource", "flickr")}`;
  const data = await getJSON(url);
  return (data.results ?? [])
    .filter((r) => r.url && (!r.width || r.width >= Number(flag("minW", "0"))))
    .map((r) => ({
      url: r.url,
      title: r.title ?? "untitled",
      source: r.foreign_landing_url ?? r.url,
      artist: r.creator ?? "unknown",
      license: `${(r.license ?? "").toUpperCase()} ${r.license_version ?? ""}`.trim(),
      provider: r.source ?? "openverse",
    }));
}

function extOf(url, buf) {
  if (buf[0] === 0x89 && buf[1] === 0x50) return ".png";
  if (buf[0] === 0xff && buf[1] === 0xd8) return ".jpg";
  if (buf.slice(0, 4).toString() === "RIFF") return ".webp";
  if (buf.slice(0, 3).toString() === "GIF") return ".gif";
  const e = extname(url.split("?")[0]).toLowerCase();
  return e && e.length <= 5 ? e : ".jpg";
}

async function slotFiles(aesthetic, slot) {
  const dir = join(RAW, aesthetic);
  try {
    return (await readdir(dir))
      .filter((f) => new RegExp(`^${slot}_(\\d+)\\.[a-z]+$`, "i").test(f))
      .sort((a, b) => Number(a.match(/_(\d+)\./)[1]) - Number(b.match(/_(\d+)\./)[1]));
  } catch {
    return [];
  }
}

async function sheet(aesthetic, slot) {
  const names = await slotFiles(aesthetic, slot);
  if (!names.length) return console.log("  (slot empty)");
  const CELL = 300;
  const cols = Math.min(5, names.length);
  const rows = Math.ceil(names.length / cols);
  const comps = [];
  for (const [i, n] of names.entries()) {
    try {
      const meta = await sharp(join(RAW, aesthetic, n)).metadata();
      const img = await sharp(join(RAW, aesthetic, n))
        .resize(CELL - 10, CELL - 30, { fit: "contain", background: "#1a1c20" })
        .png()
        .toBuffer();
      const label = Buffer.from(
        `<svg width="${CELL - 10}" height="24"><rect width="100%" height="100%" fill="#000"/>` +
          `<text x="6" y="17" font-family="Arial" font-size="15" fill="#ffd400">${i + 1}  ${n}  ${meta.width}x${meta.height}</text></svg>`,
      );
      comps.push({ input: img, left: (i % cols) * CELL + 5, top: Math.floor(i / cols) * CELL + 29 });
      comps.push({ input: label, left: (i % cols) * CELL + 5, top: Math.floor(i / cols) * CELL + 3 });
    } catch (e) {
      console.log(`  unreadable: ${n} (${e.message})`);
    }
  }
  await mkdir(SHEETS, { recursive: true });
  const out = join(SHEETS, `${aesthetic}__${slot}.png`);
  await sharp({ create: { width: cols * CELL, height: rows * CELL, channels: 3, background: "#2a2d33" } })
    .composite(comps)
    .png()
    .toFile(out);
  console.log(`  sheet: ${out}  (${names.length} files)`);
}

async function renumber(aesthetic, slot, keepIdx) {
  const names = await slotFiles(aesthetic, slot);
  const dir = join(RAW, aesthetic);
  const attrib = JSON.parse(await readFile(ATTRIB, "utf8").catch(() => "{}"));
  const kept = [];
  for (const [i, n] of names.entries()) {
    if (keepIdx.has(i + 1)) kept.push(n);
    else {
      await rm(join(dir, n));
      delete attrib[`${aesthetic}/${n}`];
    }
  }
  // two-phase rename so indices can't collide
  const tmp = [];
  for (const n of kept) {
    const t = `${n}.renum`;
    await rename(join(dir, n), join(dir, t));
    tmp.push([n, t]);
  }
  for (const [j, [orig, t]] of tmp.entries()) {
    const final = `${slot}_${String(j + 1).padStart(2, "0")}${extname(orig)}`;
    await rename(join(dir, t), join(dir, final));
    if (attrib[`${aesthetic}/${orig}`] && orig !== final) {
      attrib[`${aesthetic}/${final}`] = attrib[`${aesthetic}/${orig}`];
      delete attrib[`${aesthetic}/${orig}`];
    }
  }
  await writeFile(ATTRIB, JSON.stringify(attrib, null, 2));
  console.log(`  kept ${kept.length}/${names.length}`);
}

// ------------------------------------------------------------------ main
if (pos[0] === "--sheet") {
  await sheet(pos[1], pos[2]);
  process.exit(0);
}
if (pos[0] === "--drop" || pos[0] === "--keep") {
  const [, aesthetic, slot, list] = pos;
  const set = new Set(list.split(",").map(Number));
  const names = await slotFiles(aesthetic, slot);
  const keep = new Set(
    names.map((_, i) => i + 1).filter((i) => (pos[0] === "--keep" ? set.has(i) : !set.has(i))),
  );
  await renumber(aesthetic, slot, keep);
  await sheet(aesthetic, slot);
  process.exit(0);
}

const [aesthetic, slot, source, query] = pos;
if (!aesthetic || !slot || !source || !query) {
  console.log("usage: grab.mjs <aesthetic> <slot> <source> \"<query>\" [--n=8] [--minW=1000]");
  process.exit(1);
}
const N = Number(flag("n", "8"));
const MINW = Number(flag("minW", "900"));

let results = [];
if (source === "commons") results = await searchWiki("commons", query, N, MINW);
else if (source.startsWith("lead:")) results = await leadImages(source.slice(5), query.split("|"));
else if (source.startsWith("page:")) results = await onPage(source.slice(5), query);
else if (source === "openverse") results = await searchOpenverse(query, N);
else if (source.startsWith("wiki:")) results = await searchWiki(source.slice(5), query, N, MINW);
else if (source.startsWith("title:")) results = await byTitles(source.slice(6), query.split("|"));
else if (source === "url")
  results = query.split("|").map((u) => ({
    url: u.trim(),
    title: u.trim().split("/").pop(),
    source: u.trim(),
    artist: "unknown",
    license: "see source",
    provider: new URL(u.trim()).host,
  }));

const dir = join(RAW, aesthetic);
await mkdir(dir, { recursive: true });
const attrib = JSON.parse(await readFile(ATTRIB, "utf8").catch(() => "{}"));
const knownSources = new Set(Object.values(attrib).map((a) => a.source));

let n = (await slotFiles(aesthetic, slot)).length;
let saved = 0;
for (const r of results) {
  if (saved >= N) break;
  if (knownSources.has(r.source)) continue; // never the same file twice
  try {
    const buf = await getBuffer(r.url);
    const ext = extOf(r.url, buf);
    const name = `${slot}_${String(n + 1).padStart(2, "0")}${ext}`;
    await writeFile(join(dir, name), buf);
    attrib[`${aesthetic}/${name}`] = {
      title: r.title,
      artist: r.artist,
      license: r.license,
      provider: r.provider,
      source: r.source,
    };
    knownSources.add(r.source);
    n += 1;
    saved += 1;
  } catch (e) {
    console.log(`  fail ${r.url.slice(0, 90)} (${e.message})`);
  }
  await sleep(source === "commons" || source.includes("wikipedia") ? 2500 : 400);
}
await writeFile(ATTRIB, JSON.stringify(attrib, null, 2));
console.log(`${aesthetic}/${slot}: +${saved} from ${results.length} results (now ${n})`);
await sheet(aesthetic, slot);
