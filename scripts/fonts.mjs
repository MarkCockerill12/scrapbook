/**
 * Self-host a Google Font (OFL) for one aesthetic — rule R2 says every page brings
 * its own type.
 *
 *   node scripts/fonts.mjs <aesthetic> "Family Name" [weights=400] [--italic]
 *
 * Downloads the latin woff2 into public/fonts/<aesthetic>/ and prints the @font-face
 * block to paste into that page's CSS module.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PROJECT_ROOT } from "./lib/env.mjs";

const [aesthetic, family, weightsArg = "400"] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const italic = process.argv.includes("--italic");
if (!aesthetic || !family) {
  console.log('usage: node scripts/fonts.mjs <aesthetic> "Family" [400,700] [--italic]');
  process.exit(1);
}
const weights = weightsArg.split(",");
const axis = italic
  ? `ital,wght@${weights.flatMap((w) => [`0,${w}`, `1,${w}`]).join(";")}`
  : `wght@${weights.join(";")}`;
const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}:${axis}&display=block`;
const css = await (
  await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    },
  })
).text();

const dir = resolve(PROJECT_ROOT, "public/fonts", aesthetic);
await mkdir(dir, { recursive: true });
const slug = family.toLowerCase().replace(/\s+/g, "-");
const out = [];
// Keep only the latin subset blocks.
for (const block of css.split("/* ").filter((b) => b.startsWith("latin */"))) {
  const style = /font-style: (\w+)/.exec(block)?.[1] ?? "normal";
  const weight = /font-weight: (\d+)/.exec(block)?.[1] ?? "400";
  const src = /url\((https:[^)]+\.woff2)\)/.exec(block)?.[1];
  if (!src) continue;
  const file = `${slug}-${weight}${style === "italic" ? "i" : ""}.woff2`;
  await writeFile(resolve(dir, file), Buffer.from(await (await fetch(src)).arrayBuffer()));
  out.push(
    `@font-face {\n  font-family: "${family}";\n  src: url("/fonts/${aesthetic}/${file}") format("woff2");\n  font-weight: ${weight};\n  font-style: ${style};\n  font-display: block;\n}`,
  );
}
console.log(out.join("\n\n") || `no latin blocks found for ${family}\n${css.slice(0, 300)}`);
