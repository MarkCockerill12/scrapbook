import { tone } from "@/lib/audio";

/**
 * Wii Menu sound, synthesised.
 *
 * The menu's sound design is almost entirely two things: a very short, very high
 * tick under the pointer, and a warm two-note confirmation. Getting the tick short
 * enough is the whole job — anything past ~40ms stops reading as a click and starts
 * reading as a note, and the pointer sweeping a grid becomes unbearable.
 *
 * The loop is a plucked bossa figure in the spirit of the console's menu music
 * rather than a transcription of it: a walking bass with an off-beat marimba answer.
 */

/** Pointer crossing a tile. Deliberately tiny. */
export function pointerTick(): void {
  tone({ freq: 2100, toFreq: 1650, duration: 0.028, type: "sine", gain: 0.05 });
}

/** Selecting a channel. */
export function select(): void {
  tone({ freq: 880, duration: 0.1, type: "sine", gain: 0.12 });
  tone({ freq: 1320, duration: 0.2, type: "sine", gain: 0.1, delay: 0.06 });
}

/** Backing out of something. */
export function back(): void {
  tone({ freq: 700, toFreq: 420, duration: 0.14, type: "sine", gain: 0.1 });
}

/** The drive taking a disc: a motor spinning up, then the read. */
export function discWhir(): void {
  tone({ freq: 70, toFreq: 260, duration: 1.1, type: "sawtooth", gain: 0.05 });
  tone({ freq: 240, toFreq: 90, duration: 0.5, type: "triangle", gain: 0.04, delay: 0.9 });
  for (let i = 0; i < 4; i++) {
    tone({ freq: 1200, duration: 0.02, type: "square", gain: 0.03, delay: 1.2 + i * 0.13 });
  }
}

/** The console booting a disc. */
export function bootJingle(): void {
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
    tone({ freq: f, duration: 0.34, type: "sine", gain: 0.11, delay: i * 0.11 });
  });
}

const BASS = [98.0, 116.54, 130.81, 116.54, 98.0, 87.31, 98.0, 110.0];
const LEAD = [392.0, 466.16, 523.25, 587.33, 523.25, 466.16, 440.0, 392.0];
const BEAT = 0.34;

/**
 * Starts the menu loop. Returns a stop function.
 *
 * One bar is scheduled ahead of time through the shared `tone` helper (which honours
 * the global mute), and an interval re-arms it. Scheduling per bar rather than per
 * note keeps the timer count at one regardless of how long the page is open.
 */
export function startLoop(): () => void {
  const bar = () => {
    for (let i = 0; i < 8; i++) {
      const at = i * BEAT;
      tone({ freq: BASS[i], duration: 0.3, type: "triangle", gain: 0.07, delay: at });
      if (i % 2 === 1) {
        tone({
          freq: LEAD[i],
          duration: 0.22,
          type: "sine",
          gain: 0.045,
          delay: at + BEAT * 0.5,
        });
      }
    }
  };
  bar();
  const id = window.setInterval(bar, BEAT * 8 * 1000);
  return () => window.clearInterval(id);
}
