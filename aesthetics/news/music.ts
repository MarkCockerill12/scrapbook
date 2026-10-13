import { playNote, type Score } from "@/lib/music";

/**
 * The bed: what runs under the anchor once the fanfare is over. A pulse on one note,
 * like a teleprinter with pitch, and a pad that changes chord every four bars.
 */
const PAD = [
  [48, 55, 64],
  [45, 52, 60],
  [41, 48, 57],
  [43, 50, 59],
];

export const bed: Score = (step, t, d) => {
  const i = step % 16;
  const c = PAD[Math.floor(step / 16) % 4];
  if (i === 0) for (const n of c) playNote({ freq: n, midi: true, dur: d * 15, type: "triangle", gain: 0.014, attack: 0.5, release: 0.8, filter: 1400 }, t);
  playNote({ freq: c[0] + 24, midi: true, dur: d * 0.35, type: "square", gain: i % 4 === 0 ? 0.012 : 0.006, release: 0.04, filter: 1800 }, t);
};
