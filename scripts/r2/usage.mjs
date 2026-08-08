/**
 * Read-only R2 report: how much space each project is using in the shared bucket.
 *
 * `markc-assets` is shared with lofiweb, art-portfolio and codedmcportfolio, and the
 * R2 free tier is 10 GB total across the whole bucket. ScrapBook is the asset-hungry
 * one (23 pages of photographic collage), so this needs checking before every upload
 * batch, not after.
 *
 *   node scripts/r2/usage.mjs
 */
import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { loadEnv } from "../lib/env.mjs";

const env = loadEnv();
const FREE_TIER_BYTES = 10 * 1024 ** 3;

const s3 = new S3Client({
  region: "auto",
  endpoint: env.R2_ENDPOINT,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

const byPrefix = new Map();
const byExt = new Map();
let total = 0;
let count = 0;
let token;

do {
  const page = await s3.send(
    new ListObjectsV2Command({
      Bucket: env.R2_BUCKET_NAME,
      ContinuationToken: token,
    }),
  );
  for (const obj of page.Contents ?? []) {
    const size = obj.Size ?? 0;
    total += size;
    count += 1;

    const prefix = obj.Key.split("/")[0];
    const p = byPrefix.get(prefix) ?? { bytes: 0, files: 0 };
    p.bytes += size;
    p.files += 1;
    byPrefix.set(prefix, p);

    const ext = obj.Key.includes(".") ? obj.Key.split(".").pop().toLowerCase() : "(none)";
    const e = byExt.get(ext) ?? { bytes: 0, files: 0 };
    e.bytes += size;
    e.files += 1;
    byExt.set(ext, e);
  }
  token = page.IsTruncated ? page.NextContinuationToken : undefined;
} while (token);

const mb = (b) => (b / 1024 ** 2).toFixed(1).padStart(9) + " MB";
const pct = (b) => ((b / FREE_TIER_BYTES) * 100).toFixed(2).padStart(5) + "%";

console.log(`\nBucket: ${env.R2_BUCKET_NAME}   ${count} objects\n`);
console.log("By project prefix");
for (const [prefix, { bytes, files }] of [...byPrefix].sort((a, b) => b[1].bytes - a[1].bytes)) {
  console.log(`  ${prefix.padEnd(22)} ${mb(bytes)}  ${pct(bytes)}  ${String(files).padStart(5)} files`);
}

console.log("\nBy extension");
for (const [ext, { bytes, files }] of [...byExt].sort((a, b) => b[1].bytes - a[1].bytes).slice(0, 12)) {
  console.log(`  ${ext.padEnd(22)} ${mb(bytes)}         ${String(files).padStart(5)} files`);
}

const remaining = FREE_TIER_BYTES - total;
console.log(`\n  ${"TOTAL".padEnd(22)} ${mb(total)}  ${pct(total)}`);
console.log(`  ${"REMAINING (10 GB tier)".padEnd(22)} ${mb(remaining)}\n`);

if (total / FREE_TIER_BYTES > 0.8) {
  console.log("  ⚠  Over 80% of the free tier. Do not upload without pruning first.\n");
}
