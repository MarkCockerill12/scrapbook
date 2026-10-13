/**
 * Tile several screenshots into one image for review.
 *   node scripts/montage.mjs out.png a.png b.png ... [--cols=2] [--w=800]
 */
import sharp from "sharp";

const args = process.argv.slice(2);
const flag = (n, d) => args.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? d;
const [out, ...files] = args.filter((a) => !a.startsWith("--"));
const cols = Number(flag("cols", "2"));
const W = Number(flag("w", "800"));
const H = Math.round((W * 9) / 16);
const rows = Math.ceil(files.length / cols);

const tiles = await Promise.all(
  files.map((f) =>
    sharp(f).resize(W, H, { fit: "contain", background: "#111" }).png().toBuffer(),
  ),
);
await sharp({
  create: { width: cols * W, height: rows * H, channels: 3, background: "#222" },
})
  .composite(tiles.map((input, i) => ({ input, left: (i % cols) * W, top: Math.floor(i / cols) * H })))
  .png()
  .toFile(out);
console.log(out);
