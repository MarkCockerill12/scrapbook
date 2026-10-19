import { playNote, type Score } from "@/lib/music";
import { score as galleryScore } from "./sound";
import type { WorldId } from "./world/chat";

/**
 * One loop per world, in the General-MIDI-through-a-sound-card voice every 1996 client
 * shipped with: square leads, triangle bass, a little reverb. 16 steps a bar.
 */

const n = (freq: number, dur: number, type: OscillatorType, gain: number, t: number, extra: object = {}) =>
  playNote({ freq, midi: true, dur, type, gain, attack: 0.005, release: 0.25, ...extra }, t);

// Ground Zero: bright, a bit naff, C major with a hopeful IV–V.
const HUB = [
  { bass: 48, chord: [60, 64, 67], lead: [72, 0, 76, 0, 79, 0, 76, 74, 72, 0, 74, 0, 76, 0, 0, 0] },
  { bass: 53, chord: [60, 65, 69], lead: [77, 0, 76, 0, 74, 0, 72, 0, 74, 0, 76, 0, 77, 0, 0, 0] },
  { bass: 55, chord: [62, 67, 71], lead: [79, 0, 77, 0, 76, 0, 74, 0, 76, 0, 74, 0, 71, 0, 0, 0] },
  { bass: 48, chord: [60, 64, 67], lead: [72, 0, 0, 0, 67, 0, 69, 71, 72, 0, 0, 0, 0, 0, 0, 0] },
];
const hub: Score = (step, t, d) => {
  const bar = HUB[Math.floor(step / 16) % HUB.length];
  const s = step % 16;
  if (s % 4 === 0) n(bar.bass, d * 3, "triangle", 0.09, t);
  if (s % 8 === 4) for (const c of bar.chord) n(c, d * 2, "square", 0.012, t, { filter: 1800, wet: 0.3 });
  const m = bar.lead[s];
  if (m) n(m, d * 1.6, "square", 0.022, t, { filter: 2600, wet: 0.35 });
};

// Sky Island: a breathy pentatonic tune over an open fifth.
const ISLE = [74, 0, 76, 79, 0, 81, 79, 0, 76, 0, 74, 0, 71, 0, 74, 0];
const island: Score = (step, t, d) => {
  const s = step % 16;
  const bar = Math.floor(step / 16) % 2;
  if (s === 0) {
    n(bar ? 43 : 38, d * 15, "sine", 0.08, t, { attack: 0.4, release: 1 });
    n(bar ? 50 : 45, d * 15, "sine", 0.04, t, { attack: 0.6, release: 1 });
  }
  const m = ISLE[(s + bar * 4) % 16];
  if (m) n(m, d * 2.2, "sine", 0.05, t, { vibrato: 12, attack: 0.04, wet: 0.6 });
};

// CyberCafé: lounge. Electric-piano-ish triangles, a walking bass.
const CAFE = [
  { chord: [57, 60, 64, 67], walk: [45, 47, 48, 50] },
  { chord: [55, 59, 62, 65], walk: [43, 45, 47, 48] },
  { chord: [53, 57, 60, 64], walk: [41, 43, 45, 47] },
  { chord: [52, 56, 59, 62], walk: [40, 42, 44, 45] },
];
const cafe: Score = (step, t, d) => {
  const bar = CAFE[Math.floor(step / 16) % CAFE.length];
  const s = step % 16;
  if (s % 4 === 0) n(bar.walk[s / 4], d * 3.5, "triangle", 0.085, t);
  if (s === 0 || s === 10) for (const c of bar.chord) n(c, d * 4, "triangle", 0.022, t, { attack: 0.01, release: 0.9, wet: 0.5 });
  if (s % 4 === 2) playNote({ freq: 8000, dur: 0.02, type: "square", gain: 0.006 }, t);
};

// The Void: almost nothing. A low drone and, now and then, one note far away.
const voidScore: Score = (step, t, d) => {
  const s = step % 64;
  if (s === 0) {
    n(33, d * 63, "sine", 0.07, t, { attack: 3, release: 4 });
    n(40, d * 63, "sine", 0.03, t, { attack: 5, release: 4, detune: 9 });
  }
  if (s === 37) n(81, d * 2, "sine", 0.025, t, { release: 3, wet: 1 });
};

export const SCORES: Record<WorldId, { score: Score; bpm: number }> = {
  hub: { score: hub, bpm: 104 },
  island: { score: island, bpm: 84 },
  cafe: { score: cafe, bpm: 92 },
  void: { score: voidScore, bpm: 60 },
  gallery: { score: galleryScore, bpm: 66 },
};
