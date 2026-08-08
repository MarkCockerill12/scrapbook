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

function rewrite(path: string): string {
  return useR2 ? path.replace(/^\/dev-assets\//, "/media/") : path;
}

function withSource(entry: AssetEntry): AssetEntry {
  return { ...entry, src: rewrite(entry.src), thumb: rewrite(entry.thumb) };
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

/** How many images a slot has. Useful for laying out "as many as we've got" grids. */
export function count(aesthetic: string, slotId: string): number {
  return DATA.aesthetics?.[aesthetic]?.[slotId]?.length ?? 0;
}

export const manifestGeneratedAt = DATA.generatedAt;
