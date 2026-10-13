/**
 * Check the bucket against the manifest: every image a page can ask for must be there,
 * at the size we have locally.
 *
 *   node scripts/r2/verify.mjs
 */
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { loadEnv, PROJECT_ROOT } from "../lib/env.mjs";

const env = loadEnv();
const s3 = new S3Client({
  region: "auto",
  endpoint: env.R2_ENDPOINT,
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
});

const remote = new Map();
let token;
do {
  const page = await s3.send(new ListObjectsV2Command({ Bucket: env.R2_BUCKET_NAME, Prefix: `${env.R2_PREFIX}/`, ContinuationToken: token }));
  for (const o of page.Contents ?? []) remote.set(o.Key, o.Size ?? 0);
  token = page.IsTruncated ? page.NextContinuationToken : undefined;
} while (token);

const manifest = JSON.parse(await readFile(resolve(PROJECT_ROOT, "lib/asset-manifest.json"), "utf8"));
const wanted = new Set();
for (const slots of Object.values(manifest.aesthetics)) for (const list of Object.values(slots)) for (const e of list) wanted.add(e.src).add(e.thumb);

const missing = [];
const stale = [];
for (const path of wanted) {
  if (!path) continue;
  const key = `${env.R2_PREFIX}/${path.replace(/^\/dev-assets\//, "")}`;
  if (!remote.has(key)) missing.push(key);
  else {
    const local = await stat(resolve(PROJECT_ROOT, "public", path.slice(1))).catch(() => null);
    if (local && local.size !== remote.get(key)) stale.push(key);
  }
}
console.log(`manifest paths ${wanted.size} · in bucket under ${env.R2_PREFIX}/ ${remote.size} · missing ${missing.length} · size mismatch ${stale.length}`);
for (const k of [...missing, ...stale].slice(0, 20)) console.log(`  ${k}`);
process.exit(missing.length || stale.length ? 1 : 0);
