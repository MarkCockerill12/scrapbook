/**
 * Upload processed assets to R2. Dry-run unless you pass --confirm.
 *
 * `markc-assets` is shared with lofiweb, art-portfolio and codedmcportfolio, and the
 * free tier is 10 GB across the whole bucket. Every guard below exists because a
 * mistake here damages three other live sites, not just this one:
 *
 *   1. Every key must start with the configured prefix. No exceptions, no flag to
 *      override — a key that escapes the prefix aborts the whole run.
 *   2. Only .webp / .webm / .json are allowed through. Source JPEGs and PNGs never
 *      reach the bucket; they stay in raw/, which is gitignored and local.
 *   3. The run refuses to start if it would push the bucket past 80% of the tier.
 *   4. Nothing is ever deleted. Pruning is a separate, deliberate act.
 *
 *   node scripts/r2/upload.mjs            # dry run, prints what it would do
 *   node scripts/r2/upload.mjs --confirm  # actually uploads
 *   node scripts/r2/upload.mjs --only=<aesthetic> [--confirm]   # just one channel's folder
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";
import {
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { loadEnv, PROJECT_ROOT } from "../lib/env.mjs";

const env = loadEnv();
const CONFIRM = process.argv.includes("--confirm");
// A new channel's images, without re-putting the other 4000 files that are already there.
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7);

const LOCAL = resolve(PROJECT_ROOT, ONLY ? `public/dev-assets/${ONLY.replace(/[^a-z0-9-]/gi, "")}` : "public/dev-assets");
const ROOT = resolve(PROJECT_ROOT, "public/dev-assets");
const FREE_TIER_BYTES = 10 * 1024 ** 3;
const CEILING = 0.8;

const ALLOWED_EXT = new Set([".webp", ".webm", ".json"]);
const CONTENT_TYPE = {
  ".webp": "image/webp",
  ".webm": "video/webm",
  ".json": "application/json",
};

const s3 = new S3Client({
  region: "auto",
  endpoint: env.R2_ENDPOINT,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

async function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

const local = await walk(LOCAL);
if (!local.length) {
  console.log(
    `\nNothing to upload — ${relative(PROJECT_ROOT, LOCAL)} is empty.\n` +
      `Run: node scripts/images/process.mjs\n`,
  );
  process.exit(0);
}

// --- guard 2: format ------------------------------------------------------
const rejected = local.filter((f) => !ALLOWED_EXT.has(extname(f).toLowerCase()));
if (rejected.length) {
  console.error(`\nABORT — ${rejected.length} file(s) are not .webp/.webm/.json:\n`);
  for (const f of rejected.slice(0, 20)) {
    console.error(`  ${relative(PROJECT_ROOT, f)}`);
  }
  console.error(`\nRe-run the image pipeline; only processed output gets uploaded.\n`);
  process.exit(1);
}

// --- build keys, guard 1: prefix -----------------------------------------
const planned = [];
for (const file of local) {
  const rel = relative(ROOT, file).split("\\").join("/");
  const key = `${env.R2_PREFIX}/${rel}`;

  if (!key.startsWith(`${env.R2_PREFIX}/`) || key.includes("..")) {
    console.error(`\nABORT — key escapes the prefix: ${key}\n`);
    process.exit(1);
  }
  planned.push({ file, key, bytes: (await stat(file)).size });
}

const incoming = planned.reduce((n, p) => n + p.bytes, 0);

// --- guard 3: bucket headroom --------------------------------------------
let existing = 0;
let ours = 0;
let token;
do {
  const page = await s3.send(
    new ListObjectsV2Command({ Bucket: env.R2_BUCKET_NAME, ContinuationToken: token }),
  );
  for (const obj of page.Contents ?? []) {
    existing += obj.Size ?? 0;
    if (obj.Key.startsWith(`${env.R2_PREFIX}/`)) ours += obj.Size ?? 0;
  }
  token = page.IsTruncated ? page.NextContinuationToken : undefined;
} while (token);

// Re-uploading replaces rather than adds, so our current usage is the worst-case
// overlap and subtracting it keeps the projection honest.
const projected = existing - Math.min(ours, incoming) + incoming;
const mb = (b) => (b / 1024 ** 2).toFixed(1);

console.log(`\nBucket   ${env.R2_BUCKET_NAME}`);
console.log(`Prefix   ${env.R2_PREFIX}/`);
console.log(`Files    ${planned.length}  (${mb(incoming)} MB)`);
console.log(
  `Usage    ${mb(existing)} MB now -> ${mb(projected)} MB projected  ` +
    `(${((projected / FREE_TIER_BYTES) * 100).toFixed(2)}% of 10 GB)\n`,
);

if (projected / FREE_TIER_BYTES > CEILING) {
  console.error(
    `ABORT — this would put the shared bucket over ${CEILING * 100}% of the free tier.\n` +
      `Prune before uploading. Run: node scripts/r2/usage.mjs\n`,
  );
  process.exit(1);
}

if (!CONFIRM) {
  for (const p of planned.slice(0, 25)) {
    console.log(`  would put  ${p.key}  (${mb(p.bytes)} MB)`);
  }
  if (planned.length > 25) console.log(`  ... and ${planned.length - 25} more`);
  console.log(`\nDry run. Re-run with --confirm to upload.\n`);
  process.exit(0);
}

let done = 0;
for (const p of planned) {
  const ext = extname(p.file).toLowerCase();
  await s3.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: p.key,
      Body: await readFile(p.file),
      ContentType: CONTENT_TYPE[ext],
      // manifest.json must never be cached; media keys carry a content hash so they
      // can be immutable.
      CacheControl:
        ext === ".json" ? "no-store" : "public, max-age=31536000, immutable",
    }),
  );
  done += 1;
  if (done % 25 === 0 || done === planned.length) {
    console.log(`  ${done}/${planned.length}`);
  }
}

console.log(`\nUploaded ${done} objects to ${env.R2_PREFIX}/\n`);
