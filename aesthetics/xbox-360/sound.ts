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
