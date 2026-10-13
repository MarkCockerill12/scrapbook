import { audioBus } from "@/lib/audio";
import { playNote, playNoise, type Score } from "@/lib/music";

/**
 * PLAZA 95 — the studio's sound engine.
 *
 * A Juno-60 voice (detuned sawtooth through a lowpass, the chorus faked with a second
 * detuned voice and stereo spread) and an 808 kit synthesised the way the 808 itself
 * did it: bridged-T sine drops for the drums, filtered noise for the cymbals, two
 * square waves for the cowbell.
 *
 * `slow` is the vaporwave control: 1 = as played, 0.72 = slowed + reverb. It scales
 * every pitch AND the tempo, and pushes the reverb send up — which is exactly the
 * genre's production trick, done live.
 */

export const INSTRUMENTS = ["BD", "SD", "LT", "HT", "RS", "CP", "CB", "CY", "OH", "CH"] as const;
export type Inst = (typeof INSTRUMENTS)[number];

export interface JunoPatch {
  name: string;
  wave: OscillatorType;
  cutoff: number;
  attack: number;
  release: number;
  chorus: number;
  sub: boolean;
}

export const PATCHES: JunoPatch[] = [
  { name: "11 BRASS", wave: "sawtooth", cutoff: 2600, attack: 0.02, release: 0.4, chorus: 14, sub: false },
  { name: "12 STRINGS", wave: "sawtooth", cutoff: 1800, attack: 0.35, release: 1.2, chorus: 22, sub: false },
  { name: "13 E.PIANO", wave: "triangle", cutoff: 4000, attack: 0.005, release: 0.9, chorus: 10, sub: false },
  { name: "14 SYNC LEAD", wave: "square", cutoff: 3200, attack: 0.01, release: 0.25, chorus: 6, sub: false },
  { name: "15 BASS", wave: "sawtooth", cutoff: 900, attack: 0.005, release: 0.2, chorus: 0, sub: true },
  { name: "16 GLASS PAD", wave: "sine", cutoff: 6000, attack: 0.5, release: 2.2, chorus: 18, sub: false },
  { name: "17 HOOVER", wave: "sawtooth", cutoff: 5000, attack: 0.05, release: 0.6, chorus: 40, sub: true },
  { name: "18 BELLS", wave: "triangle", cutoff: 8000, attack: 0.002, release: 1.8, chorus: 12, sub: false },
];

const now = () => audioBus()?.ctx.currentTime;

export function junoNote(midi: number, patch: JunoPatch, chorusMode: number, slow: number, dur = 0.35, t?: number): void {
  const at = t ?? now();
  if (at === undefined) return;
  const f = 440 * 2 ** ((midi - 69) / 12) * slow;
  const wet = 0.25 + (1 - slow) * 1.6;
  const chorus = patch.chorus + chorusMode * 10;
  playNote({ freq: f, dur, gain: 0.05, type: patch.wave, filter: patch.cutoff, filterTo: patch.cutoff * 0.5, attack: patch.attack, release: patch.release, detune: chorus, pan: -0.35, wet }, at);
  if (chorusMode > 0) playNote({ freq: f, dur, gain: 0.035, type: patch.wave, filter: patch.cutoff, attack: patch.attack, release: patch.release, detune: chorus * 1.6, pan: 0.35, wet }, at);
  if (patch.sub) playNote({ freq: f / 2, dur, gain: 0.05, type: "square", filter: 500, attack: patch.attack, release: patch.release * 0.6 }, at);
}

