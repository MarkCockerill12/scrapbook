import { playNote, type Score } from "@/lib/music";

/**
 * What the hull lets through. A fifth held very low and very long, and now and then
 * something a long way off that might be an animal. One step is two seconds.
 */
const ROOTS = [55, 49, 58.27, 51.91];

export const abyss: Score = (step, t) => {
  if (step % 4 === 0) {
    const r = ROOTS[Math.floor(step / 4) % ROOTS.length];
    playNote({ freq: r, dur: 6.5, type: "sine", gain: 0.06, attack: 2.6, release: 3, wet: 0.5 }, t);
    playNote({ freq: r * 1.5, dur: 6.5, type: "sine", gain: 0.03, attack: 3.2, release: 3, wet: 0.6, detune: 9 }, t);
  }
  if (step % 7 === 5) {
    const f = 190 + ((step * 37) % 90);
    playNote({ freq: f, from: f * 1.35, dur: 2.6, type: "sine", gain: 0.014, attack: 0.9, release: 2.4, wet: 0.9, vibrato: 14, pan: step % 2 ? 0.7 : -0.7 }, t);
  }
};
