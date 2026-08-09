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
  "early-internet": dynamic(() => import("./early-internet")),
  matrix: dynamic(() => import("./matrix")),
  bbs: dynamic(() => import("./bbs")),
  "deep-sea": dynamic(() => import("./deep-sea")),
  neon: dynamic(() => import("./neon")),
  tiki: dynamic(() => import("./tiki")),
  win98: dynamic(() => import("./win98")),
  wii: dynamic(() => import("./wii")),
  "xbox-360": dynamic(() => import("./xbox-360")),
  vaporwave: dynamic(() => import("./vaporwave")),
  liminal: dynamic(() => import("./liminal")),
  ps1: dynamic(() => import("./ps1")),
  arcade: dynamic(() => import("./arcade")),
  news: dynamic(() => import("./news")),
  aztec: dynamic(() => import("./aztec")),
  "dead-mall": dynamic(() => import("./dead-mall")),
  "nintendo-3ds": dynamic(() => import("./nintendo-3ds")),
  cottagecore: dynamic(() => import("./cottagecore")),
  "cyber-sigilism": dynamic(() => import("./cyber-sigilism")),
  "game-beach": dynamic(() => import("./game-beach")),

  // "jdm": dynamic(() => import("./jdm")),
};

export function getAestheticComponent(slug: string): ComponentType | null {
  return PAGES[slug] ?? null;
}
