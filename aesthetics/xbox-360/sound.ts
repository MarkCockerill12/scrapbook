import { audioBus } from "@/lib/audio";
import { playNote, playNoise } from "@/lib/music";
import { tone } from "@/lib/audio";

/**
 * Xbox 360 sound, synthesised.
 *
 * Two of these carry the page. The hitmarker has to be *very* short and *very*
 * bright — it fires on every single click, so anything with body becomes torture
 * within ten seconds. The achievement chime is the opposite: it needs to bloom, and
 * the 360's is a rising figure with the last note held.
 */

/** Moving between blades. */
export function bladeSwoosh(): void {
  tone({ freq: 260, toFreq: 900, duration: 0.16, type: "triangle", gain: 0.05 });
  tone({ freq: 1800, toFreq: 600, duration: 0.1, type: "sine", gain: 0.03, delay: 0.03 });
}

/** Selecting a row. */
export function blip(): void {
  tone({ freq: 1180, duration: 0.05, type: "sine", gain: 0.07 });
}

/** The hitmarker. Short, bright, dry. */
export function hitmarker(): void {
  tone({ freq: 2600, toFreq: 2000, duration: 0.035, type: "sine", gain: 0.09 });
}

/**
 * The body under a hit. Deliberately WITHOUT the hitmarker on top: every click on
 * the page already fires one from the global layer, and stacking two makes a target
 * hit sound like a mistake.
 */
export function killThud(): void {
  tone({ freq: 320, toFreq: 120, duration: 0.12, type: "triangle", gain: 0.07 });
  tone({ freq: 90, toFreq: 50, duration: 0.2, type: "sine", gain: 0.06 });
}

/** Achievement unlocked. Rising, with the last note held. */
export function achievementChime(): void {
  tone({ freq: 783.99, duration: 0.12, type: "sine", gain: 0.09 });
  tone({ freq: 1046.5, duration: 0.12, type: "sine", gain: 0.09, delay: 0.1 });
  tone({ freq: 1318.51, duration: 0.5, type: "sine", gain: 0.1, delay: 0.2 });
  tone({ freq: 1567.98, duration: 0.5, type: "sine", gain: 0.05, delay: 0.22 });
}

/** Montage mode engaging. A wobble, because of course it is. */
export function drop(): void {
  for (let i = 0; i < 8; i++) {
    tone({
      freq: i % 2 ? 58 : 92,
      toFreq: i % 2 ? 92 : 58,
      duration: 0.13,
      type: "square",
      gain: 0.09,
      delay: i * 0.13,
    });
  }
  tone({ freq: 1400, toFreq: 180, duration: 0.5, type: "sawtooth", gain: 0.05 });
}

/** Three red lights. */
export function redRing(): void {
  tone({ freq: 140, toFreq: 60, duration: 1.6, type: "sawtooth", gain: 0.12 });
  tone({ freq: 210, duration: 1.6, type: "square", gain: 0.04 });
}

/**
 * Power-on: an airy rising whoosh, then a bright bell chord that blooms and hangs —
 * the shape of the real start-up, built from oscillators and the shared reverb.
 */
export function bootSound(): void {
  const t = audioBus()?.ctx.currentTime;
  if (t === undefined) return;
  playNoise({ dur: 0.9, gain: 0.04, highpass: 1800, lowpass: 9000, wet: 0.6 }, t);
  playNote({ freq: 200, from: 90, dur: 0.8, gain: 0.05, type: "sine", wet: 0.5 }, t);
  [76, 83, 88, 91, 95].forEach((m, i) =>
    playNote({ freq: m, midi: true, dur: 0.3, gain: 0.045, attack: 0.01, release: 2.4, type: "sine", wet: 0.8, pan: (i - 2) * 0.3 }, t + 0.95 + i * 0.07),
  );
  playNote({ freq: 52, midi: true, dur: 1.2, gain: 0.08, attack: 0.05, release: 1.5, type: "sine", wet: 0.4 }, t + 0.95);
}

/** The Guide blade sliding in. */
export function guideOpen(): void {
  tone({ freq: 500, toFreq: 1400, duration: 0.12, type: "sine", gain: 0.06 });
  tone({ freq: 1600, duration: 0.18, type: "sine", gain: 0.04, delay: 0.08 });
}

/** A party member talking — a squeaky formant blip, pitched per person. */
export function partyBlip(pitch: number): void {
  for (let i = 0; i < 3; i++) {
    tone({ freq: pitch * (1 + Math.random() * 0.3), toFreq: pitch * 0.8, duration: 0.05, type: "sawtooth", gain: 0.02, delay: i * 0.07 });
  }
}

/** Disc spin-up: the famous jet engine. */
export function discSpin(): void {
  tone({ freq: 80, toFreq: 900, duration: 1.4, type: "sawtooth", gain: 0.02 });
  tone({ freq: 3000, toFreq: 6000, duration: 1.4, type: "sine", gain: 0.012 });
}
