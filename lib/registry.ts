/**
 * The roster. Single source of truth for every aesthetic in the site.
 *
 * `order` in this array IS the dial order — left/right cycling walks this list and
 * wraps at both ends. The order deliberately alternates loud/quiet and never places
 * two dark, two bright, two "tech UI" or two collage-heavy pages next to each other,
 * so every transition lands as a shock.
 *
 * Adding an aesthetic = one entry here + one folder in /aesthetics.
 */

export type CanvasMode =
  /** Fit both axes, letterbox the remainder. The default — one screen, no scroll. */
  | "fit"
  /** Fit width, scroll vertically. Only for pages whose concept IS the scroll. */
  | "width";

export type AestheticStatus = "live" | "planned";

export interface Aesthetic {
  slug: string;
  /** Channel number shown on the dial. Derived from array position, 1-indexed. */
  channel: number;
  name: string;
  /** Shown under the name on the dial readout and the world map. */
  tagline: string;
  /** Drives the dial glow and the map pin. The ONE piece of per-page colour the chrome uses. */
  accent: string;
  status: AestheticStatus;
  canvas: { width: number; height: number; mode: CanvasMode };
  /**
   * Painted around the canvas when the viewport aspect doesn't match. Treat it as
   * part of the composition — a CRT bezel, the desk the scrapbook sits on, mall
   * carpet, sand — not as dead space. Defaults to black.
   */
  letterbox?: string;
  /** Position on the world map, as percentages of the map's own coordinate space. */
  map: { x: number; y: number };
  tags: string[];
}

const FIT = { width: 1600, height: 900, mode: "fit" as const };

