/**
 * Cutout stage: strips backgrounds with rembg, into the folder the pipeline already
 * understands.
 *
 *   raw/<aesthetic>/<slot>_NN.jpg   ->   raw/<aesthetic>/cutout/<slot>_NN.png
 *
 * process.mjs treats anything under cutout/ as alpha-bearing and measures its visible
 * subject, so nothing downstream needs to change.
 *
 * WHY rembg AND NOT @imgly (benchmarked 2026-08-08):
 *   - rembg produced clean mattes on every test image — through a mug handle, around
 *     leaf edges, no halo. Production quality.
 *   - @imgly could not be made to run here. It bundles its own sharp 0.32 (vendor libs
 *     8.14.5) which collides with the project's sharp 0.35 in-process; the run dies
 *     with GLib GObject type errors. It would need a separate process to get a fair
 *     trial, and rembg was good enough that this wasn't worth chasing.
 *
 * Two environment notes, both load-bearing:
 *   - `--python 3.11` is REQUIRED. rembg pulls numba via pymatting, and numba has no
 *     wheel for the Python 3.14 on PATH. uv fetches 3.11 on demand.
 *   - `rembg[cpu,cli]`, not `rembg[cli]` — without the cpu extra it refuses to start,
 *     asking for onnxruntime.
 *
 * Uses FOLDER mode (`rembg p`). Per-file invocation paid ~45s of uv/model cold-start
 * every single time; folder mode pays it once.
 *
 *   node scripts/images/cutout.mjs <aesthetic> [slotPrefix]
 */
import { execFile } from "node:child_process";
import { mkdir, readdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { PROJECT_ROOT } from "../lib/env.mjs";

const run = promisify(execFile);
const RAW = resolve(PROJECT_ROOT, "raw");

const aesthetic = process.argv[2];
const prefix = process.argv[3] ?? "";

if (!aesthetic) {
  console.log("\nusage: node scripts/images/cutout.mjs <aesthetic> [slotPrefix]\n");
  process.exit(1);
}

const src = join(RAW, aesthetic);
const dst = join(src, "cutout");

let files = [];
try {
  files = (await readdir(src, { withFileTypes: true }))
    .filter((e) => e.isFile() && /\.(jpg|jpeg|png|webp)$/i.test(e.name))
    .map((e) => e.name)
    .filter((n) => n.startsWith(prefix));
} catch {
  console.log(`\nNo such folder: raw/${aesthetic}\n`);
  process.exit(1);
}

if (!files.length) {
  console.log(`\nNothing to cut in raw/${aesthetic}${prefix ? ` matching "${prefix}"` : ""}\n`);
  process.exit(0);
}

await mkdir(dst, { recursive: true });

// Folder mode processes everything in src, so when a prefix is given we stage just
// those files into a scratch folder rather than cutting the whole aesthetic.
let workingSrc = src;
let scratch = null;
if (prefix) {
  scratch = join(src, ".cutwork");
  await rm(scratch, { recursive: true, force: true });
  await mkdir(scratch, { recursive: true });
  const { copyFile } = await import("node:fs/promises");
  for (const f of files) await copyFile(join(src, f), join(scratch, f));
  workingSrc = scratch;
}

console.log(`\nCutting ${files.length} image(s) from raw/${aesthetic} — first run downloads the model\n`);

const t0 = Date.now();
try {
  await run(
    "uvx",
    ["--python", "3.11", "--from", "rembg[cpu,cli]", "rembg", "p", workingSrc, dst],
    { timeout: 3_600_000, maxBuffer: 32 * 1024 * 1024 },
  );
} catch (err) {
  console.error(`\nrembg failed: ${String(err.message).slice(0, 300)}\n`);
  if (scratch) await rm(scratch, { recursive: true, force: true });
  process.exit(1);
}

if (scratch) await rm(scratch, { recursive: true, force: true });

const made = (await readdir(dst)).filter((f) => f.endsWith(".png")).length;
const secs = ((Date.now() - t0) / 1000).toFixed(0);

console.log(`\n  ${made} cutouts in raw/${aesthetic}/cutout/  (${secs}s total)`);
console.log(`  Next: node scripts/images/process.mjs ${aesthetic}\n`);
