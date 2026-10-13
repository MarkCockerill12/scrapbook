import { playNote, type Score } from "@/lib/music";

/**
 * The dashboard at idle: air, mostly. A slow chord that swells and goes, and a glassy
 * note over it every so often. One step is a beat at 50.
 */
const AIR = [
  [50, 57, 62, 66],
  [47, 54, 59, 62],
  [43, 50, 59, 62],
  [45, 52, 57, 61],
];

export const dash: Score = (step, t) => {
  if (step % 4 === 0) {
    const c = AIR[Math.floor(step / 4) % 4];
    c.forEach((n, k) => playNote({ freq: n, midi: true, dur: 3.6, type: "sine", gain: 0.022, attack: 1.4, release: 1.8, wet: 0.5, detune: 8, pan: (k - 1.5) * 0.3 }, t));
  }
  if (step % 8 === 6) playNote({ freq: AIR[Math.floor(step / 4) % 4][3] + 12, midi: true, dur: 0.3, type: "triangle", gain: 0.012, release: 2, wet: 0.8 }, t);
};
