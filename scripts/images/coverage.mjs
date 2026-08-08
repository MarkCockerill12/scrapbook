/**
 * Coverage report: what the harvester actually got, and what still needs a human.
 *
 * The point of this script is to keep the gap honest. The automated sources cover
 * photography, textures and public-domain art well and cover artefacts — console UI,
 * game screenshots, era-specific graphics — not at all. MANUAL below is that list,
 * kept here rather than in prose so it can't quietly drift from reality.
 *
 *   node scripts/images/coverage.mjs
 */
import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { PROJECT_ROOT } from "../lib/env.mjs";
import { SLOTS } from "./slots.mjs";

const RAW = resolve(PROJECT_ROOT, "raw");

/** Slots no open-licensed API can serve. Search terms are in IMAGE_MANIFEST.md. */
const MANUAL = {
  "frutiger-aero": ["frutiger_vista_wall", "frutiger_glassbutton", "frutiger_marketing"],
  "early-internet": [
    "earlynet_uglytile",
    "earlynet_construction",
    "earlynet_counter",
    "earlynet_flamebar",
    "earlynet_dancing",
    "earlynet_wordart",
    "earlynet_screenshot",
  ],
  jdm: ["jdm_sticker", "jdm_tsurikawa", "jdm_charm", "jdm_chatscreen", "jdm_polaroid_blank"],
  "nintendo-3ds": ["n3ds_ui", "n3ds_hardware", "n3ds_kawaii", "n3ds_stylus"],
  wii: ["wii_ui", "wii_mii"],
  "xbox-360": ["x360_ui", "x360_game", "x360_montage", "x360_hitmarker", "x360_rrod"],
  ps1: ["ps1_ui", "ps1_screenshot"],
  win98: ["win98_ui", "win98_clippy", "win98_wordart", "win98_wallpaper"],
  vaporwave: ["vapor_win95", "vapor_japanese"],
  "game-beach": ["gbeach_screenshot", "gbeach_hud"],
  aztec: ["aztec_darksouls"],
  bbs: ["bbs_ansi", "bbs_teletext"],
  "dead-mall": ["mall_directory", "mall_signage"],
  news: ["news_lowerthird", "news_bug", "news_ident"],
  "skate-zine": ["zine_letter", "zine_sticker", "zine_tape", "zine_staple", "zine_halftone"],
  "cyber-sigilism": ["sigil_screen", "sigil_tattoo", "sigil_fashion"],
  arcade: ["arcade_highscore", "arcade_bezel"],
  neon: ["neon_avatar"],
  cottagecore: ["cottage_bg"],
  tiki: [],
  liminal: [],
  matrix: [],
  "deep-sea": [],
};

async function filesIn(dir) {
  try {
    return (await readdir(dir, { withFileTypes: true }))
      .filter((e) => e.isFile())
      .map((e) => e.name);
  } catch {
    return [];
  }
}

const rows = [];
let totalHave = 0;
let totalWant = 0;
let manualCount = 0;

const aesthetics = [...new Set([...Object.keys(SLOTS), ...Object.keys(MANUAL)])].sort();

for (const aesthetic of aesthetics) {
  const files = [
    ...(await filesIn(join(RAW, aesthetic))),
    ...(await filesIn(join(RAW, aesthetic, "cutout"))),
  ];

  const counts = new Map();
  for (const f of files) {
    const m = f.match(/^(.*?)_\d+\.\w+$/);
    if (m) counts.set(m[1], (counts.get(m[1]) ?? 0) + 1);
  }

  const auto = SLOTS[aesthetic] ?? {};
  let have = 0;
  let want = 0;
  const thin = [];

  for (const [slot, cfg] of Object.entries(auto)) {
    const n = counts.get(slot) ?? 0;
    have += n;
    want += cfg.n;
    if (n < cfg.n) thin.push(`${slot} ${n}/${cfg.n}`);
  }

  // Slots on disk that aren't in the auto map (badges, hand-dropped files).
  let extra = 0;
  for (const [slot, n] of counts) {
    if (!auto[slot]) extra += n;
  }

  const manual = MANUAL[aesthetic] ?? [];
  const manualMissing = manual.filter((s) => !counts.has(s));
  manualCount += manualMissing.length;

  totalHave += have + extra;
  totalWant += want;

  rows.push({ aesthetic, have, want, extra, thin, manualMissing });
}

const pct = (a, b) => (b ? Math.round((a / b) * 100) : 100);

console.log(`\n${"AESTHETIC".padEnd(17)} AUTO        EXTRA   NEEDS A HUMAN`);
console.log("-".repeat(78));

for (const r of rows) {
  const bar = `${r.have}/${r.want}`.padEnd(9);
  const p = `${pct(r.have, r.want)}%`.padStart(4);
  console.log(
    `${r.aesthetic.padEnd(17)} ${bar}${p}  ${String(r.extra).padStart(5)}   ${
      r.manualMissing.length ? r.manualMissing.length : "—"
    }`,
  );
}

console.log("-".repeat(78));
console.log(
  `${"TOTAL".padEnd(17)} ${`${totalHave}`.padEnd(9)}      auto target ${totalWant}  ·  ${manualCount} manual slots outstanding\n`,
);

console.log("Thin slots (harvested fewer than asked):");
for (const r of rows) {
  if (r.thin.length) console.log(`  ${r.aesthetic}: ${r.thin.join(", ")}`);
}

console.log("\nSlots no open API can serve — these need grabbing by hand:");
for (const r of rows) {
  if (r.manualMissing.length) console.log(`  ${r.aesthetic}: ${r.manualMissing.join(", ")}`);
}
console.log();
