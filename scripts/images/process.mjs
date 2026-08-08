/**
 * Image pipeline: raw grabs -> optimised WebP + a manifest, served locally.
 *
 *   raw/<aesthetic>/<slot>_<nn>.<ext>
 *        -> public/dev-assets/<aesthetic>/<slot>_<nn>.webp        (display)
 *        -> public/dev-assets/<aesthetic>/<slot>_<nn>.thumb.webp  (map card / preview)
 *        -> public/dev-assets/manifest.json
 *
 * Everything lands as WebP. Nothing else is ever uploaded — see scripts/r2/upload.mjs,
 * which refuses any other extension.
 *
 * Deliberately NOT doing background removal yet. That's a separate stage with a real
 * quality decision behind it (rembg vs @imgly, see OPEN_QUESTIONS #8) and it wants
 * benchmarking against the first batch of JDM cars rather than guessing. For now:
 *   - files under raw/<aesthetic>/cutout/ are treated as already having alpha
 *   - everything else is treated as a backdrop/texture and flattened
 *
 *   node scripts/images/process.mjs [aesthetic]
 */
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import sharp from "sharp";
import { PROJECT_ROOT } from "../lib/env.mjs";

const RAW = resolve(PROJECT_ROOT, "raw");
const OUT = resolve(PROJECT_ROOT, "public/dev-assets");

/** The canvas is a fixed 1600x900, so we know the largest anything can ever display. */
const MAX_W = 1600;
const THUMB_W = 480;
const QUALITY = 82;

const SOURCE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".tif", ".tiff", ".bmp"]);

const only = process.argv[2];