export function drum(inst: Inst, t: number, slow: number, accent = 1): void {
  const s = slow;
  const wet = (1 - slow) * 1.2;
  switch (inst) {
    case "BD":
      playNote({ freq: 48 * s, from: 130 * s, dur: 0.05, gain: 0.55 * accent, type: "sine", release: 0.55, wet: wet * 0.3 }, t);
      break;
    case "SD":
      playNote({ freq: 185 * s, from: 240 * s, dur: 0.03, gain: 0.14 * accent, type: "triangle", release: 0.12 }, t);
      playNoise({ dur: 0.2 / s, gain: 0.13 * accent, highpass: 1500, lowpass: 9000, wet: 0.2 + wet }, t);
      break;
    case "LT":
      playNote({ freq: 90 * s, from: 140 * s, dur: 0.05, gain: 0.3, type: "sine", release: 0.35, wet }, t);
      break;
    case "HT":
      playNote({ freq: 170 * s, from: 250 * s, dur: 0.05, gain: 0.25, type: "sine", release: 0.25, wet }, t);
      break;
    case "RS":
      playNote({ freq: 1700 * s, dur: 0.01, gain: 0.12, type: "square", filter: 3000, release: 0.03 }, t);
      break;
    case "CP":
      [0, 0.011, 0.022].forEach((d) => playNoise({ dur: 0.02, gain: 0.12, highpass: 900, lowpass: 3000 }, t + d));
      playNoise({ dur: 0.25 / s, gain: 0.1, highpass: 900, lowpass: 2500, wet: 0.3 + wet }, t + 0.03);
      break;
    case "CB":
      playNote({ freq: 540 * s, dur: 0.05, gain: 0.06, type: "square", filter: 2500, release: 0.25 }, t);
      playNote({ freq: 800 * s, dur: 0.05, gain: 0.05, type: "square", filter: 2500, release: 0.25 }, t);
      break;
    case "CY":
      playNoise({ dur: 1.2 / s, gain: 0.06, highpass: 5000, wet: 0.3 + wet }, t);
      break;
    case "OH":
      playNoise({ dur: 0.35 / s, gain: 0.07, highpass: 7000 }, t);
      break;
    case "CH":
      playNoise({ dur: 0.045, gain: 0.07 * accent, highpass: 8000 }, t);
      break;
  }
}

export type Pattern = Record<Inst, boolean[]>;

const row = (steps: number[]) => Array.from({ length: 16 }, (_, i) => steps.includes(i));

/** A default groove, so START makes something good immediately. */
export const DEFAULT_PATTERN: Pattern = {
  BD: row([0, 6, 8, 11]),
  SD: row([4, 12]),
  LT: row([]),
  HT: row([]),
  RS: row([]),
  CP: row([12]),
  CB: row([]),
  CY: row([0]),
  OH: row([2, 10]),
  CH: row([0, 1, 4, 5, 6, 8, 9, 12, 13, 14]),
};

/** Chords the arpeggiator walks when nothing is held — vaporwave maj7s. */
const PAD = [
  [60, 64, 67, 71],
  [57, 60, 64, 67],
  [65, 69, 72, 76],
  [62, 65, 69, 72],
];

export function makeScore(opts: {
  pattern: () => Pattern;
  playing: () => boolean;
  arp: () => boolean;
  held: () => number[];
  patch: () => JunoPatch;
  chorus: () => number;
  slow: () => number;
  onStep: (step: number, kick: boolean) => void;
}): Score {
  return (step, time, dur) => {
    const s = step % 16;
    const slow = opts.slow();
    let kick = false;
    if (opts.playing()) {
      const p = opts.pattern();
      for (const inst of INSTRUMENTS) {
        if (p[inst][s]) {
          drum(inst, time, slow, s % 4 === 0 ? 1.15 : 1);
          if (inst === "BD") kick = true;
        }
      }
      // pad under the beat when the arp is off and nothing's held
      if (s === 0 && !opts.arp() && opts.held().length === 0) {
        const chord = PAD[Math.floor(step / 16) % PAD.length];
        chord.forEach((m) => junoNote(m - 12, PATCHES[1], opts.chorus(), slow, dur * 15, time));
      }
    }
    if (opts.arp()) {
      const held = opts.held().length ? [...opts.held()].sort((a, b) => a - b) : PAD[Math.floor(step / 16) % PAD.length];
      const seq = [...held, ...held.map((m) => m + 12)];
      junoNote(seq[step % seq.length], opts.patch(), opts.chorus(), slow, dur * 0.9, time);
    }
    opts.onStep(s, kick);
  };
}
