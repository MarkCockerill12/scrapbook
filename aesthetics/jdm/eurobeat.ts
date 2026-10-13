import { audioBus } from "@/lib/audio";
import { playKick, playNote, playNoise, type Score } from "@/lib/music";

/**
 * Eurobeat, the Initial D kind: 155 BPM, four-on-the-floor, an octave-bouncing bass on
 * the off-beats, a stabbing supersaw riff and a lead that climbs. Generated — the
 * feeling, not any one song.
 */
const PROG = [
  { root: 45, chord: [69, 72, 76] }, // Am
  { root: 41, chord: [65, 69, 72] }, // F
  { root: 43, chord: [67, 71, 74] }, // G
  { root: 40, chord: [64, 68, 71] }, // E
];
const LEAD = [81, 81, 84, 81, 79, 76, 79, 81, 84, 86, 88, 86, 84, 81, 79, 76];

export const eurobeat: Score = (step, time, dur) => {
  const bar = Math.floor(step / 16) % PROG.length;
  const s = step % 16;
  const { root, chord } = PROG[bar];
  if (s % 4 === 0) playKick(time, 0.5);
  if (s % 4 === 2) {
    playNote({ freq: root, midi: true, dur: dur * 1.6, gain: 0.07, type: "sawtooth", filter: 700, release: 0.05 }, time);
    playNote({ freq: root + 12, midi: true, dur: dur * 1.6, gain: 0.05, type: "sawtooth", filter: 900, release: 0.05 }, time + dur);
  }
  if (s === 4 || s === 12) playNoise({ dur: 0.18, gain: 0.1, highpass: 1500, lowpass: 8000, wet: 0.2 }, time);
  if (s % 2 === 1) playNoise({ dur: 0.04, gain: 0.03, highpass: 7000 }, time);
  // the stab riff
  if ([0, 3, 6, 10, 12].includes(s)) chord.forEach((m) => playNote({ freq: m, midi: true, dur: dur * 0.9, gain: 0.02, type: "sawtooth", filter: 3500, detune: 25, wet: 0.2 }, time));
  // the lead, second half of the loop
  if (Math.floor(step / 64) % 2 === 1 && s % 2 === 0) {
    playNote({ freq: LEAD[(s / 2 + bar * 2) % LEAD.length], midi: true, dur: dur * 1.8, gain: 0.035, type: "square", filter: 4000, vibrato: 10, wet: 0.3 }, time);
  }
};

/** A 4-cylinder idle: low filtered noise pulsing at ~13Hz with a sub thump. */
export function rev(): void {
  const t = audioBus()?.ctx.currentTime;
  if (t === undefined) return;
  playNote({ freq: 90, from: 45, dur: 0.9, gain: 0.12, type: "sawtooth", filter: 600, filterTo: 1800, release: 0.6 }, t);
  playNote({ freq: 180, from: 90, dur: 0.9, gain: 0.05, type: "square", filter: 1200, release: 0.6 }, t);
  playNoise({ dur: 1.2, gain: 0.06, lowpass: 900, wet: 0.2 }, t);
}

export function shutter(): void {
  const t = audioBus()?.ctx.currentTime;
  if (t === undefined) return;
  playNoise({ dur: 0.05, gain: 0.12, highpass: 1200 }, t);
  playNote({ freq: 600, from: 1400, dur: 0.3, gain: 0.03, type: "sawtooth", filter: 2000 }, t + 0.1);
}

export function peel(): void {
  const t = audioBus()?.ctx.currentTime;
  if (t === undefined) return;
  playNoise({ dur: 0.25, gain: 0.06, highpass: 2500, lowpass: 9000 }, t);
}

export function squeak(): void {
  const t = audioBus()?.ctx.currentTime;
  if (t === undefined) return;
  playNote({ freq: 1800 + Math.random() * 800, dur: 0.03, gain: 0.015, type: "sine" }, t);
}
