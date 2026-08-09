/**
 * Visual check harness. Screenshots routes at the three scales that matter.
 *
 * Quality gate 1 in TECHNICAL_SPECS.md is "fits the canvas with nothing clipped at
 * 1.0x and 0.4x" — this is how that gets checked. Not part of the app; scripts/ is
 * gitignored.
 *
 *   node scripts/shots.mjs [baseUrl] [outDir] [--only=<substring>] [--virgin]
 *
 * `--only` filters by shot label, which is what you want while building a single
 * page — the full sweep takes minutes and you only ever care about one channel.
 */
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const positional = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const BASE = positional[0] ?? "http://localhost:3000";
const OUT = positional[1] ?? "./.shots";
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7) ?? "";

const VIEWPORTS = {
  desktop: { width: 1600, height: 900 },
  laptop: { width: 1280, height: 720 },
  /* 0.4x — the low end of quality gate 1 in TECHNICAL_SPECS. */
  small: { width: 640, height: 360 },
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
  /* Must point at a channel that is still `planned`, or it stops testing anything. */
  ["channel-offline", "/jdm", "desktop", async (p) => p.waitForTimeout(900)],

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

  // 02 Early Internet
  ["earlynet", "/early-internet", "desktop", async (p) => p.waitForTimeout(2200)],

  // 16 BBS
  ["bbs", "/bbs", "desktop", async (p) => p.waitForTimeout(3800)],
  [
    "bbs-messages",
    "/bbs",
    "desktop",
    async (p) => {
      await p.waitForTimeout(3800);
      await p.keyboard.press("2");
      await p.waitForTimeout(2600);
    },
  ],

  // 09 Deep Sea
  [
    "deepsea-top",
    "/deep-sea",
    "desktop",
    async (p) => {
      await p.waitForTimeout(1600);
      await p.mouse.move(800, 450);
      await p.waitForTimeout(700);
    },
  ],
  [
    "deepsea-deep",
    "/deep-sea",
    "desktop",
    async (p) => {
      await p.waitForTimeout(1200);
      await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.42));
      await p.mouse.move(700, 400);
      await p.waitForTimeout(1400);
    },
  ],

  // 07 Neon
  ["neon", "/neon", "desktop", async (p) => p.waitForTimeout(1500)],
  [
    "neon-cyan",
    "/neon",
    "desktop",
    async (p) => {
      await p.waitForTimeout(1200);
      await p.getByRole("button", { name: "Preset hue 190" }).click();
      await p.getByRole("button", { name: "Tube 3" }).click();
      await p.waitForTimeout(900);
    },
  ],

  // 18 Windows 98
  ["win98", "/win98", "desktop", async (p) => p.waitForTimeout(1500)],
  [
    "win98-errors",
    "/win98",
    "desktop",
    async (p) => {
      await p.waitForTimeout(1200);
      await p.getByRole("button", { name: "Recycle Bin" }).click();
      await p.waitForTimeout(500);
      const ok = p.getByRole("button", { name: "OK" }).first();
      if (await ok.count()) await ok.click();
      await p.waitForTimeout(500);
      const ok2 = p.getByRole("button", { name: "OK" }).first();
      if (await ok2.count()) await ok2.click();
      await p.waitForTimeout(900);
    },
  ],

  // 08 Game Beach
  ["zine", "/skate-zine", "desktop", async (p) => p.waitForTimeout(2000)],
  [
    "zine-gen10",
    "/skate-zine",
    "desktop",
    async (p) => {
      await p.waitForTimeout(1400);
      for (let i = 0; i < 10; i++) {
        await p.getByRole("button", { name: /copy the copy|it is jammed/ }).click();
        await p.waitForTimeout(120);
      }
      await p.waitForTimeout(900);
    },
  ],
  ["tiki", "/tiki", "desktop", async (p) => p.waitForTimeout(2000)],
  ["gbeach", "/game-beach", "desktop", async (p) => p.waitForTimeout(1800)],
  [
    "gbeach-sign",
    "/game-beach",
    "desktop",
    async (p) => {
      await p.waitForTimeout(1400);
      await p.getByRole("button", { name: "TOURIST INFORMATION" }).click();
      await p.waitForTimeout(3200);
    },
  ],

  // 23 Cyber Sigilism
  ["sigil", "/cyber-sigilism", "desktop", async (p) => p.waitForTimeout(3200)],
  [
    "sigil-on",
    "/cyber-sigilism",
    "desktop",
    async (p) => {
      await p.waitForTimeout(2000);
      await p.getByRole("button", { name: "Open the phone" }).click();
      await p.getByRole("button", { name: "Power on" }).click();
      await p.mouse.click(356, 538);
      await p.waitForTimeout(2600);
    },
  ],

  // 03 Cottagecore
  ["cottage", "/cottagecore", "desktop", async (p) => p.waitForTimeout(2000)],
  [
    "cottage-autumn",
    "/cottagecore",
    "desktop",
    async (p) => {
      await p.waitForTimeout(1400);
      await p.getByRole("button", { name: "autumn" }).click();
      await p.waitForTimeout(1800);
    },
  ],

  // 12 Japanese 3DS
  ["n3ds", "/nintendo-3ds", "desktop", async (p) => p.waitForTimeout(1800)],
  [
    "n3ds-draw",
    "/nintendo-3ds",
    "desktop",
    async (p) => {
      await p.waitForTimeout(1400);
      await p.mouse.move(700, 620);
      await p.mouse.down();
      for (let i = 0; i < 40; i++) {
        await p.mouse.move(660 + Math.sin(i / 4) * 130, 600 + Math.cos(i / 3) * 90);
      }
      await p.mouse.up();
      await p.waitForTimeout(500);
    },
  ],

  // 13 Dead Mall
  ["deadmall-top", "/dead-mall", "desktop", async (p) => p.waitForTimeout(1800)],
  [
    "deadmall-board",
    "/dead-mall",
    "desktop",
    async (p) => {
      await p.waitForTimeout(1400);
      await p.evaluate(() => window.scrollTo(0, 640));
      await p.waitForTimeout(700);
    },
  ],
  [
    "deadmall-court",
    "/dead-mall",
    "desktop",
    async (p) => {
      await p.waitForTimeout(1400);
      await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await p.waitForTimeout(700);
    },
  ],

  // 11 Aztec
  [
    "aztec",
    "/aztec",
    "desktop",
    async (p) => {
      await p.waitForTimeout(1600);
      await p.mouse.move(560, 420);
      await p.waitForTimeout(700);
    },
  ],
  [
    "aztec-rub",
    "/aztec",
    "desktop",
    async (p) => {
      await p.waitForTimeout(1400);
      // Scrub the dirt panel clean.
      await p.mouse.move(320, 660);
      await p.mouse.down();
      for (let i = 0; i < 60; i++) {
        await p.mouse.move(200 + ((i * 37) % 400), 620 + ((i * 23) % 130));
      }
      await p.mouse.up();
      await p.waitForTimeout(700);
    },
  ],

  // 22 Channel 7 News
  ["news", "/news", "desktop", async (p) => p.waitForTimeout(1800)],
  [
    "news-studio",
    "/news",
    "desktop",
    async (p) => {
      await p.waitForTimeout(1200);
      await p.getByRole("button", { name: "Studio cam" }).click();
      await p.getByRole("button", { name: "Breaking" }).click();
      await p.waitForTimeout(800);
    },
  ],

  // 21 Arcade
  ["arcade", "/arcade", "desktop", async (p) => p.waitForTimeout(2000)],
  [
    "arcade-select",
    "/arcade",
    "desktop",
    async (p) => {
      await p.waitForTimeout(1500);
      await p.getByRole("button", { name: "INSERT COIN" }).click();
      await p.waitForTimeout(400);
      await p.getByRole("button", { name: "START" }).click();
      await p.waitForTimeout(700);
    },
  ],

  // 17 PS1
  ["ps1", "/ps1", "desktop", async (p) => p.waitForTimeout(2400)],
  [
    "ps1-corrupt",
    "/ps1",
    "desktop",
    async (p) => {
      await p.waitForTimeout(1400);
      for (let i = 0; i < 3; i++) {
        await p.getByRole("button", { name: /Delete/ }).click();
        await p.waitForTimeout(1600);
      }
      await p.waitForTimeout(900);
    },
  ],

  // 05 Liminal
  ["liminal", "/liminal", "desktop", async (p) => p.waitForTimeout(1800)],
  [
    "liminal-walk",
    "/liminal",
    "desktop",
    async (p) => {
      await p.waitForTimeout(1400);
      await p.mouse.move(800, 450);
      for (let i = 0; i < 14; i++) {
        await p.mouse.wheel(0, 120);
        await p.waitForTimeout(90);
      }
      await p.waitForTimeout(600);
    },
  ],

  // 10 Vaporwave
  ["vapor", "/vaporwave", "desktop", async (p) => p.waitForTimeout(2200)],
  [
    "vapor-closed",
    "/vaporwave",
    "desktop",
    async (p) => {
      await p.waitForTimeout(1600);
      for (const name of ["TRACKLIST.TXT", "NOW PLAYING", "COVER.BMP", "DISPLAY PROPERTIES"]) {
        await p.getByRole("button", { name: `Close ${name}` }).click();
      }
      await p.waitForTimeout(3400);
    },
  ],

  // 04 Xbox 360
  ["xbox", "/xbox-360", "desktop", async (p) => p.waitForTimeout(1600)],
  [
    "xbox-market",
    "/xbox-360",
    "desktop",
    async (p) => {
      await p.waitForTimeout(1200);
      await p.getByRole("button", { name: "Marketplace" }).click();
      await p.waitForTimeout(700);
    },
  ],
  [
    "xbox-games",
    "/xbox-360",
    "desktop",
    async (p) => {
      await p.waitForTimeout(1200);
      await p.getByRole("button", { name: "Games" }).click();
      await p.waitForTimeout(500);
      await p.getByRole("button", { name: "SNIPEZ 360" }).click();
      await p.waitForTimeout(700);
    },
  ],
  [
    "xbox-montage",
    "/xbox-360",
    "desktop",
    async (p) => {
      await p.waitForTimeout(1200);
      await p.getByRole("button", { name: "Media" }).click();
      await p.waitForTimeout(500);
      await p.getByRole("button", { name: /Montage mode/ }).click();
      await p.waitForTimeout(900);
    },
  ],

  // 14 Wii
  [
    "wii",
    "/wii",
    "desktop",
    async (p) => {
      await p.waitForTimeout(1600);
      await p.mouse.move(700, 300);
      await p.waitForTimeout(600);
    },
  ],
  [
    "wii-board",
    "/wii",
    "desktop",
    async (p) => {
      await p.waitForTimeout(1200);
      await p.getByRole("button", { name: /Message Board/ }).click();
      await p.waitForTimeout(700);
    },
  ],
  [
    "wii-page2",
    "/wii",
    "desktop",
    async (p) => {
      await p.waitForTimeout(1200);
      await p.getByRole("button", { name: "Next page" }).click();
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

/**
 * `--gate` runs quality gate 1 instead of the curated shot list: every live channel
 * at 1.0x and at 0.4x, reporting console errors. It is the cheap way to catch a
 * cross-cutting change (a shared reset, a primitive, a lib helper) having broken a
 * page nobody re-opened.
 */
const GATE = process.argv.includes("--gate");
const LIVE = [
  "", "frutiger-aero", "early-internet", "cottagecore", "xbox-360", "liminal",
  "neon", "bbs", "game-beach", "deep-sea", "vaporwave", "aztec", "nintendo-3ds",
  "dead-mall", "wii", "matrix", "ps1", "win98", "arcade", "news", "cyber-sigilism", "tiki", "skate-zine",
];
const GATE_SHOTS = LIVE.flatMap((slug) => [
  [`gate-${slug || "map"}`, `/${slug}`, "desktop", async (p) => p.waitForTimeout(2200)],
  [`gate-${slug || "map"}-04x`, `/${slug}`, "small", async (p) => p.waitForTimeout(2200)],
]);

const browser = await chromium.launch();
await mkdir(OUT, { recursive: true });

const RUN = (GATE ? GATE_SHOTS : SHOTS).filter(([l]) => l.includes(ONLY));

for (const [label, path, vp, prep] of RUN) {
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
