import { noiseLoop, tone } from "@/lib/audio";

/**
 * Dead mall sound.
 *
 * The muzak is deliberately played through a hole: everything above ~1.4kHz is gone,
 * which is what a ceiling speaker forty metres away actually does to music. Removing
 * the top is far more convincing than adding reverb, and it costs one filter.
 */

/** Fluorescent hum, HVAC, and the size of the room. */
export function startAmbience(): () => void {
  const stopHvac = noiseLoop({ gain: 0.05, lowpass: 220, attack: 3 });
  const stopHiss = noiseLoop({ gain: 0.014, lowpass: 5200, highpass: 1800, attack: 3 });
  const hum = () => {
    tone({ freq: 100, duration: 2.2, type: "sine", gain: 0.03 });
    tone({ freq: 300, duration: 2.2, type: "sine", gain: 0.008 });
  };
  hum();
  const id = window.setInterval(hum, 2100);
  return () => {
    window.clearInterval(id);
    stopHvac();
    stopHiss();
  };
}

const MUZAK = [
  [523.25, 659.25, 784.0],
  [493.88, 587.33, 739.99],
  [440.0, 523.25, 659.25],
  [392.0, 493.88, 587.33],
];

/** Four bars of nothing in particular, on a loop, forever. */
export function startMuzak(): () => void {
  let bar = 0;
  const play = () => {
    const chord = MUZAK[bar % MUZAK.length];
    bar += 1;
    chord.forEach((f, i) => {
      tone({ freq: f, duration: 2.3, type: "sine", gain: 0.028 - i * 0.006, delay: i * 0.1 });
    });
    tone({ freq: chord[0] / 2, duration: 2.4, type: "triangle", gain: 0.022 });
  };
  play();
  const id = window.setInterval(play, 2600);
  return () => window.clearInterval(id);
}

/** A coin hitting water in a big empty room. */
export function splash(): void {
  tone({ freq: 1800, toFreq: 900, duration: 0.04, type: "sine", gain: 0.05 });
  tone({ freq: 520, toFreq: 180, duration: 0.16, type: "sine", gain: 0.05, delay: 0.02 });
  tone({ freq: 260, toFreq: 120, duration: 0.5, type: "sine", gain: 0.02, delay: 0.06 });
}

/** A tube striking, or trying to. */
export function strike(): void {
  tone({ freq: 2400, toFreq: 1500, duration: 0.03, type: "square", gain: 0.03 });
  tone({ freq: 118, duration: 0.28, type: "sawtooth", gain: 0.025, delay: 0.02 });
}

/** A steel roller shutter. */
export function shutter(): void {
  tone({ freq: 150, toFreq: 90, duration: 0.5, type: "square", gain: 0.04 });
  tone({ freq: 2200, toFreq: 1100, duration: 0.45, type: "sawtooth", gain: 0.012 });
}

/** Reading a unit off the board. */
export function tick(): void {
  tone({ freq: 700, duration: 0.03, type: "sine", gain: 0.04 });
}
