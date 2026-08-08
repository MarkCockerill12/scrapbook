import { tone } from "@/lib/audio";

/**
 * Arcade sound. Everything here is a square wave on purpose — this is a machine with
 * one PSG chip and no room for anything cleverer, and the moment a sine creeps in it
 * stops sounding like a cabinet.
 */

/** A coin falling through the mech and hitting the box. */
export function coin(): void {
  tone({ freq: 1050, duration: 0.05, type: "square", gain: 0.09 });
  tone({ freq: 1400, duration: 0.05, type: "square", gain: 0.08, delay: 0.05 });
  tone({ freq: 880, toFreq: 300, duration: 0.14, type: "square", gain: 0.06, delay: 0.11 });
}

/** A microswitch under a plastic button. */
export function clack(): void {
  tone({ freq: 220, toFreq: 90, duration: 0.035, type: "square", gain: 0.07 });
}

/** Moving the selection. */
export function move(): void {
  tone({ freq: 660, duration: 0.03, type: "square", gain: 0.06 });
}

/** Starting a game: the classic rising arpeggio. */
export function start(): void {
  [523, 659, 784, 1047, 1319].forEach((f, i) => {
    tone({ freq: f, duration: 0.09, type: "square", gain: 0.08, delay: i * 0.07 });
  });
}

/** Attract-mode bleep, played under the demo pages. */
export function bleep(step: number): void {
  const scale = [392, 440, 494, 523, 587, 659];
  tone({ freq: scale[step % scale.length], duration: 0.06, type: "square", gain: 0.04 });
}

/** Free play. Deliberately excessive. */
export function jackpot(): void {
  for (let i = 0; i < 12; i++) {
    tone({
      freq: 400 + i * 110,
      duration: 0.07,
      type: "square",
      gain: 0.07,
      delay: i * 0.06,
    });
  }
}

/** Registering initials. */
export function letterTick(): void {
  tone({ freq: 1200, duration: 0.025, type: "square", gain: 0.05 });
}
