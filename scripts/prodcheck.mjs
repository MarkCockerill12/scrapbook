/**
 * Production check: load every channel on a running `next start` and report where
 * its images came from and anything that failed to load.
 *
 *   node scripts/prodcheck.mjs [port=3001]
 */
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";

const port = process.argv[2] ?? "3001";
const reg = await readFile(new URL("../lib/registry.ts", import.meta.url), "utf8");
const slugs = [...reg.matchAll(/slug: "([^"]+)"/g)].map((m) => m[1]);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
await ctx.addInitScript(() => {
  try {
    localStorage.setItem("sb:consent", "granted");
    localStorage.setItem("sb:booted", "1");
  } catch {}
});
let bad = 0;
for (const slug of slugs) {
  const page = await ctx.newPage();
  let media = 0;
  let local = 0;
  const failed = [];
  const errors = [];
  page.on("response", (r) => {
    const u = new URL(r.url());
    if (u.pathname.startsWith("/media/")) media += 1;
    if (u.pathname.startsWith("/dev-assets/")) local += 1;
    if (r.status() >= 400) failed.push(`${r.status()} ${u.pathname}`);
  });
  page.on("requestfailed", (r) => failed.push(`FAILED ${new URL(r.url()).pathname}`));
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  await page.goto(`http://localhost:${port}/${slug}`, { waitUntil: "networkidle" }).catch(() => {});
  await page.waitForTimeout(1500);
  const broken = await page.evaluate(() => [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.src).length);
  const ok = !failed.length && !errors.length && !local && !broken;
  if (!ok) bad += 1;
  console.log(`${ok ? "ok " : "BAD"} ${slug.padEnd(16)} bucket ${String(media).padStart(3)} · local ${local} · broken ${broken}${failed.length ? ` · ${[...new Set(failed)].slice(0, 4).join(" | ")}` : ""}${errors.length ? ` · ${errors[0]}` : ""}`);
  await page.close();
}
await browser.close();
process.exit(bad ? 1 : 0);
