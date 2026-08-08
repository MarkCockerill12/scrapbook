import { noiseLoop, tone } from "@/lib/audio";

/**
 * Cottagecore sound.
 *
 * Birdsong is the hard one. A bird is a very fast frequency sweep, not a note — a
 * blackbird's phrase is three or four glides of 40–80ms each, with gaps. Play them
 * as steady pitches and you get a synthesiser; sweep them and you get a garden.
 */

/** Wind through grass. Filtered noise, wide and slow. */
export function startWind(strength: () => number): () => void {
  const stop = noiseLoop({ gain: 0.05, lowpass: 700, attack: 3 });
  // Gusts: a soft swell every few seconds, scaled by the wind slider.
  const id = window.setInterval(() => {
    const s = strength();
    if (s < 0.1) return;
    tone({ freq: 90, toFreq: 220, duration: 2.4, type: "sine", gain: 0.02 * s });
  }, 4200);
  return () => {
    window.clearInterval(id);
    stop();
  };
}

/** A phrase of birdsong, somewhere out there. */
export function bird(): void {
  const base = 1800 + Math.random() * 1400;
  const notes = 3 + Math.floor(Math.random() * 3);
  let t = 0;
  for (let i = 0; i < notes; i++) {
    const up = Math.random() > 0.4;
    tone({
      freq: up ? base : base * 1.5,
      toFreq: up ? base * 1.6 : base * 0.8,
      duration: 0.05 + Math.random() * 0.05,
      type: "sine",
      gain: 0.045,
      delay: t,
    });
    t += 0.09 + Math.random() * 0.12;
  }
}

/** The kettle, distantly, in another room. */
export function kettle(): void {
  tone({ freq: 2100, toFreq: 2400, duration: 2.4, type: "sine", gain: 0.03 });
  tone({ freq: 3150, duration: 2.2, type: "sine", gain: 0.012, delay: 0.1 });
}

/** Picking a flower. */
export function snip(): void {
  tone({ freq: 1400, toFreq: 900, duration: 0.04, type: "triangle", gain: 0.05 });
}

/** A cat, when you click it. */
export function purr(): () => void {
  return noiseLoop({ gain: 0.05, lowpass: 150, attack: 0.4 });
}

/** The church bell, on the hour, whether anyone is listening or not. */
export function bell(): void {
  tone({ freq: 220, duration: 4.2, type: "sine", gain: 0.06 });
  tone({ freq: 329.6, duration: 3.6, type: "sine", gain: 0.025, delay: 0.03 });
  tone({ freq: 440, duration: 3.0, type: "sine", gain: 0.014, delay: 0.06 });
}

/** Rain on glass. */
export function startRain(): () => void {
  const stopHiss = noiseLoop({ gain: 0.06, lowpass: 4200, highpass: 700, attack: 2.4 });
  const id = window.setInterval(() => {
    tone({
      freq: 900 + Math.random() * 900,
      duration: 0.014,
      type: "sine",
      gain: 0.02,
    });
  }, 140);
  return () => {
    window.clearInterval(id);
    stopHiss();
  };
}
