import { noiseLoop, tone } from "@/lib/audio";

/**
 * Liminal sound.
 *
 * Almost all of it is one thing: a room that will not shut up. Fluorescent tubes
 * hum at twice the mains frequency (100Hz here) with a hiss on top, and HVAC is a
 * low filtered rumble. Both run continuously; the silence when you mute is itself
 * unsettling, which is the correct outcome.
 *
 * Footsteps are pitched slightly differently left and right, because two identical
 * footsteps in a row read as a loop rather than as walking.
 */

export function startRoomTone(): () => void {
  const stopHiss = noiseLoop({ gain: 0.022, lowpass: 6200, highpass: 2200, attack: 2 });
  const stopHvac = noiseLoop({ gain: 0.05, lowpass: 180, attack: 3 });

  // The tube hum. Re-struck on an interval because `tone` is a one-shot envelope,
  // and a continuously held oscillator would beat against the noise beds.
  const hum = () => {
    tone({ freq: 100, duration: 2.1, type: "sine", gain: 0.035 });
    tone({ freq: 200, duration: 2.1, type: "sine", gain: 0.014 });
  };
  hum();
  const id = window.setInterval(hum, 2000);

  return () => {
    window.clearInterval(id);
    stopHiss();
    stopHvac();
  };
}

/** A step on carpet: almost no attack, all body. */
export function step(right: boolean): void {
  tone({
    freq: right ? 84 : 78,
    toFreq: right ? 52 : 48,
    duration: 0.12,
    type: "sine",
    gain: 0.08,
  });
  tone({ freq: 1600, toFreq: 700, duration: 0.03, type: "triangle", gain: 0.012 });
}

/** Something heavy, a long way off, that you should not investigate. */
export function thump(): void {
  tone({ freq: 62, toFreq: 34, duration: 0.7, type: "sine", gain: 0.11 });
  tone({ freq: 130, toFreq: 70, duration: 0.35, type: "triangle", gain: 0.03 });
}

/** A tube striking, or failing to. */
export function strike(): void {
  tone({ freq: 2200, toFreq: 1400, duration: 0.04, type: "square", gain: 0.03 });
  tone({ freq: 120, duration: 0.3, type: "sawtooth", gain: 0.02, delay: 0.03 });
}

/** A door handle, unoiled. */
export function creak(): void {
  tone({ freq: 220, toFreq: 640, duration: 0.5, type: "sawtooth", gain: 0.035 });
  tone({ freq: 90, toFreq: 60, duration: 0.6, type: "sine", gain: 0.05, delay: 0.35 });
}
