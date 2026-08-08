/**
 * Visual check harness. Screenshots routes at the three scales that matter.
 *
 * Quality gate 1 in TECHNICAL_SPECS.md is "fits the canvas with nothing clipped at
 * 1.0x and 0.4x" — this is how that gets checked. Not part of the app; scripts/ is
 * gitignored.
 *
 *   bun scripts/shots.mjs [baseUrl] [outDir]
 */
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = process.argv[3] ?? "./.shots";

const VIEWPORTS = {
  desktop: { width: 1600, height: 900 },
  laptop: { width: 1280, height: 720 },
  phone: { width: 390, height: 844 },
};

/**
 * Pre-answer the consent modal so it isn't sitting over every shot, and mark a few
 * channels visited so the "seen" stamps and the visit counter are exercised.
 * Pass `--virgin` to see the genuine first-run state instead.
 */
const VIRGIN = process.argv.includes("--virgin");
const SEED = `
  try {
    localStorage.setItem('sb:consent', 'granted');
    localStorage.setItem('sb:visited', JSON.stringify(['frutiger-aero','jdm','matrix','wii','deep-sea']));
  } catch {}
`;

/** [label, path, viewport, prep] */
const SHOTS = [
  ["boot", "/", "desktop", async (p) => p.waitForTimeout(1400)],
  ["map", "/", "desktop", async (p) => p.waitForTimeout(4200)],
  [
    "map-hover",
    "/",
    "desktop",
    async (p) => {
      await p.waitForTimeout(4200);
      const card = p.locator("button").filter({ hasText: "Aztec" }).first();
      if (await card.count()) await card.hover();
      await p.waitForTimeout(400);
    },
  ],
  ["map-phone", "/", "phone", async (p) => p.waitForTimeout(4200)],
  ["channel-offline", "/dead-mall", "desktop", async (p) => p.waitForTimeout(900)],

  // 01 Frutiger Aero
  [
    "frutiger",
    "/frutiger-aero",
    "desktop",
    async (p) => {
      await p.waitForTimeout(1800);
      await p.mouse.move(700, 700); // cursor into the water, so the fish react
      await p.waitForTimeout(900);
    },
  ],
  [
    "frutiger-bubbles",
    "/frutiger-aero",
    "desktop",
    async (p) => {
      await p.waitForTimeout(1600);
      await p.mouse.click(460, 640);
      await p.mouse.click(900, 700);
      await p.mouse.move(520, 560);
      await p.waitForTimeout(800);
    },
  ],
  [
    "frutiger-flooded",
    "/frutiger-aero",
    "desktop",
    async (p) => {
      await p.waitForTimeout(1400);
      // Drag the water-level slider to the far right to trigger the flood.
      const slider = p.getByRole("slider", { name: "Water level" });
      const box = await slider.boundingBox();
      if (box) {
        await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await p.mouse.down();
        await p.mouse.move(box.x + box.width + 40, box.y + box.height / 2, { steps: 12 });
        await p.mouse.up();
      }
      await p.waitForTimeout(900);
    },
  ],
  [
    "frutiger-nogloss",
    "/frutiger-aero",
    "desktop",
    async (p) => {
      await p.waitForTimeout(1400);
      await p.getByRole("switch", { name: "Specular gloss" }).click();
      await p.waitForTimeout(700);
    },
  ],

  // 08 Matrix
  ["matrix", "/matrix", "desktop", async (p) => p.waitForTimeout(2200)],
  [
    "matrix-typed",
    "/matrix",
    "desktop",
    async (p) => {
      await p.waitForTimeout(1600);
      const input = p.getByLabel("Terminal input");
      await input.click();
      await input.fill("cat /etc/channels.conf");
      await input.press("Enter");
      await p.waitForTimeout(400);
      await input.fill("ps");
      await input.press("Enter");
      // hover a node so the decrypt effect resolves
      await p.getByRole("button", { name: /^0?3/ }).first().hover().catch(() => {});
      await p.waitForTimeout(900);
    },
  ],
];

const browser = await chromium.launch();
await mkdir(OUT, { recursive: true });

for (const [label, path, vp, prep] of SHOTS) {
  const ctx = await browser.newContext({ viewport: VIEWPORTS[vp] });
  const page = await ctx.newPage();
  if (!VIRGIN) await page.addInitScript(SEED);
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  await prep(page);
  await page.screenshot({ path: `${OUT}/${label}.png` });

  console.log(
    `${label.padEnd(18)} ${path.padEnd(16)} ${vp.padEnd(8)} ${
      errors.length ? `ERRORS: ${errors.slice(0, 3).join(" | ")}` : "ok"
    }`,
  );
  await ctx.close();
}

await browser.close();
console.log(`\n-> ${OUT}`);
