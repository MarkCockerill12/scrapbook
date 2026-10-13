import { playNote, playNoise, type Score } from "@/lib/music";

/**
 * The board's music: a four-channel tracker module of the kind that came down the line
 * with the door games. A minor arpeggio that never stops, a bass under it, a tick.
 */
const CHORDS = [
  [57, 60, 64, 69],
  [53, 57, 60, 65],
  [48, 55, 60, 64],
  [55, 59, 62, 67],
];

export const tracker: Score = (step, t, d) => {
  const bar = Math.floor(step / 16) % 4;
  const c = CHORDS[bar];
  const i = step % 16;
  playNote({ freq: c[[0, 1, 2, 3, 2, 1][i % 6]] + (i >= 8 ? 12 : 0), midi: true, dur: d * 0.7, type: "square", gain: 0.014, release: 0.06, filter: 2400, pan: i % 2 ? 0.3 : -0.3 }, t);
  if (i === 0 || i === 6 || i === 10) playNote({ freq: c[0] - 24, midi: true, dur: d * 2.4, type: "sawtooth", gain: 0.04, release: 0.08, filter: 420 }, t);
  if (i % 4 === 2) playNoise({ dur: 0.025, gain: 0.008, highpass: 7000 }, t);
};
