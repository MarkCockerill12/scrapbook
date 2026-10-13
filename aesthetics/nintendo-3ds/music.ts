import { audioBus } from "@/lib/audio";
import { playNote, playNoise, type Score } from "@/lib/music";

/**
 * The 3DS's two famous moods, generated (not the actual tunes):
 *  - HOME: a soft, sparse marimba-and-bell idle.
 *  - SHOP: bossa-nova lounge jazz — walking bass, rhodes 7th chords on the off-beats,
 *    brushes. The "eShop music" feeling.
 */

const JAZZ = [
  { root: 50, chord: [62, 65, 69, 72] }, // Dm9
  { root: 43, chord: [59, 62, 65, 69] }, // G13
  { root: 48, chord: [60, 64, 67, 71] }, // Cmaj7
  { root: 45, chord: [61, 64, 67, 70] }, // A7
];

export const shopScore: Score = (step, time) => {
  const bar = Math.floor(step / 16) % JAZZ.length;
  const s = step % 16;
  const { root, chord } = JAZZ[bar];
  if (s % 4 === 0) {
    const walk = [0, 7, 12, 10][s / 4];
    playNote({ freq: root + walk - 12, midi: true, dur: 0.18, gain: 0.1, type: "triangle", filter: 900, release: 0.1 }, time);
  }
  if (s === 2 || s === 7 || s === 10 || s === 14) chord.forEach((m, i) => playNote({ freq: m, midi: true, dur: 0.12, gain: 0.03, type: "sine", release: 0.5, wet: 0.35, pan: (i - 1.5) * 0.3 }, time + i * 0.008));
  if (s % 2 === 0) playNoise({ dur: 0.08, gain: s % 4 === 2 ? 0.02 : 0.012, highpass: 3000, lowpass: 9000 }, time);
  if (s === 0 || s === 6 || s === 12) {
    const m = chord[(step / 4) % 4 | 0] + 12;
    playNote({ freq: m, midi: true, dur: 0.18, gain: 0.04, type: "sine", release: 0.4, vibrato: 12, wet: 0.4 }, time);
  }
};

const HOME = [76, -1, 79, 81, -1, 79, 76, -1, 74, -1, 72, 74, -1, 76, -1, -1];
export const homeScore: Score = (step, time) => {
  const m = HOME[step % HOME.length];
  if (m > 0) {
    playNote({ freq: m, midi: true, dur: 0.05, gain: 0.04, type: "sine", release: 0.8, wet: 0.5 }, time);
    playNote({ freq: m + 12, midi: true, dur: 0.02, gain: 0.01, type: "triangle", release: 0.4, wet: 0.5 }, time);
  }
  if (step % 16 === 0) playNote({ freq: 48, midi: true, dur: 1.2, gain: 0.05, type: "sine", attack: 0.2, release: 1.5, wet: 0.4 }, time);
};

/** The shutter: a click and a chirp. */
export function shutter(): void {
  const t = audioBus()?.ctx.currentTime;
  if (t === undefined) return;
  playNoise({ dur: 0.05, gain: 0.12, highpass: 1500 }, t);
  playNoise({ dur: 0.04, gain: 0.08, highpass: 3000 }, t + 0.09);
  playNote({ freq: 1760, dur: 0.05, gain: 0.04, type: "sine" }, t + 0.16);
}

/** StreetPass: the little green-light jingle. */
export function streetpass(): void {
  const t = audioBus()?.ctx.currentTime;
  if (t === undefined) return;
  [72, 76, 79, 84, 88].forEach((m, i) => playNote({ freq: m, midi: true, dur: 0.08, gain: 0.06, type: "sine", release: 0.3, wet: 0.4 }, t + i * 0.08));
}

/** App launch whoosh-bloop. */
export function launch(): void {
  const t = audioBus()?.ctx.currentTime;
  if (t === undefined) return;
  playNote({ freq: 600, from: 300, dur: 0.12, gain: 0.05, type: "sine", wet: 0.3 }, t);
  playNote({ freq: 1200, dur: 0.1, gain: 0.03, type: "sine", wet: 0.3 }, t + 0.08);
}
