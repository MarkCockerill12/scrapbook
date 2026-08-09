import { noiseLoop, tone } from "@/lib/audio";

/**
 * Zine sound: a desk, a marker and a photocopier.
 *
 * The copier is the set piece. A real one is three sounds in sequence, and the order
 * matters more than the timbre: the lamp carriage sweeps (a rising filtered whoosh),
 * the drum spins (steady low motor), then the paper is *slapped* out by rollers. Get
 * the order wrong and it reads as a printer.
 */

/** Sharpie on paper. Pitch rises with speed, because a marker squeaks when hurried. */
export function squeak(speed: number): void {
  tone({
    freq: 300 + Math.min(900, speed * 120),
    toFreq: 200 + Math.min(600, speed * 80),
    duration: 0.02,
    type: "sawtooth",
    gain: 0.016,
  });
}

/** A spray can: the ball rattles first, then the hiss. */
export function rattle(): void {
  for (let i = 0; i < 4; i++) {
    tone({
      freq: 1600 + Math.random() * 900,
      duration: 0.014,
      type: "square",
      gain: 0.03,
      delay: i * 0.055,
    });
  }
}

/** The hiss itself, while you hold the button. */
export function startSpray(): () => void {
  return noiseLoop({ gain: 0.05, lowpass: 9000, highpass: 3200, attack: 0.05 });
}

/** Pulling a staple out of folded paper. */
export function staplePull(): void {
  tone({ freq: 2400, toFreq: 1100, duration: 0.05, type: "square", gain: 0.05 });
  tone({ freq: 180, toFreq: 90, duration: 0.09, type: "triangle", gain: 0.04, delay: 0.03 });
}

/** Paper being peeled off other paper. */
export function peel(): void {
  tone({ freq: 900, toFreq: 380, duration: 0.11, type: "sawtooth", gain: 0.025 });
}

/**
 * One copy. Lamp sweep, drum, then the slap of the sheet landing in the tray.
 * Returns after arming its own timers; the caller doesn't need to sequence anything.
 */
export function copy(): void {
  // lamp carriage
  tone({ freq: 180, toFreq: 900, duration: 0.55, type: "sawtooth", gain: 0.03 });
  const stopDrum = noiseLoop({ gain: 0.045, lowpass: 420, attack: 0.08 });
  window.setTimeout(stopDrum, 900);
  // rollers, then the sheet
  window.setTimeout(() => {
    tone({ freq: 120, toFreq: 60, duration: 0.14, type: "square", gain: 0.05 });
    tone({ freq: 2600, toFreq: 800, duration: 0.07, type: "sawtooth", gain: 0.035, delay: 0.05 });
  }, 950);
}

/** The tenth generation. Something has gone wrong in the machine. */
export function jam(): void {
  tone({ freq: 90, toFreq: 40, duration: 1.6, type: "sawtooth", gain: 0.1 });
  tone({ freq: 94, toFreq: 43, duration: 1.6, type: "sawtooth", gain: 0.08 });
  tone({ freq: 1400, toFreq: 200, duration: 0.4, type: "square", gain: 0.03, delay: 0.2 });
}
