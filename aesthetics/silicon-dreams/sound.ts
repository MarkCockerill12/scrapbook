import { noiseLoop, tone } from "@/lib/audio";
import { playNote, type Score } from "@/lib/music";

/**
 * Silicon Dreams sound.
 *
 * In the room it is the machine and nothing else: the Octane's fan (a broad, low
 * whoosh), the monitor degaussing when it wakes, a modem handshake while the chat client
 * connects. In the worlds: chat blips, teleports, clacking pool balls. The scores are in
 * music.ts; the Render Gallery's is here because it came first.
 */

export function startFan(): () => void {
  const whoosh = noiseLoop({ gain: 0.045, lowpass: 620, highpass: 60, attack: 2.5 });
  const air = noiseLoop({ gain: 0.01, lowpass: 3800, highpass: 1400, attack: 3 });
  return () => {
    whoosh();
    air();
  };
}

/** The CRT coming on: a thunk, the degauss coil's falling buzz, the tube warming. */
export function degauss(): void {
  tone({ freq: 62, toFreq: 38, duration: 0.22, type: "square", gain: 0.12 });
  for (let i = 0; i < 9; i++) {
    tone({ freq: 120, toFreq: 118, duration: 0.09, type: "sawtooth", gain: 0.07 * (1 - i / 9), delay: 0.05 + i * 0.075 });
  }
  tone({ freq: 4200, toFreq: 7800, duration: 1.4, type: "sine", gain: 0.006, delay: 0.3 });
}

/** The chat client's "someone said something" blip. */
export function ding(): void {
  tone({ freq: 1568, duration: 0.07, type: "square", gain: 0.025 });
  tone({ freq: 2093, duration: 0.09, type: "square", gain: 0.02, delay: 0.06 });
}

/** Teleport: a rising sweep and a landing chord. */
export function teleport(): void {
  tone({ freq: 180, toFreq: 1800, duration: 0.9, type: "sawtooth", gain: 0.03 });
  tone({ freq: 360, toFreq: 2400, duration: 0.9, type: "sine", gain: 0.04 });
  for (const [f, d] of [
    [523, 0.95],
    [659, 1.0],
    [784, 1.05],
  ])
    tone({ freq: f, duration: 0.6, type: "triangle", gain: 0.05, delay: d });
}

/** The modem: a few seconds of handshake while the client connects. */
export function modem(): void {
  tone({ freq: 2100, duration: 0.5, type: "sine", gain: 0.035, delay: 0.2 });
  tone({ freq: 1180, toFreq: 1650, duration: 0.6, type: "square", gain: 0.02, delay: 0.8 });
  for (let i = 0; i < 14; i++) {
    tone({ freq: 900 + Math.random() * 1800, duration: 0.09, type: "square", gain: 0.014, delay: 1.4 + i * 0.1 });
  }
}

/** Through the glass: band-limited air rising. */
export function dive(inward: boolean): void {
  const a = inward ? 220 : 1400;
  const b = inward ? 1400 : 220;
  tone({ freq: a, toFreq: b, duration: 1.3, type: "sawtooth", gain: 0.025 });
  tone({ freq: a * 1.5, toFreq: b * 1.5, duration: 1.3, type: "sine", gain: 0.03 });
  tone({ freq: inward ? 55 : 82, toFreq: inward ? 82 : 55, duration: 1.6, type: "sine", gain: 0.08 });
}

/** Phenolic on phenolic. */
export function clack(v: number): void {
  const g = Math.min(0.16, 0.03 + v * 0.04);
  tone({ freq: 2600, toFreq: 1900, duration: 0.025, type: "triangle", gain: g });
  tone({ freq: 5100, toFreq: 4000, duration: 0.012, type: "sine", gain: g * 0.5 });
}

export function thud(v: number): void {
  tone({ freq: 140, toFreq: 70, duration: 0.09, type: "sine", gain: Math.min(0.14, 0.03 + v * 0.04) });
}

export function swap(): void {
  tone({ freq: 880, toFreq: 1320, duration: 0.07, type: "triangle", gain: 0.05 });
  tone({ freq: 1760, duration: 0.5, type: "sine", gain: 0.03, delay: 0.06 });
}

// --- the score ----------------------------------------------------------------
// 4 bars of 16 steps at 66 bpm; one chord per bar.
const CHORDS = [
  { root: 38, pad: [62, 66, 69, 73, 76], arp: [74, 78, 81, 85, 88, 85, 81, 78] }, // Dmaj9
  { root: 35, pad: [59, 62, 66, 69, 73], arp: [71, 74, 78, 81, 85, 81, 78, 74] }, // Bm9
  { root: 43, pad: [62, 67, 71, 73, 78], arp: [79, 83, 85, 90, 86, 85, 83, 79] }, // Gmaj7#11
  { root: 45, pad: [61, 64, 66, 69, 76], arp: [73, 76, 78, 81, 85, 81, 78, 76] }, // A6/9
];

export const score: Score = (step, t, stepDur) => {
  const bar = Math.floor(step / 16) % CHORDS.length;
  const s = step % 16;
  const c = CHORDS[bar];
  if (s === 0) {
    for (const [i, m] of c.pad.entries()) {
      playNote({ freq: m, midi: true, dur: stepDur * 15, type: "sawtooth", detune: 14, gain: 0.018, attack: 1.4, release: 2.6, filter: 700, filterTo: 1600, wet: 0.8, pan: (i / (c.pad.length - 1)) * 1.2 - 0.6 }, t);
    }
    playNote({ freq: c.root, midi: true, dur: stepDur * 15, type: "sine", gain: 0.09, attack: 0.6, release: 1.2 }, t);
  }
  if (s % 2 === 0) {
    const m = c.arp[(s / 2) % c.arp.length];
    playNote({ freq: m, midi: true, dur: 0.05, type: "sine", gain: 0.05, attack: 0.003, release: 1.1, wet: 0.65, pan: s % 4 === 0 ? -0.35 : 0.35 }, t);
    // the bell's inharmonic partial
    playNote({ freq: m + 31, midi: true, dur: 0.02, type: "sine", gain: 0.008, attack: 0.002, release: 0.3, wet: 0.5 }, t);
  }
};
