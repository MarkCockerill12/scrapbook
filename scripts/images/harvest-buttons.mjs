/**
 * The 88x31 badges — Early Internet's core material.
 *
 * These can't come from Commons or Openverse: they're artefacts, not photographs, and
 * the only real corpora are community archives. Pres7o/88x31 has 4540 of them scraped
 * from the wild, which is exactly the sort of bulk this page needs — its comedy is
 * density, and forty hand-made approximations would read as pastiche.
 *
 * Deliberately samples ACROSS the archive rather than taking the first N. The files
 * are alphabetical, so the first 200 would all begin with a digit or "a" and skew
 * toward whatever sites happen to be named that way.
 *
 * Animated GIFs are kept animated — sharp is configured for it in process.mjs and half
 * the point of a 1998 page is that things blink.
 *
 *   node scripts/images/harvest-buttons.mjs [count]
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { PROJECT_ROOT } from "../lib/env.mjs";

const REPO = "Pres7o/88x31";
const BRANCH = "main";
const WANT = Number(process.argv[2] ?? 220);

const OUT = resolve(PROJECT_ROOT, "raw/early-internet");
const UA = "ScrapBook/0.1 (personal art project)";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const treeRes = await fetch(
  `https://api.github.com/repos/${REPO}/git/trees/${BRANCH}?recursive=1`,
  { headers: { "User-Agent": UA, Accept: "application/vnd.github+json" } },
);
if (!treeRes.ok) {
  console.error(`Could not read repo tree: ${treeRes.status}`);
  process.exit(1);
}
const tree = await treeRes.json();

const all = tree.tree.filter(
  (n) => n.type === "blob" && /\.(gif|png|jpg|jpeg)$/i.test(n.path),
);

console.log(`\n${all.length} badges in ${REPO}; taking ${WANT} spread across the archive\n`);

// Even stride through the sorted list, so the sample spans the whole alphabet.
const stride = Math.max(1, Math.floor(all.length / WANT));
const picked = [];
for (let i = 0; i < all.length && picked.length < WANT; i += stride) picked.push(all[i]);

await mkdir(OUT, { recursive: true });

let saved = 0;
let failed = 0;

for (const node of picked) {
  const ext = node.path.slice(node.path.lastIndexOf(".")).toLowerCase();
  const name = `earlynet_button_${String(saved + 1).padStart(3, "0")}${ext}`;
  const url = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${node.path}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(String(res.status));
    const buf = Buffer.from(await res.arrayBuffer());
    // A real 88x31 is ~1-6KB. Anything under 200 bytes is an error page.
    if (buf.length < 200) throw new Error("too small");
    await writeFile(join(OUT, name), buf);
    saved += 1;
    if (saved % 25 === 0) console.log(`  ${saved}/${picked.length}`);
  } catch {
    failed += 1;
  }
  await sleep(45);
}

console.log(`\nSaved ${saved} badges to raw/early-internet/  (${failed} failed)`);
console.log(`Source: github.com/${REPO} (GPL-3.0) — community archive, mixed provenance\n`);
