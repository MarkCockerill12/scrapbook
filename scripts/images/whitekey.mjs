/**
 * Flood-fill key: remove the near-white background connected to the image edges.
 * For studio product shots where rembg keeps the whole frame.
 *   node scripts/images/whitekey.mjs <in> <out> [threshold=238]
 */
import sharp from "sharp";
const [inp, out, th = "238"] = process.argv.slice(2);
const T = Number(th);
const { data, info } = await sharp(inp).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const seen = new Uint8Array(W * H);
const stack = [];
for (let x = 0; x < W; x++) stack.push(x, (H - 1) * W + x);
for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1);
while (stack.length) {
  const i = stack.pop();
  if (seen[i]) continue;
  const k = i * 4;
  if (data[k] < T || data[k + 1] < T || data[k + 2] < T) continue;
  seen[i] = 1;
  data[k + 3] = 0;
  const x = i % W;
  if (x > 0) stack.push(i - 1);
  if (x < W - 1) stack.push(i + 1);
  if (i >= W) stack.push(i - W);
  if (i < W * (H - 1)) stack.push(i + W);
}
await sharp(data, { raw: { width: W, height: H, channels: 4 } }).png().toFile(out);
console.log("keyed", out);
