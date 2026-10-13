/**
 * Openverse lister — search every source for LARGE landscape photographs and print
 * what came back, so picks can be made by title/size before anything is downloaded.
 *
 *   node scripts/images/ov.mjs "<query>" [--n=20] [--page=1] [--source=a,b] [--any]
 *   node scripts/images/ov.mjs --get <aesthetic> <slot> <id,id,...>
 *
 * `--get` downloads the listed result ids (cached in .shots/ov-cache.json) through
 * grab.mjs's `url` source, so numbering, attribution and contact sheets stay in one place.
 */
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PROJECT_ROOT } from "../lib/env.mjs";

const argv = process.argv.slice(2);
const flag = (n, d) => argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? d;
const pos = argv.filter((a) => !a.startsWith("--") || a === "--get");
const CACHE = resolve(PROJECT_ROOT, ".shots/ov-cache.json");
const cache = JSON.parse(await readFile(CACHE, "utf8").catch(() => "{}"));

if (pos[0] === "--get") {
  const [, aesthetic, slot, ids] = pos;
  const urls = ids.split(",").map((id) => cache[id]).filter(Boolean);
  execFileSync("node", [resolve(PROJECT_ROOT, "scripts/images/grab.mjs"), aesthetic, slot, "url", urls.join("|"), `--n=${urls.length}`], { stdio: "inherit" });
  process.exit(0);
}

const q = pos[0];
const params = new URLSearchParams({ q, page_size: flag("n", "20"), page: flag("page", "1"), mature: "false" });
if (!argv.includes("--any")) {
  params.set("size", "large");
  params.set("aspect_ratio", "wide");
}
if (flag("source", "")) params.set("source", flag("source", ""));
const res = await fetch(`https://api.openverse.org/v1/images/?${params}`, {
  headers: { "User-Agent": "ScrapBook/0.2 (personal art project)" },
});
const data = await res.json();
console.log(`${data.result_count ?? 0} results for "${q}"`);
for (const r of data.results ?? []) {
  const id = r.id.slice(0, 6);
  cache[id] = r.url;
  console.log(`${id}  ${String(r.source).padEnd(10)} ${String(r.width).padStart(5)}x${String(r.height).padEnd(5)} ${r.license.padEnd(6)} ${(r.title ?? "").slice(0, 70)}`);
}
await mkdir(resolve(PROJECT_ROOT, ".shots"), { recursive: true });
await writeFile(CACHE, JSON.stringify(cache));