async function dirs(path) {
  try {
    const entries = await readdir(path, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}

async function files(path) {
  try {
    const entries = await readdir(path, { withFileTypes: true });
    return entries.filter((e) => e.isFile()).map((e) => e.name);
  } catch {
    return [];
  }
}

/**
 * Slot id is the filename minus its index and extension: `jdm_polaroid_07.jpg`
 * -> slot `jdm_polaroid`, index 7. Pages reference slots, not filenames, so the
 * count of images behind a slot can change without touching page code.
 */
function parseName(filename) {
  const stem = basename(filename, extname(filename));
  const m = stem.match(/^(.*?)_(\d+)$/);
  return m ? { slot: m[1], index: Number(m[2]) } : { slot: stem, index: 0 };
}

async function processOne(aesthetic, file, { hasAlpha }) {
  const src = join(hasAlpha ? join(RAW, aesthetic, "cutout") : join(RAW, aesthetic), file);
  const buf = await readFile(src);
  const hash = createHash("sha1").update(buf).digest("hex").slice(0, 10);

  const { slot, index } = parseName(file);
  const stem = `${slot}_${String(index).padStart(2, "0")}`;
  const outDir = join(OUT, aesthetic);
  await mkdir(outDir, { recursive: true });

  const isGif = extname(file).toLowerCase() === ".gif";
  const meta = await sharp(buf, { animated: isGif }).metadata();

  /**
   * Animated input is loaded by sharp as a single tall strip of frames, so
   * `metadata().height` is frameHeight * frameCount. Recording that in the manifest
   * would size every animated badge at ~15x its real height. `pageHeight` is the true
   * frame height; `pages` is the frame count.
   */
  const animated = (meta.pages ?? 1) > 1;
  const frameHeight = animated ? (meta.pageHeight ?? meta.height) : meta.height;

  const pipeline = () => sharp(buf, { animated: isGif }).rotate();

  const displayOut = join(outDir, `${stem}.webp`);
  await pipeline()
    .resize({
      width: Math.min(MAX_W, meta.width ?? MAX_W),
      withoutEnlargement: true,
    })
    // Never flatten. Alpha is preserved wherever the source has it — the cutout/
    // folder is about POSITIONING intent (measure the visible subject), not about
    // whether an image has transparency. Flattening onto black put a black box behind
    // every transparent 88x31 badge.
    .webp({ quality: QUALITY, alphaQuality: 100, effort: 5 })
    .toFile(displayOut);

  const thumbOut = join(outDir, `${stem}.thumb.webp`);
  await pipeline()
    .resize({ width: THUMB_W, withoutEnlargement: true })
    .webp({ quality: 74, effort: 5 })
    .toFile(thumbOut);

  const outWidth = Math.min(MAX_W, meta.width ?? MAX_W);
  const scale = outWidth / (meta.width || outWidth);
  const outHeight = Math.round((frameHeight || 0) * scale);

  // Dominant colour gives <Cutout> something to paint while the real file loads,
  // which matters because these pages are mostly image.
  let dominant = null;
  try {
    dominant = (await sharp(buf).stats()).dominant;
  } catch {
    /* animated or exotic input — skip */
  }

  // Where the actual subject sits inside the frame. Cutouts are usually padded with
  // transparency, so positioning by file bounds puts things in the wrong place.
  let alphaBox = null;
  if (hasAlpha) {
    try {
      const t = await sharp(buf).trim({ threshold: 1 }).toBuffer({ resolveWithObject: true });
      alphaBox = {
        left: -(t.info.trimOffsetLeft ?? 0),
        top: -(t.info.trimOffsetTop ?? 0),
        width: t.info.width,
        height: t.info.height,
      };
    } catch {
      /* fully opaque or trim failed */
    }
  }

  const bytes = (await stat(displayOut)).size;

  return {
    slot,
    index,
    hash,
    hasAlpha: hasAlpha || Boolean(meta.hasAlpha),
    animated,
    frames: animated ? meta.pages : 1,
    src: `/dev-assets/${aesthetic}/${stem}.webp`,
    thumb: `/dev-assets/${aesthetic}/${stem}.thumb.webp`,
    width: outWidth,
    height: outHeight,
    bytes,
    dominant: dominant
      ? `#${[dominant.r, dominant.g, dominant.b].map((v) => v.toString(16).padStart(2, "0")).join("")}`
      : null,
    alphaBox,
  };
}

const aesthetics = only ? [only] : await dirs(RAW);

if (!aesthetics.length) {
  console.log(
    `\nNothing to do — no folders under ${RAW}\n\n` +
      `  Drop grabs in raw/<aesthetic>/ named after their manifest slot,\n` +
      `  e.g. raw/jdm/jdm_polaroid_07.jpg. Pre-cut PNGs with alpha go in\n` +
      `  raw/<aesthetic>/cutout/ instead.\n\n` +
      `  See AiContext/ScrapBook/IMAGE_MANIFEST.md for the slot list.\n`,
  );
  process.exit(0);
}

const manifest = {};
let totalBytes = 0;
let totalFiles = 0;
let skipped = 0;

for (const aesthetic of aesthetics) {
  const plain = (await files(join(RAW, aesthetic))).filter((f) =>
    SOURCE_EXT.has(extname(f).toLowerCase()),
  );
  const cut = (await files(join(RAW, aesthetic, "cutout"))).filter((f) =>
    SOURCE_EXT.has(extname(f).toLowerCase()),
  );

  if (!plain.length && !cut.length) continue;

  const slots = {};
  for (const [list, hasAlpha] of [
    [plain, false],
    [cut, true],
  ]) {
    for (const file of list) {
      try {
        const entry = await processOne(aesthetic, file, { hasAlpha });
        (slots[entry.slot] ??= []).push(entry);
        totalBytes += entry.bytes;
        totalFiles += 1;
      } catch (err) {
        skipped += 1;
        console.log(`  ! ${aesthetic}/${file}: ${err.message}`);
      }
    }
  }

  for (const list of Object.values(slots)) list.sort((a, b) => a.index - b.index);
  manifest[aesthetic] = slots;

  const n = Object.values(slots).reduce((sum, l) => sum + l.length, 0);
  console.log(`  ${aesthetic.padEnd(18)} ${String(n).padStart(4)} images  ${Object.keys(slots).length} slots`);
}

// The manifest lives in lib/, not in the ignored output folder, and IS committed.
// The app imports it at build time, so keeping it tracked means a clone builds
// without needing anyone's local raw/ images.
await writeFile(
  resolve(PROJECT_ROOT, "lib/asset-manifest.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), aesthetics: manifest }, null, 2) + "\n",
);

console.log(
  `\n  ${totalFiles} images -> ${(totalBytes / 1024 ** 2).toFixed(1)} MB WebP` +
    (skipped ? `  (${skipped} skipped)` : "") +
    `\n  manifest: lib/asset-manifest.json\n`,
);
