import { audioBus } from "@/lib/audio";
import { playNote, playNoise, type Score } from "@/lib/music";
import type { Kind } from "./data";

/**
 * Game Beach sound — a calypso on steel drums (the Delfino Plaza feeling, not the
 * tune), and a pickup sound per collectible that nods to the game it came from.
 */

const at = () => audioBus()?.ctx.currentTime;

/** Steel pan: a sine with a quick-decaying inharmonic partial. */
function pan(m: number, t: number, g = 0.06) {
  playNote({ freq: m, midi: true, dur: 0.04, gain: g, type: "sine", release: 0.5, wet: 0.25 }, t);
  playNote({ freq: m + 19.02, midi: true, dur: 0.02, gain: g * 0.3, type: "sine", release: 0.18 }, t);
  playNote({ freq: m + 12, midi: true, dur: 0.02, gain: g * 0.25, type: "triangle", release: 0.25 }, t);
}

const CHORDS = [
  [60, 64, 67],
  [65, 69, 72],
  [67, 71, 74],
  [60, 64, 67],
];
const MELODY = [72, -1, 76, 79, -1, 76, 77, 76, 74, -1, 72, 74, 76, -1, 72, -1];

export const calypso: Score = (step, time) => {
  const bar = Math.floor(step / 16) % 4;
  const s = step % 16;
  const ch = CHORDS[bar];
  // bass: the calypso 1 . . 1 . . 1 . pattern
  if (s === 0 || s === 6 || s === 12) playNote({ freq: ch[0] - 24, midi: true, dur: 0.14, gain: 0.12, type: "sine", release: 0.12 }, time);
  if (s === 3 || s === 9) playNote({ freq: ch[2] - 24, midi: true, dur: 0.1, gain: 0.07, type: "sine", release: 0.1 }, time);
  // strummed chord off-beats
  if (s % 4 === 2) ch.forEach((m, i) => pan(m, time + i * 0.012, 0.028));
  // melody
  const m = MELODY[(s + bar * 4) % MELODY.length];
  if (m > 0 && s % 2 === 0) pan(m + (bar === 1 ? 5 : bar === 2 ? 7 : 0), time, 0.055);
  // shaker + woodblock
  if (s % 2 === 0) playNoise({ dur: 0.03, gain: s % 4 === 0 ? 0.018 : 0.03, highpass: 6000 }, time);
  if (s === 4 || s === 14) playNote({ freq: 900, dur: 0.02, gain: 0.04, type: "square", filter: 1500, release: 0.03 }, time);
};

export function pickup(kind: Kind): void {
  const t = at();
  if (t === undefined) return;
  switch (kind) {
    case "coin":
      playNote({ freq: 83, midi: true, dur: 0.06, gain: 0.07, type: "square", filter: 4000 }, t);
      playNote({ freq: 88, midi: true, dur: 0.3, gain: 0.07, type: "square", filter: 4000 }, t + 0.07);
      break;
    case "blue":
      [84, 88, 91, 96].forEach((m, i) => playNote({ freq: m, midi: true, dur: 0.08, gain: 0.06, type: "triangle", wet: 0.3 }, t + i * 0.06));
      break;
    case "ring":
      playNote({ freq: 88, midi: true, dur: 0.05, gain: 0.06, type: "square", filter: 6000 }, t);
      playNote({ freq: 93, midi: true, dur: 0.25, gain: 0.06, type: "square", filter: 6000, pan: -0.5 }, t + 0.05);
      playNote({ freq: 93, midi: true, dur: 0.25, gain: 0.04, type: "square", filter: 6000, pan: 0.5 }, t + 0.09);
      break;
    case "rupee":
      [79, 84, 88].forEach((m, i) => playNote({ freq: m, midi: true, dur: 0.07, gain: 0.06, type: "sine", wet: 0.3 }, t + i * 0.05));
      break;
    case "bit":
      [96, 100, 103].forEach((m, i) => playNote({ freq: m, midi: true, dur: 0.05, gain: 0.04, type: "sine", wet: 0.6 }, t + i * 0.04));
      break;
    case "shine":
    case "star":
      [72, 76, 79, 84, 79, 84, 88].forEach((m, i) => playNote({ freq: m, midi: true, dur: i === 6 ? 0.7 : 0.1, gain: 0.07, type: "square", filter: 3500, wet: 0.35 }, t + i * 0.12));
      break;
  }
}

/** FLUDD: a hiss of water under pressure. */
export function spray(): void {
  playNoise({ dur: 0.12, gain: 0.035, highpass: 1800, lowpass: 7000 });
}

export function boing(pitch = 1): void {
  playNote({ freq: 220 * pitch, from: 520 * pitch, dur: 0.18, gain: 0.07, type: "triangle", release: 0.1 });
}
