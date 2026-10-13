import { playNote, playNoise, type Score } from "@/lib/music";

/**
 * Attract mode. One PSG chip: a square lead, a triangle bass and a tick of noise for
 * a hat, going round the same eight bars for as long as nobody puts a coin in.
 */
const LEAD = [72, 0, 76, 0, 79, 76, 0, 72, 74, 0, 77, 0, 81, 77, 0, 74, 76, 0, 79, 0, 84, 79, 0, 76, 79, 77, 76, 74, 72, 0, 67, 0];
const BASS = [48, 48, 53, 53, 45, 45, 55, 55];

export const attract: Score = (step, t, d) => {
  const i = step % 32;
  const n = LEAD[i];
  if (n) playNote({ freq: n, midi: true, dur: d * 0.8, type: "square", gain: 0.02, release: 0.04, filter: 3200 }, t);
  if (step % 2 === 0) playNote({ freq: BASS[Math.floor(i / 4)], midi: true, dur: d * 1.5, type: "triangle", gain: 0.05, release: 0.05 }, t);
  if (step % 4 === 2) playNoise({ dur: 0.03, gain: 0.01, highpass: 6000 }, t);
};
