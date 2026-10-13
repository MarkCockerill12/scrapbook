/**
 * The relics — real objects, described the way a Souls game would describe an item:
 * a name, a type, and a paragraph that is half archaeology and half dread. The facts
 * in each are true; the tone is Izalith's.
 */

export interface Relic {
  id: string;
  slot: string;
  n: number;
  name: string;
  kind: string;
  lore: string;
  /** x on the panorama, y on screen, display width */
  x: number;
  y: number;
  w: number;
}

export const RELICS: Relic[] = [
  {
    id: "sunstone",
    slot: "az_art",
    n: 1,
    name: "Stone of the Fifth Sun",
    kind: "Key Item",
    lore:
      "A basalt disc carved in the reign of Moctezuma II, twenty-four tonnes, found face-down beneath the Zócalo in 1790. At its centre, the sun god holds a human heart in each clawed hand. The four suns before this one ended in jaguars, wind, fire and flood. This one, the priests said, will end in earthquakes.",
    x: 470,
    y: 150,
    w: 300,
  },
  {
    id: "chacmool",
    slot: "az_art",
    n: 2,
    name: "Chacmool",
    kind: "Relic",
    lore:
      "A reclining figure that turns its head to watch you arrive. The bowl on its stomach received offerings: pulque, tamales, incense, and the things no one wrote down. Many were found at Chichén Itzá, all looking toward the door.",
    x: 1830,
    y: 560,
    w: 330,
  },
  {
    id: "olmec",
    slot: "az_art",
    n: 3,
    name: "Colossal Head",
    kind: "Relic",
    lore:
      "Olmec, before 900 BC. Carved from a single boulder of basalt hauled some eighty kilometres without the wheel. Each face is a different ruler, wearing a helmet. None of them are smiling. Seventeen have been found. The mountain they were cut from has not said how many it gave.",
    x: 2480,
    y: 420,
    w: 260,
  },
  {
    id: "atlantes",
    slot: "az_art",
    n: 7,
    name: "Warriors of Tula",
    kind: "Relic",
    lore:
      "Four Toltec warriors, each five metres of stone, who once held up the roof of a temple that is no longer there. They carry atlatls and a bag of incense. They are still holding the roof up. Do not ask them to stop.",
    x: 1150,
    y: 150,
    w: 250,
  },
];

export const MESSAGES = [
  { x: 380, text: "praise the sun \\o/", note: "rated: good ×1,204" },
  { x: 980, text: "be wary of lava", note: "rated: good ×77" },
  { x: 1480, text: "hidden path ahead", note: "rated: good ×3" },
  { x: 2080, text: "try jumping", note: "rated: good ×9,001 — there is a crack in the floor here" },
  { x: 2680, text: "time for fire", note: "rated: good ×42" },
];

/** The place the "try jumping" message points at: click the crack three times. */
export const CRACK_X = 2130;
