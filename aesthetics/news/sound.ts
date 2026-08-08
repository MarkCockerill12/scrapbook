import { noiseLoop, tone } from "@/lib/audio";

/**
 * Channel 7 audio.
 *
 * Local news music of this period is a brass fanfare over a synth pad, arranged so
 * the last chord can be held under the anchor for as long as the director needs.
 * That hold is the reason it sounds the way it does, and it's why the sting here
 * ends on a sustained fifth rather than resolving.
 */

/** The open. Fanfare, then a held chord. */
export function sting(): void {
  const fan = [523.25, 659.25, 783.99, 1046.5];
  fan.forEach((f, i) => {
    tone({ freq: f, duration: 0.16, type: "square", gain: 0.06, delay: i * 0.09 });
    tone({ freq: f / 2, duration: 0.16, type: "triangle", gain: 0.05, delay: i * 0.09 });
  });
  [261.63, 392.0, 523.25].forEach((f) => {
    tone({ freq: f, duration: 1.9, type: "triangle", gain: 0.05, delay: 0.42 });
  });
}

/** A cut between sources. */
export function cut(): void {
  tone({ freq: 900, toFreq: 500, duration: 0.05, type: "square", gain: 0.05 });
}

/** BREAKING NEWS. Two urgent stabs and a rising tail. */
export function alarm(): void {
  for (let i = 0; i < 2; i++) {
    tone({ freq: 740, duration: 0.16, type: "sawtooth", gain: 0.08, delay: i * 0.22 });
    tone({ freq: 988, duration: 0.16, type: "sawtooth", gain: 0.06, delay: i * 0.22 });
  }
  tone({ freq: 300, toFreq: 900, duration: 0.5, type: "square", gain: 0.05, delay: 0.5 });
}

/**
 * The Emergency Alert System attention signal: 853Hz and 960Hz together, held.
 * Those two frequencies are the whole reason the sound is so recognisable — they
 * beat against each other at 107Hz and the result is physically unpleasant, by design.
 */
export function easTone(): void {
  tone({ freq: 853, duration: 2.6, type: "sine", gain: 0.1 });
  tone({ freq: 960, duration: 2.6, type: "sine", gain: 0.1 });
}

/** Ad music: a jaunty four-bar loop with no shame whatsoever. */
export function jingle(): void {
  const notes = [392, 392, 440, 494, 523, 494, 440, 392];
  notes.forEach((f, i) => {
    tone({ freq: f, duration: 0.18, type: "square", gain: 0.07, delay: i * 0.19 });
    tone({ freq: f / 2, duration: 0.18, type: "triangle", gain: 0.05, delay: i * 0.19 });
  });
}

/** Studio air: the room tone under everything until you cut to black. */
export function startAir(): () => void {
  return noiseLoop({ gain: 0.018, lowpass: 3400, highpass: 200, attack: 1.4 });
}
