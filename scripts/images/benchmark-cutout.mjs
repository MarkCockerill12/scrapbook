/**
 * Background-removal bake-off: rembg vs @imgly, on the same real images.
 *
 * This is a genuine quality decision, not a coin flip. The collage channels (JDM, Tiki,
 * Skate Zine) are mostly cutouts, and a bad matte on car glass, hair or wires is
 * obvious at a glance — so it's worth measuring on the actual material rather than
 * trusting either project's demo page.
 *
 * Writes side-by-side comparison sheets to .cutout-bench/ and prints timings.
 *
 *   node scripts/images/benchmark-cutout.mjs [count]
 */
import { execFile } from "node:child_process";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve, basename } from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";
import { PROJECT_ROOT } from "../lib/env.mjs";

const run = promisify(execFile);
const RAW = resolve(PROJECT_ROOT, "raw");
const OUT = resolve(PROJECT_ROOT, ".cutout-bench");
const N = Number(process.argv[2] ?? 8);

/** Subjects that actually stress a matte: hard edges, thin features, glass, fur. */
const SOURCES = [
  ["tiki", "tiki_mug"],
  ["tiki", "tiki_flower"],
  ["tiki", "tiki_cocktail"],
  ["tiki", "tiki_carving"],
  ["frutiger-aero", "frutiger_fish"],
  ["frutiger-aero", "frutiger_leaf"],
  ["cottagecore", "cottage_cat"],
  ["cottagecore", "cottage_object"],
];

async function pickFiles() {
  const picked = [];
  for (const [aesthetic, slot] of SOURCES) {
    if (picked.length >= N) break;
    let files = [];
    try {
      files = (await readdir(join(RAW, aesthetic))).filter((f) => f.startsWith(`${slot}_`));
    } catch {
      continue;
    }
    if (files.length) picked.push({ aesthetic, slot, file: join(RAW, aesthetic, files[0]) });
  }
  return picked;
}

const files = await pickFiles();
if (!files.length) {
  console.log("\nNo source images found under raw/. Run the harvester first.\n");
  process.exit(0);
}

await mkdir(OUT, { recursive: true });
console.log(`\nBenchmarking ${files.length} images\n`);

// ---- @imgly -------------------------------------------------------------
let imglyOk = 0;
let imglyMs = 0;
let imgly = null;
try {
  imgly = (await import("@imgly/background-removal-node")).removeBackground;
} catch (err) {
  console.log(`  @imgly unavailable: ${err.message}`);
}

if (imgly) {
  for (const f of files) {
    const t0 = Date.now();
    try {
      // Needs a typed Blob, not a raw Buffer — a bare Buffer reports
      // "Unsupported format:" with an empty mime.
      const ext = f.file.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
      const input = new Blob([await readFile(f.file)], { type: ext });
      const blob = await imgly(input, { output: { format: "image/png" } });
      const buf = Buffer.from(await blob.arrayBuffer());
      await writeFile(join(OUT, `${f.slot}.imgly.png`), buf);
      imglyMs += Date.now() - t0;
      imglyOk += 1;
    } catch (err) {
      console.log(`  imgly failed on ${basename(f.file)}: ${err.message}`);
    }
  }
}

// ---- rembg --------------------------------------------------------------
let rembgOk = 0;
let rembgMs = 0;
let rembgAvailable = true;
try {
  await run("uvx", ["--python", "3.11", "--from", "rembg[cpu,cli]", "rembg", "--help"], {
    timeout: 900_000,
  });
} catch (err) {
  rembgAvailable = false;
  console.log(`  rembg unavailable: ${String(err.message).slice(0, 120)}`);
}

if (rembgAvailable) {
  for (const f of files) {
    const out = join(OUT, `${f.slot}.rembg.png`);
    const t0 = Date.now();
    try {
      // Python 3.11 pin is required: rembg pulls numba via pymatting, and numba has
      // no wheel for the 3.14 that's on PATH. uv fetches 3.11 on demand.
      await run(
        "uvx",
        ["--python", "3.11", "--from", "rembg[cpu,cli]", "rembg", "i", f.file, out],
        { timeout: 900_000 },
      );
      rembgMs += Date.now() - t0;
      rembgOk += 1;
    } catch (err) {
      console.log(`  rembg failed on ${basename(f.file)}: ${String(err.message).slice(0, 100)}`);
    }
  }
}

// ---- comparison sheets --------------------------------------------------
// Checkerboard behind each result: alpha errors are invisible on white and obvious
// on a chequer, which is the whole point of looking at these.
const CHECKER = await sharp({
  create: { width: 40, height: 40, channels: 3, background: "#cccccc" },
})
  .composite([
    { input: await sharp({ create: { width: 20, height: 20, channels: 3, background: "#8e8e8e" } }).png().toBuffer(), left: 0, top: 0 },
    { input: await sharp({ create: { width: 20, height: 20, channels: 3, background: "#8e8e8e" } }).png().toBuffer(), left: 20, top: 20 },
  ])
  .png()
  .toBuffer();

for (const f of files) {
  const cells = [];
  const W = 320;
  for (const [, path] of [
    ["source", f.file],
    ["imgly", join(OUT, `${f.slot}.imgly.png`)],
    ["rembg", join(OUT, `${f.slot}.rembg.png`)],
  ]) {
    try {
      const img = sharp(await readFile(path)).resize({ width: W, height: W, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } });
      const bg = sharp({ create: { width: W, height: W, channels: 4, background: "#00000000" } })
        .composite([
          { input: CHECKER, tile: true, blend: "over" },
          { input: await img.png().toBuffer(), blend: "over" },
        ]);
      cells.push({ input: await bg.png().toBuffer(), left: cells.length * W, top: 0 });
    } catch {
      /* missing variant */
    }
  }
  if (cells.length < 2) continue;
  await sharp({ create: { width: W * cells.length, height: W, channels: 4, background: "#111111" } })
    .composite(cells)
    .png()
    .toFile(join(OUT, `SHEET-${f.slot}.png`));
}

const avg = (ms, n) => (n ? (ms / n / 1000).toFixed(1) : "—");
console.log(`\n  @imgly   ${imglyOk}/${files.length} ok   ${avg(imglyMs, imglyOk)}s per image`);
console.log(`  rembg    ${rembgOk}/${files.length} ok   ${avg(rembgMs, rembgOk)}s per image`);
console.log(`\n  Comparison sheets (source | imgly | rembg, on a chequer): ${OUT}\n`);