/** Ordered by dial adjacency, not by theme. See the note above before reordering. */
const ROSTER: Omit<Aesthetic, "channel">[] = [
  {
    slug: "frutiger-aero",
    name: "Frutiger Aero",
    tagline: "AquaOS 2004 — product tour",
    accent: "#3fb9f0",
    status: "live",
    canvas: FIT,
    letterbox: "#02243f",
    map: { x: 18, y: 30 },
    tags: ["clean", "glossy", "bright", "physics"],
  },
  {
    slug: "early-internet",
    name: "Early Internet",
    tagline: "Zack's UFO & Paranormal Homepage",
    accent: "#ff00ff",
    status: "live",
    canvas: FIT,
    letterbox: "#000018",
    map: { x: 74, y: 12 },
    tags: ["messy", "loud", "anti-design", "collage"],
  },
  {
    slug: "cottagecore",
    name: "Cottagecore",
    tagline: "A window seat and no urgency",
    accent: "#c98f5e",
    status: "planned",
    canvas: FIT,
    map: { x: 30, y: 74 },
    tags: ["warm", "quiet", "painted", "slow"],
  },
  {
    slug: "xbox-360",
    name: "Xbox 360",
    tagline: "xX_no_scope_420_Xx's montage",
    accent: "#8fd400",
    status: "live",
    canvas: FIT,
    letterbox: "#0b1408",
    map: { x: 62, y: 44 },
    tags: ["loud", "gaming", "ui", "2010"],
  },
  {
    slug: "liminal",
    name: "Liminal",
    tagline: "You are not supposed to be in here",
    accent: "#d9c98a",
    status: "live",
    /*
     * `fit`, not `width` — the corridor is genuinely infinite in BOTH directions and
     * a scrollbar can't express that. Walking is driven by the wheel instead, so
     * travel can go negative (which is where the exit is). See the page README.
     */
    canvas: FIT,
    letterbox: "#0b0a06",
    map: { x: 50, y: 88 },
    tags: ["dark", "quiet", "unsettling", "scroll"],
  },
  {
    slug: "neon",
    name: "Neon",
    tagline: "SPECTRUM — customise your look",
    accent: "#ff2fd0",
    status: "live",
    canvas: FIT,
    letterbox: "#0a0210",
    map: { x: 86, y: 62 },
    tags: ["dark", "saturated", "clean", "light"],
  },
  {
    slug: "bbs",
    name: "BBS / Teletext",
    tagline: "THE ATTIC BBS — 1 node, 300 baud",
    accent: "#00c8c8",
    status: "live",
    canvas: FIT,
    letterbox: "#000000",
    map: { x: 12, y: 58 },
    tags: ["text", "keyboard", "retro", "1987"],
  },
  {
    slug: "game-beach",
    name: "Game Beach",
    tagline: "Isle Delfino tourist board",
    accent: "#25c4d8",
    status: "planned",
    canvas: FIT,
    map: { x: 40, y: 20 },
    tags: ["bright", "3d", "gaming", "2002"],
  },
  {
    slug: "deep-sea",
    name: "Deep Sea",
    tagline: "DSV-4 descent log",
    accent: "#1de5c2",
    status: "live",
    canvas: { width: 1600, height: 5400, mode: "width" },
    letterbox: "#01070a",
    map: { x: 68, y: 92 },
    tags: ["dark", "quiet", "3d", "scroll"],
  },
  {
    slug: "vaporwave",
    name: "Vaporwave",
    tagline: "A E S T H E T I C S / 美学",
    accent: "#ff6ad5",
    status: "live",
    canvas: FIT,
    letterbox: "#17032e",
    map: { x: 90, y: 30 },
    tags: ["saturated", "ui", "collage", "2012"],
  },
  {
    slug: "aztec",
    name: "Aztec / Izalith",
    tagline: "Expedition log — day 47",
    accent: "#e0912f",
    status: "live",
    canvas: FIT,
    letterbox: "#0a0705",
    map: { x: 24, y: 46 },
    tags: ["dark", "stone", "fire", "dread"],
  },
  {
    slug: "nintendo-3ds",
    name: "Japanese 3DS",
    tagline: "A borrowed 3DS, left on the drawing app",
    accent: "#e64c8c",
    status: "planned",
    canvas: FIT,
    map: { x: 56, y: 66 },
    tags: ["kawaii", "hardware", "ui", "night"],
  },
  {
    slug: "dead-mall",
    name: "Dead Mall",
    tagline: "Northgate Centre — 6 of 84 occupied",
    accent: "#39b8a4",
    status: "live",
    canvas: { width: 1600, height: 2900, mode: "width" },
    letterbox: "#0d1616",
    map: { x: 78, y: 76 },
    tags: ["empty", "teal", "melancholy", "scroll"],
  },
  {
    slug: "wii",
    name: "Wii Menu",
    tagline: "The Channel Menu",
    accent: "#3aa3d9",
    status: "live",
    canvas: FIT,
    letterbox: "#c3d2da",
    map: { x: 46, y: 36 },
    tags: ["bright", "white", "ui", "friendly"],
  },
  {
    slug: "matrix",
    name: "Matrix",
    tagline: "Unauthorised session",
    accent: "#00ff41",
    status: "live",
    canvas: FIT,
    letterbox: "#020604",
    map: { x: 8, y: 80 },
    tags: ["dark", "green", "terminal", "cinematic"],
  },
  {
    slug: "tiki",
    name: "Tropical Night",
    tagline: "Kai's Tiki Lounge",
    accent: "#ff7a3d",
    // Code is complete and the cutout pipeline works; held back because the
    // auto-harvested photography is the wrong material (see aesthetics/tiki/README.md).
    status: "planned",
    canvas: FIT,
    letterbox: "#06080f",
    map: { x: 34, y: 8 },
    tags: ["warm", "dark", "fire", "beach"],
  },
  {
    slug: "ps1",
    name: "PS1 Low-Poly",
    tagline: "Memory Card (8MB) — Slot 1",
    accent: "#9aa4c8",
    status: "live",
    canvas: FIT,
    letterbox: "#0b1120",
    map: { x: 66, y: 24 },
    tags: ["3d", "dither", "grey", "1997"],
  },
  {
    slug: "skate-zine",
    name: "Skate Zine",
    tagline: "SHRED WEEKLY #12",
    accent: "#e8e2d0",
    status: "planned",
    canvas: FIT,
    map: { x: 20, y: 16 },
    tags: ["collage", "photocopy", "messy", "tactile"],
  },
  {
    slug: "win98",
    name: "Windows 98",
    tagline: "SYNERGYCORP INTRANET v2.1",
    accent: "#0a58a6",
    status: "live",
    canvas: FIT,
    letterbox: "#2a4d73",
    map: { x: 88, y: 46 },
    tags: ["ui", "grey", "corporate", "windows"],
  },
  {
    slug: "jdm",
    name: "JDM",
    tagline: "midnight-run.jp // ROLL CALL",
    accent: "#a855f7",
    status: "planned",
    canvas: FIT,
    map: { x: 52, y: 52 },
    tags: ["collage", "purple", "night", "photo"],
  },
  {
    slug: "arcade",
    name: "Arcade",
    tagline: "1 PLAYER — INSERT COIN",
    accent: "#ffd400",
    status: "live",
    canvas: FIT,
    letterbox: "#0a0806",
    map: { x: 14, y: 68 },
    tags: ["crt", "cabinet", "loud", "gaming"],
  },
  {
    slug: "news",
    name: "Channel 7 News",
    tagline: "Action News at 6 — with your weather",
    accent: "#d92b2b",
    status: "live",
    canvas: FIT,
    letterbox: "#0c0d10",
    map: { x: 72, y: 58 },
    tags: ["broadcast", "4:3", "graphics", "1998"],
  },
  {
    slug: "cyber-sigilism",
    name: "Cyber Sigilism",
    tagline: "A drawer of dead devices",
    accent: "#b8c0cc",
    status: "planned",
    canvas: FIT,
    map: { x: 42, y: 90 },
    tags: ["silver", "chrome", "flat-lay", "y2k"],
  },
];

export const AESTHETICS: Aesthetic[] = ROSTER.map((a, i) => ({
  ...a,
  channel: i + 1,
}));

const BY_SLUG = new Map(AESTHETICS.map((a) => [a.slug, a]));

export function getAesthetic(slug: string): Aesthetic | undefined {
  return BY_SLUG.get(slug);
}

export function getIndex(slug: string): number {
  return AESTHETICS.findIndex((a) => a.slug === slug);
}

/** Walks the dial. `step` of -1/+1 for prev/next; wraps at both ends. */
export function neighbour(slug: string, step: number): Aesthetic {
  const i = getIndex(slug);
  const from = i === -1 ? 0 : i;
  const next = (from + step + AESTHETICS.length) % AESTHETICS.length;
  return AESTHETICS[next];
}

export const DEFAULT_SLUG = AESTHETICS[0].slug;
export const ALL_SLUGS = AESTHETICS.map((a) => a.slug);
