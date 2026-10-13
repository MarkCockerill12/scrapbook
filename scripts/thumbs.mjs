/**
 * Map + Wii previews: screenshot every live channel and keep it as its polaroid.
 *
 * OPEN_QUESTIONS #13 — the cheapest honest thumbnail of a page is the page. Each live
 * channel is captured at the design canvas size with the shell chrome hidden, then
 * saved small into public/thumbs/<slug>.webp (committed — ~30KB each, and the map is
 * the first thing anyone sees). lib/thumbs.json records which exist plus a version
 * stamp per slug for cache-busting.
 *
 *   node scripts/thumbs.mjs [slug,slug] [--base=http://localhost:3000] [--wait=3500]
 *
 * Run under node, not bun (Playwright pipe launch breaks under bun on Windows).
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";
import { PROJECT_ROOT } from "./lib/env.mjs";

const args = process.argv.slice(2);
const flag = (n, d) => args.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? d;
const BASE = flag("base", "http://localhost:3000");
const WAIT = Number(flag("wait", "3500"));
const onlyArg = args.find((a) => !a.startsWith("--"));

const registry = await readFile(resolve(PROJECT_ROOT, "lib/registry.ts"), "utf8");
// Pull live slugs straight out of the roster source — no TS toolchain needed here.
const live = [...registry.matchAll(/slug:\s*"([^"]+)"[\s\S]*?status:\s*"(live|planned)"/g)]
  .filter((m) => m[2] === "live")
  .map((m) => m[1]);
const slugs = onlyArg ? onlyArg.split(",") : live;

const OUT = resolve(PROJECT_ROOT, "public/thumbs");
const INDEX = resolve(PROJECT_ROOT, "lib/thumbs.json");
await mkdir(OUT, { recursive: true });
const index = JSON.parse(await readFile(INDEX, "utf8").catch(() => "{}"));

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
await ctx.addInitScript(() => {
  try {
    localStorage.setItem("sb:consent", "granted");
  } catch {}
});
const page = await ctx.newPage();

for (const slug of slugs) {
  await page.goto(`${BASE}/${slug}`, { waitUntil: "networkidle" }).catch(() => {});
  await page.addStyleTag({
    content: "[data-chrome], nextjs-portal { display: none !important; }",
  });
  await page.waitForTimeout(WAIT);
  const png = await page.screenshot();
  await sharp(png).resize(640, 360).webp({ quality: 80 }).toFile(`${OUT}/${slug}.webp`);
  index[slug] = Date.now().toString(36);
  console.log(`thumb ${slug}`);
}
await browser.close();
await writeFile(INDEX, `${JSON.stringify(index, null, 2)}\n`);
