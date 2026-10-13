/**
 * The postcards — real screenshots of 1996–2008 beach and water levels, by file number
 * on the contact sheets (en.wikipedia / Super Mario Wiki / Sonic, Zelda, Spyro, Crash,
 * Banjo, Jak, Animal Crossing wikis). `cover` is the game's box art for the stamp.
 */
export interface Card {
  id: string;
  slot: string;
  n: number;
  place: string;
  game: string;
  year: string;
  from: string;
  msg: string;
  cover?: { slot: string; n: number };
  goop?: boolean;
}

export const CARDS: Card[] = [
  { id: "delfino", slot: "gb_mario", n: 1, place: "Delfino Plaza", game: "Super Mario Sunshine", year: "GCN · 2002", from: "Mario", msg: "Arrived! There's paint everywhere and a man is saying it was me. Wish you were here — bring a hose.", cover: { slot: "gb_misc", n: 2 }, goop: true },
  { id: "emerald", slot: "gb_sonic", n: 1, place: "Emerald Coast", game: "Sonic Adventure", year: "Dreamcast · 1998", from: "Sonic", msg: "Ran the whole coast in 22 seconds. An orca chased me across the pier. Ten out of ten, would outrun again.", cover: { slot: "gb_misc", n: 4 } },
  { id: "seaslide", slot: "gb_mario", n: 8, place: "Sea Slide Galaxy", game: "Super Mario Galaxy", year: "Wii · 2007", from: "Mario", msg: "Beach in SPACE. Rode a manta ray around a planet made of sea. Penguins run the lifeguard tower.", cover: { slot: "gb_misc", n: 3 } },
  { id: "windfall", slot: "gb_zelda", n: 2, place: "Windfall Island", game: "The Wind Waker", year: "GCN · 2002", from: "Link", msg: "HYaaaah hyah hyaa hyah hah hyah", goop: true },
  { id: "gelato", slot: "gb_shot", n: 2, place: "Gelato Beach", game: "Super Mario Sunshine", year: "GCN · 2002", from: "a Pianta", msg: "The sand is warm and the watermelons are enormous. Somebody keeps dropping blue coins in the dunes.", cover: { slot: "gb_misc", n: 2 } },
  { id: "treasure", slot: "gb_banjo", n: 1, place: "Treasure Trove Cove", game: "Banjo-Kazooie", year: "N64 · 1998", from: "Banjo & Kazooie", msg: "Climbed a giant sandcastle and got chased by a shark called Snacker. We are not going back in the water.", goop: true },
  { id: "geyser", slot: "gb_jak", n: 2, place: "Geyser Rock", game: "Jak and Daxter", year: "PS2 · 2001", from: "Daxter", msg: "Don't touch the dark eco. I touched the dark eco. Send help, and also a bigger boat.", cover: { slot: "gb_misc", n: 11 } },
  { id: "sunny", slot: "gb_spyro", n: 1, place: "Sunny Beach", game: "Spyro 2", year: "PS1 · 1999", from: "Spyro", msg: "Turtles in the soup, rescued. Charged a lot of crabs. Sparx got a tan.", goop: true },
  { id: "nsanity", slot: "gb_crash", n: 1, place: "N. Sanity Beach", game: "Crash Bandicoot", year: "PS1 · 1996", from: "Crash", msg: "WOAH.", },
  { id: "seaside", slot: "gb_sonic", n: 2, place: "Seaside Hill", game: "Sonic Heroes", year: "GCN/PS2 · 2003", from: "Tails", msg: "The ruins go on for ages and the loops are made of stone. Knuckles won't stop talking about the emerald.", cover: { slot: "gb_misc", n: 10 } },
  { id: "noki", slot: "gb_shot3", n: 3, place: "Noki Bay", game: "Super Mario Sunshine", year: "GCN · 2002", from: "a Noki elder", msg: "The bay is full of goop again. The young ones blame the Piantas. The old ones blame the Piantas.", goop: true },
  { id: "animal", slot: "gb_ac", n: 2, place: "The beach", game: "Animal Crossing", year: "GCN · 2002", from: "Tom Nook", msg: "Wonderful day for fishing! A reminder that your mortgage of 39,800 bells remains outstanding, yes yes.", cover: { slot: "gb_misc", n: 5 } },
];

/** Things lying in the sand. `kind` picks the sound and the counter. */
export type Kind = "coin" | "blue" | "ring" | "rupee" | "bit" | "shine" | "star";
export const PICKUPS: { kind: Kind; slot: string; n: number; x: number; y: number; w: number }[] = [
  { kind: "coin", slot: "gb_item", n: 5, x: 470, y: 400, w: 40 },
  { kind: "coin", slot: "gb_item", n: 5, x: 520, y: 420, w: 40 },
  { kind: "coin", slot: "gb_item", n: 5, x: 570, y: 400, w: 40 },
  { kind: "coin", slot: "gb_item", n: 5, x: 1180, y: 700, w: 40 },
  { kind: "coin", slot: "gb_item", n: 5, x: 1225, y: 715, w: 40 },
  { kind: "blue", slot: "gb_item", n: 2, x: 900, y: 790, w: 44 },
  { kind: "ring", slot: "gb_item2", n: 1, x: 760, y: 360, w: 42 },
  { kind: "ring", slot: "gb_item2", n: 1, x: 810, y: 350, w: 42 },
  { kind: "ring", slot: "gb_item2", n: 1, x: 860, y: 345, w: 42 },
  { kind: "ring", slot: "gb_item2", n: 1, x: 910, y: 350, w: 42 },
  { kind: "rupee", slot: "gb_item3", n: 1, x: 330, y: 820, w: 22 },
  { kind: "rupee", slot: "gb_item3", n: 1, x: 1040, y: 560, w: 22 },
  { kind: "bit", slot: "gb_item", n: 4, x: 1380, y: 420, w: 34 },
  { kind: "bit", slot: "gb_item", n: 4, x: 690, y: 610, w: 30 },
  { kind: "shine", slot: "gb_item", n: 1, x: 1450, y: 250, w: 90 },
  { kind: "star", slot: "gb_item", n: 3, x: 250, y: 395, w: 60 },
];
