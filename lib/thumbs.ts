import index from "@/lib/thumbs.json";

/**
 * Channel previews — a screenshot of each live page, captured by scripts/thumbs.mjs.
 *
 * Used by the map's taped-in polaroids and the Wii menu's channel tiles. The version
 * stamp busts the browser cache whenever a page is re-captured after a redesign.
 */
const THUMBS = index as Record<string, string>;

export function thumbFor(slug: string): string | null {
  const v = THUMBS[slug];
  return v ? `/thumbs/${slug}.webp?v=${v}` : null;
}
