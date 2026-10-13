/**
 * Quick single-route screenshots for build review.
 *
 *   node scripts/snap.mjs <slug[,slug]> [--out=.shots] [--wait=2500] [--full] [--w=1600 --h=900]
 *                         [--eval="js to run before shot"] [--suffix=name]
 *
 * One browser, many routes. `--full` captures the full scroll height for width-mode pages.
 */
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const args = process.argv.slice(2);
const flag = (n, d) => args.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? d;
const slugs = (args.find((a) => !a.startsWith("--")) ?? "").split(",").filter(Boolean);
const OUT = flag("out", ".shots");
const WAIT = Number(flag("wait", "2500"));
const W = Number(flag("w", "1600"));
const H = Number(flag("h", "900"));
const EVAL = flag("eval", "");
const SUFFIX = flag("suffix", "");
const FULL = args.includes("--full");
const BASE = flag("base", "http://localhost:3000");

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
const ctx = await browser.newContext({ viewport: { width: W, height: H } });
await ctx.addInitScript(() => {
  try {
    localStorage.setItem("sb:consent", "granted");
    localStorage.setItem("sb:booted", "1");
  } catch {}
});
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text().slice(0, 300));
});

for (const slug of slugs) {
  errors.length = 0;
  await page.goto(`${BASE}/${slug === "map" ? "" : slug}`, { waitUntil: "networkidle" }).catch(() => {});
  await page.waitForTimeout(WAIT);
  if (EVAL) {
    await page.evaluate(EVAL).catch((e) => errors.push(`eval: ${e}`));
    await page.waitForTimeout(900);
  }
  const file = `${OUT}/${slug}${SUFFIX ? `-${SUFFIX}` : ""}.png`;
  await page.screenshot({ path: file, fullPage: FULL });
  console.log(`${file}${errors.length ? `  ERRORS: ${[...new Set(errors)].join(" | ")}` : ""}`);
}
await browser.close();
