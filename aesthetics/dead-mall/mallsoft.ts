import { audioBus } from "@/lib/audio";
import { playNote, playNoise, type Score } from "@/lib/music";

/**
 * Mallsoft, the sad kind.
 *
 * A slow minor progression on a worn electric piano, heard through a ceiling speaker
 * forty metres away (everything above ~1.1kHz gone), on a tape that no longer holds
 * its pitch, in the reverb of an empty building. The melody keeps starting a phrase
 * and not finishing it. Long gaps are part of the tune: most bars, nothing leads.
 *
 * In 1989 mode the filter opens, the reverb dries and a hi-hat turns up — the same
 * song in the same place when it was full, which is the saddest version of all.
 */

const CHORDS = [
  { bass: 38, notes: [57, 60, 64, 65] }, // Dm9
  { bass: 34, notes: [58, 62, 65, 69] }, // Bbmaj7
  { bass: 31, notes: [58, 62, 65, 69] }, // Gm9
  { bass: 33, notes: [57, 61, 64, 67] }, // A7 — and it never resolves
];
/** Phrases that give up. -1 is a rest. */
const PHRASES = [
  [74, -1, 72, -1, 69, -1, -1, -1],
  [77, -1, 76, 74, -1, -1, -1, -1],
  [-1, -1, -1, -1, -1, -1, -1, -1],
  [69, -1, -1, 72, -1, 70, -1, -1],
  [-1, -1, -1, -1, -1, -1, -1, -1],
  [76, -1, 74, -1, -1, -1, -1, -1],
];

export function mallsoft(memory: () => boolean): Score {
  return (step, time, dur) => {
    const mem = memory();
    const cut = mem ? 5200 : 1100;
    const wet = mem ? 0.25 : 1;
    const bar = Math.floor(step / 16);
    const s = step % 16;
    const c = CHORDS[bar % CHORDS.length];
    // tape wow: the whole machine drifts a few cents, slowly, then catches itself
    const wow = Math.sin(step / 37) * 14 + (bar % 7 === 5 ? -22 : 0);
    const bend = 2 ** (wow / 1200);

    if (s === 0) {
      // rolled, not struck: each note a little late, like tired hands
      c.notes.forEach((m, i) =>
        playNote({ freq: 440 * 2 ** ((m - 69) / 12) * bend, dur: dur * 13, gain: 0.034, type: "triangle", filter: cut, attack: 0.05, release: 2.6, wet, detune: 9, pan: (i - 1.5) * 0.3 }, time + i * 0.09),
      );
      playNote({ freq: 440 * 2 ** ((c.bass - 69) / 12) * bend, dur: dur * 12, gain: 0.085, type: "sine", filter: 420, attack: 0.08, release: 1.6, wet: wet * 0.4 }, time);
    }
    const phrase = PHRASES[bar % PHRASES.length];
    const l = s % 2 === 0 ? phrase[s / 2] : -1;
    if (l > 0) {
      playNote({ freq: 440 * 2 ** ((l - 69) / 12) * bend, dur: dur * 5, gain: 0.04, type: "sine", filter: Math.min(cut, 1800), attack: 0.09, release: 2.4, vibrato: 10, wet }, time);
    }
    if (mem && s % 4 === 2) playNoise({ dur: 0.05, gain: 0.012, highpass: 6000 }, time);
  };
}

/** The PA chime: ding-dong, the attention-shoppers two-tone. */
export function paChime(): void {
  const t = audioBus()?.ctx.currentTime;
  if (t === undefined) return;
  playNote({ freq: 76, midi: true, dur: 0.5, gain: 0.08, type: "sine", release: 1.4, wet: 0.8 }, t);
  playNote({ freq: 72, midi: true, dur: 0.8, gain: 0.08, type: "sine", release: 1.8, wet: 0.8 }, t + 0.55);
}

/** Two footsteps on terrazzo, with the room answering. */
export function footsteps(): void {
  const t = audioBus()?.ctx.currentTime;
  if (t === undefined) return;
  [0].forEach((d) => {
    playNoise({ dur: 0.05, gain: 0.05, highpass: 300, lowpass: 2500, wet: 0.9 }, t + d);
    playNote({ freq: 90, from: 160, dur: 0.03, gain: 0.08, type: "sine", release: 0.08 }, t + d);
  });
}

/** Picking something up. */
export function pickup(): void {
  const t = audioBus()?.ctx.currentTime;
  if (t === undefined) return;
  [79, 84].forEach((m, i) => playNote({ freq: m, midi: true, dur: 0.1, gain: 0.05, type: "sine", release: 0.6, wet: 0.7 }, t + i * 0.09));
}
