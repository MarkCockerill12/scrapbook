import { audioBus } from "@/lib/audio";
import { playKick, playNote, playNoise, type Score } from "@/lib/music";

/**
 * Skate-video pop-punk, 2001: downstroked power chords (two detuned saws a fifth apart
 * through a lowpass — the distortion is faked by the detune), eighth-note bass, and a
 * fast four-on-the-snare drum part. Energy is reported so the HUD can bounce.
 */
const RIFF = [40, 40, 45, 43, 40, 40, 47, 45];

export const punk: Score = (step, time, dur) => {
  const s = step % 16;
  const bar = Math.floor(step / 16) % RIFF.length;
  const root = RIFF[bar];
  if (s % 2 === 0) {
    const mute = s % 4 === 2;
    [0, 7, 12].forEach((i) =>
      playNote({ freq: root + 12 + i, midi: true, dur: mute ? dur * 0.6 : dur * 1.8, gain: mute ? 0.02 : 0.03, type: "sawtooth", filter: mute ? 900 : 2200, detune: 18, release: 0.05 }, time),
    );
    playNote({ freq: root, midi: true, dur: dur * 1.6, gain: 0.08, type: "square", filter: 500, release: 0.05 }, time);
  }
  if (s % 4 === 0) playKick(time, 0.5);
  if (s % 8 === 4) playNoise({ dur: 0.16, gain: 0.12, highpass: 1400, lowpass: 8000, wet: 0.15 }, time);
  if (s % 2 === 1) playNoise({ dur: 0.03, gain: 0.03, highpass: 7000 }, time);
  if (s === 0 && bar % 4 === 0) playNoise({ dur: 0.9, gain: 0.05, highpass: 5000, wet: 0.3 }, time);
};

const at = () => audioBus()?.ctx.currentTime;

/** Wheels on concrete, a pop and a clack. */
export function ollie(): void {
  const t = at();
  if (t === undefined) return;
  playNoise({ dur: 0.05, gain: 0.12, highpass: 400, lowpass: 3000 }, t);
  playNote({ freq: 180, from: 400, dur: 0.04, gain: 0.08, type: "triangle" }, t);
  playNoise({ dur: 0.04, gain: 0.1, highpass: 600, lowpass: 4000 }, t + 0.42);
}

/** Metal grind: a band of filtered noise with a scrape. */
export function grind(): void {
  const t = at();
  if (t === undefined) return;
  playNoise({ dur: 0.9, gain: 0.06, highpass: 2500, lowpass: 7000 }, t);
  playNote({ freq: 1900, dur: 0.8, gain: 0.015, type: "sawtooth", filter: 4000, vibrato: 40 }, t);
}

export function bail(): void {
  const t = at();
  if (t === undefined) return;
  playNoise({ dur: 0.3, gain: 0.14, lowpass: 900 }, t);
  playNote({ freq: 120, from: 300, dur: 0.3, gain: 0.1, type: "sawtooth", filter: 800 }, t);
}

export function ding(): void {
  const t = at();
  if (t === undefined) return;
  [88, 95].forEach((m, i) => playNote({ freq: m, midi: true, dur: 0.1, gain: 0.06, type: "square", filter: 5000 }, t + i * 0.08));
}

export function landed(big: boolean): void {
  const t = at();
  if (t === undefined) return;
  (big ? [72, 76, 79, 84] : [76, 79]).forEach((m, i) => playNote({ freq: m, midi: true, dur: 0.12, gain: 0.06, type: "square", filter: 4000, wet: 0.2 }, t + i * 0.07));
}
