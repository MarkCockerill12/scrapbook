import { noiseLoop, tone } from "@/lib/audio";

/**
 * PS1 sound.
 *
 * The console's own noise is half the memory: a drive that audibly spins up, seeks,
 * and clicks. The BIOS menu itself was almost silent, which makes the drive the
 * loudest thing in the room — so it gets the most attention here.
 */

/** Moving the cursor. Dry, tiny, slightly harsh. */
export function blip(): void {
  tone({ freq: 1500, duration: 0.03, type: "square", gain: 0.05 });
}

/** Confirming. */
export function confirm(): void {
  tone({ freq: 660, duration: 0.06, type: "square", gain: 0.06 });
  tone({ freq: 990, duration: 0.1, type: "square", gain: 0.05, delay: 0.05 });
}

/** Cancelling, or being refused. */
export function deny(): void {
  tone({ freq: 240, toFreq: 150, duration: 0.18, type: "square", gain: 0.07 });
}

/**
 * The drive. Returns a stop function; caller stops it when the read finishes.
 *
 * Spin-up glide, then a bed of motor rumble with seek clicks scattered over it.
 */
export function startRead(): () => void {
  tone({ freq: 40, toFreq: 220, duration: 1.4, type: "sawtooth", gain: 0.045 });
  const stopMotor = noiseLoop({ gain: 0.05, lowpass: 300, attack: 0.5 });

  const seek = () => {
    tone({ freq: 900 + Math.random() * 700, duration: 0.016, type: "square", gain: 0.035 });
  };
  const id = window.setInterval(seek, 130);

  return () => {
    window.clearInterval(id);
    stopMotor();
    tone({ freq: 200, toFreq: 60, duration: 0.6, type: "sawtooth", gain: 0.03 });
  };
}

/** Something has gone wrong with the card. */
export function corruptBuzz(): void {
  tone({ freq: 120, duration: 1.4, type: "sawtooth", gain: 0.1 });
  tone({ freq: 127, duration: 1.4, type: "sawtooth", gain: 0.09 });
  tone({ freq: 61, duration: 1.6, type: "square", gain: 0.06 });
}

/** Formatting finished. A clean, complete, slightly smug little cadence. */
export function formatted(): void {
  [392, 523.25, 659.25, 783.99].forEach((f, i) => {
    tone({ freq: f, duration: 0.28, type: "triangle", gain: 0.08, delay: i * 0.09 });
  });
}
