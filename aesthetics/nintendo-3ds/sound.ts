import { tone } from "@/lib/audio";

/**
 * 3DS sound.
 *
 * The touchscreen is resistive, so its click is a physical plate flexing, not a
 * synthesised blip: very short, very low, with a tiny high tick on top. That
 * combination is the difference between "handheld" and "phone".
 */

/** The resistive panel bottoming out. */
export function touch(): void {
  tone({ freq: 300, toFreq: 140, duration: 0.028, type: "square", gain: 0.05 });
  tone({ freq: 2400, duration: 0.012, type: "square", gain: 0.02 });
}

/** A face button. Rubber dome over a membrane. */
export function button(): void {
  tone({ freq: 420, toFreq: 210, duration: 0.04, type: "triangle", gain: 0.06 });
}

/** Pencil on the drawing app: one tick per stroke segment, pitched by speed. */
export function scratch(speed: number): void {
  tone({
    freq: 900 + Math.min(1400, speed * 80),
    duration: 0.012,
    type: "square",
    gain: 0.014,
  });
}

/** A Mii arriving over StreetPass. Bright, major, over in half a second. */
export function greet(): void {
  [659.25, 830.61, 987.77].forEach((f, i) => {
    tone({ freq: f, duration: 0.16, type: "triangle", gain: 0.05, delay: i * 0.08 });
  });
}

/** The lid closing, then the machine going to sleep. */
export function lid(closing: boolean): void {
  tone({ freq: 180, toFreq: 90, duration: 0.12, type: "square", gain: 0.06 });
  if (closing) {
    tone({ freq: 880, toFreq: 440, duration: 0.5, type: "sine", gain: 0.05, delay: 0.16 });
  } else {
    tone({ freq: 440, toFreq: 880, duration: 0.4, type: "sine", gain: 0.05, delay: 0.14 });
  }
}

/** Playback of a flipnote. */
export function flip(): void {
  tone({ freq: 1046.5, duration: 0.07, type: "square", gain: 0.05 });
  tone({ freq: 1318.5, duration: 0.12, type: "square", gain: 0.045, delay: 0.06 });
}
