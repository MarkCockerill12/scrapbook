/* Throwaway contact sheet: `node scripts/_sheet.mjs <aesthetic> <slot,slot> [out]` */
import sharp from "sharp";
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";
import { PROJECT_ROOT } from "../lib/env.mjs";

const [aesthetic, slotArg, outArg] = process.argv.slice(2);
const manifest = JSON.parse(
  await readFile(resolve(PROJECT_ROOT, "lib/asset-manifest.json"), "utf8"),
);
const slots = slotArg.split(",");

const CELL = 260;
const picks = [];
for (const s of slots) {
  for (const e of manifest.aesthetics[aesthetic][s] ?? []) picks.push({ ...e, slot: s });
}

const cols = Math.min(6, picks.length);
const rows = Math.ceil(picks.length / cols);
const canvas = sharp({
  create: {
    width: cols * CELL,
    height: rows * CELL,
    channels: 4,
    background: { r: 40, g: 44, b: 52, alpha: 1 },
  },
});

const composites = [];
for (const [i, p] of picks.entries()) {
  const file = resolve(PROJECT_ROOT, "public", p.src.replace(/^\//, ""));
  const buf = await sharp(file)
    .resize(CELL - 12, CELL - 12, { fit: "contain", background: { r: 24, g: 26, b: 30, alpha: 1 } })
    .png()
    .toBuffer();
  composites.push({
    input: buf,
    left: (i % cols) * CELL + 6,
    top: Math.floor(i / cols) * CELL + 6,
  });
}

await canvas.composite(composites).png().toFile(outArg ?? "./.shots/_sheet.png");
console.log(picks.map((p, i) => `${i}: ${p.slot}#${p.index} ${p.hasAlpha ? "cut" : "flat"}`).join("\n"));
