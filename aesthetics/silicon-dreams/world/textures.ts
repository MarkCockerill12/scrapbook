import * as THREE from "three";
import { src } from "@/lib/assets";

/**
 * Textures the way a 1996 world server sent them: real photographs, shrunk to a few
 * dozen pixels square, tiled hard and filtered with nearest-neighbour so every texel
 * shows. The photos are real (ambientCG scans, Commons skies); only the resolution is
 * period.
 *
 * Each texture first exists as a flat swatch of its own average colour, then "arrives"
 * when the page decides — that is the download pop-in every one of these worlds had.
 */

const SLUG = "silicon-dreams";

/** File numbers in `sd_tex`. */
export const TEX = {
  grass: 1,
  paving: 2,
  stone: 3,
  marble: 4,
  woodFloor: 5,
  rock: 6,
  plaster: 7,
  tiles: 8,
  roof: 9,
  fabric: 10,
  paint: 11,
  dirt: 12,
  planks: 13,
  turf: 14,
  felt: 15,
  brick: 16,
} as const;
export type TexName = keyof typeof TEX;

const images = new Map<string, Promise<HTMLImageElement>>();

function image(url: string): Promise<HTMLImageElement> {
  let p = images.get(url);
  if (!p) {
    p = new Promise((res, rej) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = url;
    });
    images.set(url, p);
  }
  return p;
}

/** Downsample to `size` px (wide) on a canvas; returns the canvas. */
function shrink(img: HTMLImageElement, size: number, crop?: { y0: number; y1: number }): HTMLCanvasElement {
  const sy = crop ? crop.y0 * img.height : 0;
  const sh = crop ? (crop.y1 - crop.y0) * img.height : img.height;
  const h = Math.max(4, Math.round((size * sh) / img.width));
  const c = document.createElement("canvas");
  c.width = size;
  c.height = h;
  const g = c.getContext("2d");
  if (g) {
    g.imageSmoothingQuality = "high";
    g.drawImage(img, 0, sy, img.width, sh, 0, 0, size, h);
  }
  return c;
}

function average(c: HTMLCanvasElement): THREE.Color {
  const g = c.getContext("2d");
  if (!g) return new THREE.Color(0x888888);
  const d = g.getImageData(0, 0, c.width, c.height).data;
  let r = 0;
  let gg = 0;
  let b = 0;
  for (let i = 0; i < d.length; i += 4) {
    r += d[i];
    gg += d[i + 1];
    b += d[i + 2];
  }
  const n = d.length / 4;
  return new THREE.Color(r / n / 255, gg / n / 255, b / n / 255).convertSRGBToLinear();
}

export interface Swatch {
  texture: THREE.Texture;
  /** The texture's average colour: what the surface shows before it has "downloaded". */
  flat: THREE.Color;
}

const cache = new Map<string, Promise<Swatch>>();

export function surface(name: TexName, size = 64): Promise<Swatch> {
  const key = `${name}@${size}`;
  let p = cache.get(key);
  if (!p) {
    p = image(src(SLUG, "sd_tex", TEX[name])).then((img) => {
      const c = shrink(img, size);
      const t = new THREE.CanvasTexture(c);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.magFilter = THREE.NearestFilter;
      t.minFilter = THREE.NearestFilter;
      t.generateMipmaps = false;
      t.colorSpace = THREE.SRGBColorSpace;
      return { texture: t, flat: average(c) };
    });
    cache.set(key, p);
  }
  return p;
}

/** A real sky photo, cropped above its horizon, for the inside of a sky cylinder. */
export function sky(n: number): Promise<THREE.Texture> {
  return image(src(SLUG, "sd_sky", n)).then((img) => {
    const c = shrink(img, 512, { y0: 0, y1: n === 3 ? 0.8 : 0.72 });
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.MirroredRepeatWrapping;
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
}

/** Text on a sign or a name tag: Arial, small, hard-edged, as a texture. */
export function textTexture(
  lines: string[],
  opts: { w?: number; h?: number; bg?: string; fg?: string; font?: string; outline?: string } = {},
): THREE.CanvasTexture {
  const w = opts.w ?? 128;
  const h = opts.h ?? 32;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  if (g) {
    if (opts.bg) {
      g.fillStyle = opts.bg;
      g.fillRect(0, 0, w, h);
    }
    g.font = opts.font ?? "bold 12px Arial, Helvetica, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    const lh = h / (lines.length + 0.4);
    lines.forEach((line, i) => {
      const y = lh * (i + 0.7);
      if (opts.outline) {
        g.strokeStyle = opts.outline;
        g.lineWidth = 3;
        g.strokeText(line, w / 2, y);
      }
      g.fillStyle = opts.fg ?? "#000";
      g.fillText(line, w / 2, y);
    });
  }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** A photo from any slot of this page, shrunk to `size` px wide, nearest-filtered. */
export function photo(slot: string, n: number, size: number): Promise<THREE.Texture> {
  return new THREE.TextureLoader().loadAsync(src(SLUG, slot, n)).then((t) => {
    const c = document.createElement("canvas");
    const img = t.image as HTMLImageElement;
    c.width = size;
    c.height = Math.round((size * img.height) / img.width);
    c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
    const ct = new THREE.CanvasTexture(c);
    ct.magFilter = ct.minFilter = THREE.NearestFilter;
    ct.generateMipmaps = false;
    ct.colorSpace = THREE.SRGBColorSpace;
    t.dispose();
    return ct;
  });
}

/** A soft radial glow (or ring) for a lens-flare element: a lens effect, so drawn. */
export function flareTexture(size: number, inner: string, outer: string, ring = false): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  if (g) {
    const r = size / 2;
    const grad = g.createRadialGradient(r, r, 0, r, r, r);
    if (ring) {
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(0.7, "rgba(0,0,0,0)");
      grad.addColorStop(0.85, inner);
      grad.addColorStop(1, "rgba(0,0,0,0)");
    } else {
      grad.addColorStop(0, inner);
      grad.addColorStop(0.4, outer);
      grad.addColorStop(1, "rgba(0,0,0,0)");
    }
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
  }
  return new THREE.CanvasTexture(c);
}
