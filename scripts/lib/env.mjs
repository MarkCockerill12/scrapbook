/**
 * Minimal .env.local reader for the standalone scripts.
 *
 * The scripts run under plain `node`, outside Next's env loading (and Playwright
 * won't launch under bun on Windows), so they can't rely on process.env being
 * populated. Deliberately dependency-free.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const REQUIRED = [
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_ENDPOINT",
  "R2_BUCKET_NAME",
  "R2_PUBLIC_URL",
  "R2_PREFIX",
];

export function loadEnv() {
  let raw = "";
  try {
    raw = readFileSync(resolve(ROOT, ".env.local"), "utf8");
  } catch {
    throw new Error(".env.local not found at the project root");
  }

  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }

  const missing = REQUIRED.filter((k) => !env[k]);
  if (missing.length) {
    throw new Error(`.env.local is missing: ${missing.join(", ")}`);
  }

  // The bucket is shared with three other sites. Anything that writes must be
  // fenced to our prefix, so refuse to operate at all if it's been widened.
  const prefix = env.R2_PREFIX.replace(/^\/+|\/+$/g, "");
  if (!prefix || prefix.includes("/")) {
    throw new Error(`R2_PREFIX must be a single path segment, got "${env.R2_PREFIX}"`);
  }
  env.R2_PREFIX = prefix;

  return env;
}

export const PROJECT_ROOT = ROOT;
