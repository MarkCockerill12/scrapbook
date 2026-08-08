import { noiseLoop, tone } from "@/lib/audio";

/**
 * Aztec sound: a room made of stone, with something burning in it.
 *
 * The fire is filtered noise, not a loop of crackles — real fire is broadband hiss
 * with occasional pops, and the hiss is what makes a space feel hot. The drums are
 * struck on an interval rather than sequenced, so nothing ever quite lines up and
 * the room never settles into a rhythm you can predict.
 */

export function startFire(): () => void {
  const stopRoar = noiseLoop({ gain: 0.055, lowpass: 900, attack: 2 });
  const stopHiss = noiseLoop({ gain: 0.02, lowpass: 7000, highpass: 2400, attack: 2 });

  const pop = () => {
    tone({
      freq: 180 + Math.random() * 260,
      toFreq: 60,
      duration: 0.05,
      type: "triangle",
      gain: 0.03,
    });
  };
  const id = window.setInterval(() => Math.random() < 0.6 && pop(), 700);

  return () => {
    window.clearInterval(id);
    stopRoar();
    stopHiss();
  };
}

/** Deep drums, a long way inside the temple. */
export function startDrums(): () => void {
  let beat = 0;
  const hit = () => {
    const strong = beat % 4 === 0;
    tone({
      freq: strong ? 58 : 72,
      toFreq: strong ? 34 : 48,
      duration: strong ? 0.9 : 0.5,
      type: "sine",
      gain: strong ? 0.09 : 0.05,
    });
    beat += 1;
  };
  hit();
  const id = window.setInterval(hit, 1450);
  return () => window.clearInterval(id);
}

/** A glyph sinking into the stone. */
export function press(): void {
  tone({ freq: 140, toFreq: 74, duration: 0.24, type: "sawtooth", gain: 0.06 });
  tone({ freq: 900, toFreq: 300, duration: 0.09, type: "triangle", gain: 0.02 });
}

/** A correct glyph lighting. */
export function chime(step: number): void {
  const scale = [261.63, 311.13, 349.23, 415.3, 466.16];
  tone({ freq: scale[step % scale.length], duration: 0.7, type: "sine", gain: 0.07 });
  tone({ freq: scale[step % scale.length] * 2, duration: 0.5, type: "sine", gain: 0.03 });
}

/** The sequence broken. */
export function wrong(): void {
  tone({ freq: 96, toFreq: 44, duration: 0.8, type: "sawtooth", gain: 0.1 });
  tone({ freq: 101, toFreq: 47, duration: 0.8, type: "sawtooth", gain: 0.08 });
}

/** Stone on stone: the door. */
export function grind(): void {
  tone({ freq: 70, toFreq: 40, duration: 2.4, type: "sawtooth", gain: 0.07 });
  tone({ freq: 210, toFreq: 90, duration: 2.2, type: "square", gain: 0.02 });
}

/** A bell, very far away, that nobody rang. */
export function bell(): void {
  tone({ freq: 174.6, duration: 3.4, type: "sine", gain: 0.08 });
  tone({ freq: 261.6, duration: 3.0, type: "sine", gain: 0.04, delay: 0.02 });
  tone({ freq: 392.0, duration: 2.6, type: "sine", gain: 0.02, delay: 0.05 });
}
