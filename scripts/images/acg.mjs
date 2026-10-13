/**
 * ambientCG (CC0) texture fetcher — real photo-scanned surfaces.
 *
 *   node scripts/images/acg.mjs search <query>                   list asset ids
 *   node scripts/images/acg.mjs <aesthetic> <slot> <AssetId,...> [--res=2K] [--map=Color]
 *
 * Downloads each asset's JPG zip, pulls out the chosen map (Color by default) and
 * appends it to raw/<aesthetic>/<slot>_NN.jpg. CC0, so attribution is courtesy only.
 */
import { execFileSync } from "node:child_process";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { PROJECT_ROOT } from "../lib/env.mjs";

const args = process.argv.slice(2);
const flag = (n, d) => args.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? d;
const pos = args.filter((a) => !a.startsWith("--"));

if (pos[0] === "search") {
  const q = pos.slice(1).join(" ");
  const res = await fetch(`https://ambientcg.com/api/v2/full_json?q=${encodeURIComponent(q)}&limit=40`);
  const j = await res.json();
  for (const a of j.foundAssets ?? []) console.log(`${a.assetId.padEnd(26)} ${a.displayName}`);
  process.exit(0);
}

const [aesthetic, slot, ids] = pos;
const RES = flag("res", "2K");
const MAP = flag("map", "Color");
const dir = resolve(PROJECT_ROOT, "raw", aesthetic);
await mkdir(dir, { recursive: true });
const have = (await readdir(dir)).filter((f) => f.startsWith(`${slot}_`)).length;
const ATTRIB = resolve(PROJECT_ROOT, "raw/ATTRIBUTION.json");
const attrib = JSON.parse(await readFile(ATTRIB, "utf8").catch(() => "{}"));

let n = have;
for (const id of ids.split(",")) {
  const url = `https://ambientcg.com/get?file=${id}_${RES}-JPG.zip`;
  const res = await fetch(url);
  if (!res.ok) {
    console.log(`  fail ${id} (${res.status})`);
    continue;
  }
  const zip = join(tmpdir(), `${id}.zip`);
  await writeFile(zip, Buffer.from(await res.arrayBuffer()));
  const out = join(tmpdir(), `acg_${id}`);
  await rm(out, { recursive: true, force: true });
  execFileSync("python", ["-c", `import zipfile,sys;zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])`, zip, out]);
  const file = (await readdir(out)).find((f) => f.includes(`_${MAP}.`));
  if (!file) {
    console.log(`  no ${MAP} map in ${id}`);
    continue;
  }
  n += 1;
  const name = `${slot}_${String(n).padStart(2, "0")}.jpg`;
  await writeFile(join(dir, name), await readFile(join(out, file)));
  attrib[`${aesthetic}/${name}`] = {
    title: id,
    artist: "ambientCG",
    license: "CC0",
    provider: "ambientcg.com",
    source: `https://ambientcg.com/view?id=${id}`,
  };
  console.log(`  ${name} <- ${id}`);
  await rm(out, { recursive: true, force: true });
  await rm(zip, { force: true });
}
await writeFile(ATTRIB, JSON.stringify(attrib, null, 2));
