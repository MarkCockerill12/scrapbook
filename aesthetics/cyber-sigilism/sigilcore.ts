import { audioBus } from "@/lib/audio";
import { playKick, playNote, playNoise, type Score } from "@/lib/music";

/**
 * "Sigilcore" — the music the aesthetic lives next to: a glassy detuned supersaw pad,
 * an 808 sub that glides, skittering trap hats in triplets, and a bell lead that
 * sparkles. Minor, slow, cold.
 */
const PROG = [
  { root: 37, chord: [61, 64, 68, 71] }, // C#m9-ish
  { root: 33, chord: [57, 61, 64, 68] }, // Amaj7
  { root: 40, chord: [59, 64, 67, 71] }, // Em
  { root: 35, chord: [59, 62, 66, 69] }, // Bm7
];
const BELL = [83, -1, 80, 76, -1, 83, 85, -1, 80, -1, 76, 73, -1, 76, -1, -1];

export const sigilcore: Score = (step, time, dur) => {
  const bar = Math.floor(step / 16) % PROG.length;
  const s = step % 16;
  const { root, chord } = PROG[bar];
  if (s === 0) {
    chord.forEach((m, i) =>
      playNote({ freq: m, midi: true, dur: dur * 15, gain: 0.02, attack: 0.3, release: 1.8, type: "sawtooth", filter: 2400, filterTo: 900, detune: 30, wet: 0.7, pan: (i - 1.5) * 0.5 }, time),
    );
  }
  if (s === 0 || s === 7 || s === 10) {
    playNote({ freq: root, midi: true, from: s === 10 ? 2 ** ((root + 5 - 69) / 12) * 440 : undefined, dur: dur * 5, gain: 0.16, type: "sine", release: 0.4 }, time);
    if (s === 0) playKick(time, 0.4, 0.8);
  }
  if (s === 8) playNoise({ dur: 0.18, gain: 0.08, highpass: 1800, lowpass: 9000, wet: 0.5 }, time);
  // triplet hat rolls every other bar
  if (s % 2 === 0 || (bar % 2 === 1 && s > 11)) playNoise({ dur: 0.02, gain: 0.025, highpass: 8000, pan: Math.sin(step) * 0.5 }, time);
  const b = BELL[s];
  if (b > 0) playNote({ freq: b, midi: true, dur: 0.04, gain: 0.03, type: "sine", release: 1.2, wet: 0.8, pan: 0.3 }, time);
};

export function inkSound(): void {
  const t = audioBus()?.ctx.currentTime;
  if (t === undefined) return;
  playNoise({ dur: 0.5, gain: 0.05, highpass: 3000, lowpass: 9000, wet: 0.4 }, t);
  [88, 95, 100].forEach((m, i) => playNote({ freq: m, midi: true, dur: 0.05, gain: 0.04, type: "sine", release: 0.9, wet: 0.8 }, t + 0.1 + i * 0.07));
}

export function clickWheel(): void {
  const t = audioBus()?.ctx.currentTime;
  if (t === undefined) return;
  playNote({ freq: 3000, dur: 0.005, gain: 0.04, type: "square", release: 0.01 }, t);
}

export function beep(f = 1200): void {
  const t = audioBus()?.ctx.currentTime;
  if (t === undefined) return;
  playNote({ freq: f, dur: 0.06, gain: 0.05, type: "square", filter: 4000 }, t);
}
