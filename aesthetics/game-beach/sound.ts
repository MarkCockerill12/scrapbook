import { noiseLoop, tone } from "@/lib/audio";

/**
 * Game Beach audio.
 *
 * Steel drums are the giveaway and they are not a waveform — a pan is a struck metal
 * plate, so the note is a fast attack with **inharmonic** partials above it. Stacking
 * a fundamental with a 2.76x and a 5.4x partial (neither a whole multiple) gets most
 * of the way there; use octaves instead and you get a marimba.
 */

function pan(freq: number, delay = 0, gain = 0.06): void {
  tone({ freq, duration: 0.9, type: "sine", gain, delay });
  tone({ freq: freq * 2.76, duration: 0.55, type: "sine", gain: gain * 0.45, delay });
  tone({ freq: freq * 5.4, duration: 0.3, type: "sine", gain: gain * 0.2, delay });
}

/** A coin. Two notes, up, and short. */
export function coinGet(): void {
  tone({ freq: 987.77, duration: 0.06, type: "square", gain: 0.07 });
  tone({ freq: 1318.51, duration: 0.34, type: "square", gain: 0.06, delay: 0.055 });
}

/** Text-box beep, one per couple of characters. */
export function blip(): void {
  tone({ freq: 1300, duration: 0.02, type: "square", gain: 0.035 });
}

/** Water. */
export function splash(): void {
  tone({ freq: 1400, toFreq: 500, duration: 0.09, type: "sine", gain: 0.05 });
  tone({ freq: 320, toFreq: 120, duration: 0.22, type: "sine", gain: 0.04, delay: 0.03 });
}

/** 1-UP. */
export function jingle(): void {
  [659.25, 783.99, 1046.5, 1318.5, 1046.5, 1318.5, 1567.98].forEach((f, i) => {
    tone({ freq: f, duration: 0.16, type: "square", gain: 0.07, delay: i * 0.11 });
  });
}

/** Steel-drum loop plus surf. Returns a stop function. */
export function startSteel(): () => void {
  const stopSurf = noiseLoop({ gain: 0.035, lowpass: 1400, attack: 3 });
  const melody = [523.25, 587.33, 659.25, 783.99, 659.25, 587.33, 523.25, 440.0];
  let step = 0;
  const play = () => {
    pan(melody[step % melody.length]);
    if (step % 4 === 0) pan(melody[step % melody.length] / 2, 0.06, 0.035);
    step += 1;
  };
  play();
  const id = window.setInterval(play, 620);
  return () => {
    window.clearInterval(id);
    stopSurf();
  };
}
