import dynamic from "next/dynamic";
import type { ComponentType } from "react";

/**
 * Slug -> page component, for aesthetics that actually exist yet.
 *
 * Anything absent from this map renders <ChannelOffline> instead, so the roster in
 * lib/registry.ts can describe all 23 channels from day one while the build proceeds
 * one page at a time (rule R4). Add the entry here and flip `status` to "live" in the
 * registry when a page ships.
 *
 * Entries are dynamic imports on purpose: 23 pages with their own fonts, textures and
 * physics must never end up in one bundle.
 */
const PAGES: Record<string, ComponentType> = {
  "frutiger-aero": dynamic(() => import("./frutiger-aero")),
  matrix: dynamic(() => import("./matrix")),
  // "early-internet": dynamic(() => import("./early-internet")),
  // "jdm": dynamic(() => import("./jdm")),
};

export function getAestheticComponent(slug: string): ComponentType | null {
  return PAGES[slug] ?? null;
}
