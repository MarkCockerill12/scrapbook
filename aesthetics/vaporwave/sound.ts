import { noiseLoop, tone } from "@/lib/audio";

/**
 * Vaporwave sound.
 *
 * The genre is one production trick — take something and slow it down until the
 * pitch sags and the attack smears. So the loop here is a major-seventh chord
 * progression played at a tempo that is genuinely too slow, with each note's attack
 * stretched out. Played at normal speed the same notes are lift music, which is of
 * course the joke.
 */

const CHORDS = [
  [130.81, 164.81, 196.0, 246.94], // Cmaj7
  [110.0, 138.59, 164.81, 207.65], // Amaj7-ish
  [116.54, 146.83, 174.61, 220.0], // Bbmaj7
  [98.0, 123.47, 146.83, 185.0], // Gmaj7
];

const BAR = 4.2;

/** The Win95 error ding, for closing a window. */
export function ding(): void {
  tone({ freq: 830, duration: 0.1, type: "sine", gain: 0.09 });
  tone({ freq: 622, duration: 0.34, type: "sine", gain: 0.08, delay: 0.09 });
}

/** A transport button. Mechanical, plastic, dead. */
export function clunk(): void {
  tone({ freq: 180, toFreq: 60, duration: 0.07, type: "square", gain: 0.07 });
}

/**
 * The tape. Returns a stop function.
 *
 * Hiss and the chords are separate so pressing pause leaves the hiss running — a
 * stopped tape that goes completely silent sounds like a bug, not like a pause.
 */
export function startTape(): () => void {
  const stopHiss = noiseLoop({ gain: 0.035, lowpass: 5200, highpass: 900, attack: 1.2 });

  let bar = 0;
  const play = () => {
    const chord = CHORDS[bar % CHORDS.length];
    bar += 1;
    chord.forEach((f, i) => {
      // Detuned a few cents flat: the pitch sag is the entire genre.
      tone({
        freq: f * 0.994,
        duration: BAR * 0.92,
        type: "sine",
        gain: 0.055 - i * 0.008,
        delay: i * 0.06,
      });
    });
    // A slow bass note under it, one octave down.
    tone({ freq: chord[0] * 0.497, duration: BAR * 0.9, type: "triangle", gain: 0.05 });
  };

  play();
  const id = window.setInterval(play, BAR * 1000);

  return () => {
    window.clearInterval(id);
    stopHiss();
  };
}
