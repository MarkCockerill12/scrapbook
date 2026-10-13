import manifest from "@/lib/asset-manifest.json";

/**
 * Asset lookup. Pages ask for a SLOT, never a filename.
 *
 * A slot ("jdm_polaroid") can have any number of images behind it, and that number
 * changes as grabs come in. Page code that referenced filenames would need editing
 * every time; page code that references slots doesn't.
 *
 * Source flips with NEXT_PUBLIC_ASSET_SOURCE:
 *   unset / anything  -> /dev-assets/...  (local, what we review against)
 *   "r2"              -> /media/...       (rewritten to the bucket, see next.config.ts)
 */

export interface AssetEntry {
  slot: string;
  index: number;
  hash: string;
  hasAlpha: boolean;
  animated: boolean;
  frames: number;
  src: string;
  thumb: string;
  width: number;
  height: number;
  bytes: number;
  dominant: string | null;
  alphaBox: { left: number; top: number; width: number; height: number } | null;
}

interface Manifest {
  generatedAt: string | null;
  aesthetics: Record<string, Record<string, AssetEntry[]>>;
}

const DATA = manifest as Manifest;

const useR2 = process.env.NEXT_PUBLIC_ASSET_SOURCE === "r2";

// Bucket objects are served immutable for a year, and a re-processed image keeps its
// filename — so the content hash rides along as a query, and a changed file is a new URL.
function rewrite(path: string, hash: string): string {
  return useR2 ? `${path.replace(/^\/dev-assets\//, "/media/")}?v=${hash}` : path;
}

function withSource(entry: AssetEntry): AssetEntry {
  return { ...entry, src: rewrite(entry.src, entry.hash), thumb: rewrite(entry.thumb, entry.hash) };
}

/** Every image behind a slot, in index order. Empty array if none have arrived yet. */
export function slot(aesthetic: string, slotId: string): AssetEntry[] {
  const entries = DATA.aesthetics?.[aesthetic]?.[slotId];
  return entries ? entries.map(withSource) : [];
}

/**
 * One image from a slot. `pick` is an index into the slot's list, wrapped — so a
 * collage can ask for `polaroid #7` and still render something once only three
 * images exist, rather than a hole.
 */
export function one(
  aesthetic: string,
  slotId: string,
  pick = 0,
): AssetEntry | null {
  const entries = slot(aesthetic, slotId);
  if (!entries.length) return null;
  return entries[((pick % entries.length) + entries.length) % entries.length];
}

/**
 * Only the alpha-bearing versions of a slot.
 *
 * After the cutout stage a slot holds BOTH the original photo and its matted version,
 * because process.mjs walks `raw/<a>/` and `raw/<a>/cutout/` into the same slot. A
 * collage wants the cutouts; a backdrop wants the originals. Falls back to everything
 * when nothing has been cut yet, so pages work before the stage has been run.
 */
export function cutouts(aesthetic: string, slotId: string): AssetEntry[] {
  const all = slot(aesthetic, slotId);
  const alpha = all.filter((e) => e.hasAlpha);
  return alpha.length ? alpha : all;
}

/** One cutout from a slot, wrapping like `one()`. */
export function cut(
  aesthetic: string,
  slotId: string,
  pick = 0,
): AssetEntry | null {
  const pool = cutouts(aesthetic, slotId);
  if (!pool.length) return null;
  return pool[((pick % pool.length) + pool.length) % pool.length];
}

/**
 * The inverse of `cutouts`: only the ORIGINAL photographs in a slot.
 *
 * After the cutout stage a slot holds both, and `one()` walks the lot — so a page
 * that wants a backdrop and asks for `one(slot, 2)` can silently get a matted
 * version, which renders as a mostly-transparent hole. Backdrops must use this.
 */
export function photos(aesthetic: string, slotId: string): AssetEntry[] {
  const all = slot(aesthetic, slotId);
  const flat = all.filter((e) => !e.hasAlpha);
  return flat.length ? flat : all;
}

/** One original photograph from a slot, wrapping like `one()`. */
export function pic(
  aesthetic: string,
  slotId: string,
  pick = 0,
): AssetEntry | null {
  const pool = photos(aesthetic, slotId);
  if (!pool.length) return null;
  return pool[((pick % pool.length) + pool.length) % pool.length];
}

/** How many images a slot has. Useful for laying out "as many as we've got" grids. */
export function count(aesthetic: string, slotId: string): number {
  return DATA.aesthetics?.[aesthetic]?.[slotId]?.length ?? 0;
}

export const manifestGeneratedAt = DATA.generatedAt;

/**
 * Exact lookup by FILE NUMBER — `raw/<a>/<slot>_07.jpg` is `img(a, slot, 7)`.
 *
 * `pic`/`cut` index into filtered lists, so one PNG with transparency in a slot of
 * JPEGs silently shifts every later pick by one (Frutiger's wallpapers were all two
 * off). File numbers are what the contact sheets show, so pages that hand-pick
 * specific photographs should use these.
 */
export function img(aesthetic: string, slotId: string, n: number): AssetEntry | null {
  const all = slot(aesthetic, slotId).filter((e) => e.index === n);
  return all.find((e) => !e.hasAlpha) ?? all[0] ?? null;
}

/** The matted (cutout) version of file number `n`, falling back to the original. */
export function cutN(aesthetic: string, slotId: string, n: number): AssetEntry | null {
  const all = slot(aesthetic, slotId).filter((e) => e.index === n);
  // A source PNG can already carry alpha (Wikipedia renders often do) and still have a
  // white box around the subject — the matted file in cutout/ always wins.
  return all.find((e) => e.src.includes("/cutout/")) ?? all.find((e) => e.hasAlpha) ?? all[0] ?? null;
}

/** Shorthand: the display URL of file `n`, or "" when absent. */
export function src(aesthetic: string, slotId: string, n: number): string {
  return img(aesthetic, slotId, n)?.src ?? "";
}
