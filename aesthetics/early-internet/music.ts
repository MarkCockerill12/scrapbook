import { playNote, type Score } from "@/lib/music";

/**
 * The page's background MIDI: the tune a homepage played at you whether you wanted it
 * or not. General MIDI at its most cheerful, a melody over an oom-pah.
 */
const TUNE = [72, 76, 79, 76, 77, 81, 84, 81, 79, 76, 72, 76, 74, 77, 74, 71, 72, 76, 79, 84, 81, 77, 74, 77, 76, 79, 76, 72, 74, 71, 72, 0];
const OOM = [48, 53, 48, 55, 48, 53, 55, 48];

export const midi: Score = (step, t, d) => {
  const i = step % 32;
  if (TUNE[i]) playNote({ freq: TUNE[i], midi: true, dur: d * 0.75, type: "triangle", gain: 0.035, release: 0.12 }, t);
  const root = OOM[Math.floor(i / 4)];
  if (i % 2 === 0) playNote({ freq: root - 12, midi: true, dur: d * 0.8, type: "square", gain: 0.012, release: 0.05, filter: 900 }, t);
  else playNote({ freq: root + 7, midi: true, dur: d * 0.4, type: "square", gain: 0.008, release: 0.04, filter: 1600 }, t);
};
