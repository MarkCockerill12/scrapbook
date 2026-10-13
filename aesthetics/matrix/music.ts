import { playNote, playNoise, type Score } from "@/lib/music";

/**
 * The construct: a low sawtooth pulse that never resolves, a far-off ping, a hiss on
 * the off-beat. Nothing tuneful; this is a machine keeping time.
 */
const PULSE = [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0];
const ROOT = [38, 38, 36, 41];

export const construct: Score = (step, t, d) => {
  const i = step % 16;
  const r = ROOT[Math.floor(step / 16) % 4];
  if (PULSE[i]) playNote({ freq: r, midi: true, dur: d * 1.4, type: "sawtooth", gain: 0.05, release: 0.12, filter: 520, filterTo: 140 }, t);
  if (i === 4 || i === 12) playNoise({ dur: 0.05, gain: 0.008, highpass: 5000 }, t);
  if (step % 32 === 8) playNote({ freq: r + 48, midi: true, dur: 0.2, type: "sine", gain: 0.012, release: 1.6, wet: 0.8, pan: 0.5 }, t);
  if (step % 64 === 40) playNote({ freq: r + 43, midi: true, dur: 0.2, type: "sine", gain: 0.01, release: 1.6, wet: 0.8, pan: -0.5 }, t);
};
