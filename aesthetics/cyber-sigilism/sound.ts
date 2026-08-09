import { tone } from "@/lib/audio";

/**
 * Silver-tech sound: three consoles' worth of plastic.
 *
 * The click wheel is the interesting one. Its tick is not a speaker sound at all —
 * it came out of a piezo buzzer sitting under the wheel, which is why it is so thin
 * and so dry. A rounded UI blip is instantly wrong.
 */

/** One notch of the click wheel. Piezo: thin, dry, no body. */
export function wheelTick(): void {
  tone({ freq: 3200, duration: 0.008, type: "square", gain: 0.045 });
}

/** Pressing the centre button. */
export function select(): void {
  tone({ freq: 1800, duration: 0.02, type: "square", gain: 0.05 });
  tone({ freq: 2600, duration: 0.02, type: "square", gain: 0.03, delay: 0.02 });
}

/** A clamshell phone opening or shutting. */
export function snap(open: boolean): void {
  tone({ freq: open ? 900 : 620, toFreq: open ? 300 : 180, duration: 0.06, type: "square", gain: 0.07 });
  tone({ freq: 140, toFreq: 70, duration: 0.09, type: "triangle", gain: 0.05, delay: 0.04 });
}

/** The handheld powering up: one chime, held, while the logo falls. */
export function boot(): void {
  tone({ freq: 523.25, duration: 0.1, type: "square", gain: 0.05, delay: 0.9 });
  tone({ freq: 1046.5, duration: 1.3, type: "square", gain: 0.06, delay: 1.02 });
  tone({ freq: 1568.0, duration: 1.1, type: "square", gain: 0.025, delay: 1.04 });
}

/** Dropping a dead device back in the drawer. */
export function clatter(): void {
  for (let i = 0; i < 3; i++) {
    tone({
      freq: 260 + Math.random() * 420,
      toFreq: 90,
      duration: 0.05,
      type: "triangle",
      gain: 0.045,
      delay: i * 0.045,
    });
  }
}

/** The sigils inking themselves on. */
export function ink(): void {
  tone({ freq: 240, toFreq: 2200, duration: 1.6, type: "sine", gain: 0.03 });
}

/** Every screen agreeing with every other screen. */
export function sync(): void {
  [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
    tone({ freq: f, duration: 1.4, type: "sine", gain: 0.055, delay: i * 0.11 });
  });
}
