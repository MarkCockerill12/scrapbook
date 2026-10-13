/**
 * Scripted screenshot: load a route, run a list of steps, shoot.
 *
 *   node scripts/act.mjs <slug> <out-name> "<step>;<step>;..." [--w=1600 --h=900]
 *
 * Steps:  wait:1200 · click:Text of a button · css:selector (click) · key:ArrowUp
 *         hover:selector · hold:KeyW:1500 · wheel:600 · move:800,450 · at:800,450 (click at point) · shot:name
 */
import { chromium } from "playwright";

const [slug, out, steps = ""] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const flag = (n, d) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? d;
const W = Number(flag("w", "1600"));
const H = Number(flag("h", "900"));
const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
const ctx = await browser.newContext({ viewport: { width: W, height: H } });
// --ls=key=value|key=value seeds localStorage (values are stored verbatim)
const seed = flag("ls", "").split("|").filter(Boolean).map((kv) => [kv.slice(0, kv.indexOf("=")), kv.slice(kv.indexOf("=") + 1)]);
await ctx.addInitScript((seeded) => {
  try {
    localStorage.setItem("sb:consent", "granted");
    localStorage.setItem("sb:booted", "1");
    for (const [k, v] of seeded) localStorage.setItem(k, v);
  } catch {}
}, seed);
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 300)));
await page.goto(`http://localhost:3000/${slug}`, { waitUntil: "networkidle" }).catch(() => {});
await page.waitForTimeout(2500);
for (const step of steps.split(";").filter(Boolean)) {
  const [op, ...rest] = step.split(":");
  const arg = rest.join(":");
  try {
    if (op === "wait") await page.waitForTimeout(Number(arg));
    else if (op === "click") await page.getByText(arg, { exact: false }).first().click({ timeout: 3000, force: true });
    else if (op === "css") await page.locator(arg).first().click({ timeout: 3000, force: true });
    else if (op === "hover") await page.locator(arg).first().hover({ timeout: 3000, force: true });
    else if (op === "key") await page.keyboard.press(arg);
    else if (op === "hold") {
      const [k, ms] = arg.split(":");
      await page.keyboard.down(k);
      await page.waitForTimeout(Number(ms));
      await page.keyboard.up(k);
    } else if (op === "wheel") await page.mouse.wheel(0, Number(arg));
    else if (op === "move") await page.mouse.move(...arg.split(",").map(Number));
    else if (op === "at") await page.mouse.click(...arg.split(",").map(Number));
    else if (op === "shot") await page.screenshot({ path: `.shots/${arg}.png` });
  } catch (e) {
    errors.push(`${step}: ${String(e).slice(0, 120)}`);
  }
}
await page.screenshot({ path: `.shots/${out}.png` });
console.log(`.shots/${out}.png${errors.length ? `  ERRORS: ${[...new Set(errors)].join(" | ")}` : ""}`);
await browser.close();
