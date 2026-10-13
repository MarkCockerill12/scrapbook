/**
 * Everything the Windows Vista desktop is configured from. Kept out of the components so
 * the page reads as a desktop and this reads as its settings.
 */

export const A = "frutiger-aero";

export type AppId =
  | "welcome"
  | "media"
  | "messenger"
  | "gallery"
  | "personalize"
  | "aquarium"
  | "computer";

/** Wallpapers offered in Personalize. `n` is the file number, as on the contact sheet. */
export const WALLPAPERS = [
  { id: "serenity", name: "Serenity", slot: "fa_hills", n: 2 },
  { id: "horizon", name: "Horizon", slot: "fa_hills", n: 4 },
  { id: "grassland", name: "Grassland", slot: "fa_ref", n: 20 },
  { id: "ecocity", name: "Eco City", slot: "fa_ref", n: 16 },
  { id: "aquaglobe", name: "Aqua Globe", slot: "fa_ref", n: 18 },
  { id: "harmony", name: "Harmony", slot: "fa_ref", n: 24 },
  { id: "dewdrop", name: "Dewdrop", slot: "fa_dew", n: 1 },
  { id: "deepblue", name: "Deep Blue", slot: "fa_ref", n: 19 },
] as const;

export type WallpaperId = (typeof WALLPAPERS)[number]["id"];

/** Win7 "Window Color" swatches. rgb triplets, applied as the glass tint. */
export const TINTS = [
  { id: "leaf", name: "Leaf", rgb: "74, 184, 96" },
  { id: "lime", name: "Lime", rgb: "150, 214, 52" },
  { id: "sea", name: "Sea Foam", rgb: "46, 196, 170" },
  { id: "sky", name: "Sky", rgb: "60, 160, 230" },
  { id: "twilight", name: "Twilight", rgb: "40, 88, 190" },
  { id: "lilac", name: "Lilac", rgb: "150, 120, 220" },
  { id: "rose", name: "Rose", rgb: "226, 110, 160" },
  { id: "frost", name: "Frost", rgb: "200, 222, 236" },
] as const;

export type TintId = (typeof TINTS)[number]["id"];

/** Frutiger Aero stock art for the Photo Gallery — indices into fa_ref's flat photos. */
export const GALLERY = [
  19, 15, 17, 16, 23, 20, 13, 1, 18, 4, 5, 10, 3, 9, 14, 2, 6, 7, 8, 11, 12, 0, 21, 22,
].map((i) => ({ slot: "fa_ref", n: i + 1 }));

/** Slideshow gadget cycles through the interiors — the "eco office" side of the look. */
export const SLIDESHOW = [0, 2, 3, 4, 5, 6, 10, 9, 13].map((i) => ({ slot: "fa_ref", n: i + 1 }));

/**
 * Messenger contacts are the other channels, signed in as their own residents.
 * Visiting one takes you there.
 */
export interface Contact {
  name: string;
  status: "online" | "away" | "busy" | "offline";
  psm: string;
  slug: string;
  lines: string[];
  pic: { slot: string; n: number };
}

export const CONTACTS: Contact[] = [
  {
    name: "Zack ☆ TRUTH IS OUT THERE",
    status: "online",
    psm: "new UFO pics on my site!!! sign my guestbook",
    slug: "early-internet",
    lines: [
      "omg hi!!!",
      "did u see the lights over the reservoir last nite",
      "i put them on my homepage, its best viewed in netscape",
      "brb my mom needs the phone line",
    ],
    pic: { slot: "fa_ref", n: 15 },
  },
  {
    name: "xX_no_scope_420_Xx",
    status: "busy",
    psm: "in a party — MLG montage rendering 34%",
    slug: "xbox-360",
    lines: ["yo", "1v1 me rust", "cant talk, montage is rendering", "gg ez"],
    pic: { slot: "fa_ref", n: 8 },
  },
  {
    name: "Mii ♥",
    status: "online",
    psm: "♪ Mii channel theme intensifies ♪",
    slug: "wii",
    lines: ["Hi there!", "Want to see my plaza?", "I'm wearing my best hat today :)"],
    pic: { slot: "fa_dew", n: 2 },
  },
  {
    name: "Kai (tiki lounge)",
    status: "away",
    psm: "mai tai o'clock 🌺",
    slug: "tiki",
    lines: ["aloha!", "torches are lit, bar's open", "come by after sunset"],
    pic: { slot: "fa_hills", n: 1 },
  },
  {
    name: "SynergyCorp IT Helpdesk",
    status: "busy",
    psm: "Have you tried restarting?",
    slug: "bbs",
    lines: [
      "Hello, this is IT.",
      "Your ticket #40117 has been escalated.",
      "Please do not reply to this message.",
    ],
    pic: { slot: "fa_ref", n: 13 },
  },
  {
    name: "deep_blue_diver",
    status: "offline",
    psm: "going down. no signal below 200m",
    slug: "deep-sea",
    lines: ["...", "(this contact appears offline — messages will be delivered later)"],
    pic: { slot: "fa_ref", n: 19 },
  },
];

/** Media Player tracks. Each is a generated score in music.ts. */
export const TRACKS = [
  { id: "aqua", title: "Aqua Dreams", artist: "Vista Sound Team", len: 214, art: { slot: "fa_ref", n: 18 } },
  { id: "sky", title: "Blue Sky Morning", artist: "Eco Harmony Ensemble", len: 188, art: { slot: "fa_hills", n: 2 } },
  { id: "leaf", title: "Dew on the Leaf", artist: "Green Future", len: 247, art: { slot: "fa_dew", n: 1 } },
  { id: "dolphin", title: "Crystal Dolphin", artist: "Ocean Glass", len: 201, art: { slot: "fa_ref", n: 17 } },
] as const;

export type TrackId = (typeof TRACKS)[number]["id"];
