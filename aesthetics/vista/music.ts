import { audioBus } from "@/lib/audio";
import { playNote, playNoise, type Score } from "@/lib/music";
import type { TrackId } from "./data";

/**
 * The Media Player's four tracks — generated, never sampled.
 *
 * The 2004–2010 "product demo" sound: major-seventh chords on an electric piano,
 * a glassy bell arpeggio on top, a round sine bass and almost no drums. Everything
 * is soaked in reverb because the aesthetic is made of water.
 */

interface Track {
  bpm: number;
  /** One chord per bar, MIDI notes. */
  chords: number[][];
  bass: number[];
  /** Arpeggio pattern over the chord tones, per 8th note; -1 is a rest. */
  arp: number[];
  bell: OscillatorType;
  hats: boolean;
}

const TRACKS: Record<TrackId, Track> = {
  aqua: {
    bpm: 84,
    chords: [
      [65, 69, 72, 76], // Fmaj7
      [64, 67, 71, 74], // Em7
      [62, 65, 69, 72], // Dm7
      [60, 64, 67, 71, 74], // Cmaj9
    ],
    bass: [41, 40, 38, 36],
    arp: [0, 2, 3, 4, 3, 2, 1, -1],
    bell: "sine",
    hats: false,
  },
  sky: {
    bpm: 102,
    chords: [
      [60, 64, 67, 71],
      [57, 60, 64, 67],
      [65, 69, 72, 76],
      [67, 71, 74, 76],
    ],
    bass: [36, 33, 41, 43],
    arp: [0, 1, 2, 3, 2, 1, 3, 2],
    bell: "triangle",
    hats: true,
  },
  leaf: {
    bpm: 70,
    chords: [
      [61, 65, 68, 72], // Dbmaj7
      [63, 66, 70, 73], // Ebm7
      [58, 61, 65, 68], // Bbm7
      [66, 70, 73, 77], // Gbmaj7
    ],
    bass: [37, 39, 34, 42],
    arp: [3, -1, 2, -1, 1, 2, 0, -1],
    bell: "sine",
    hats: false,
  },
  dolphin: {
    bpm: 112,
    chords: [
      [62, 66, 69, 73], // Dmaj7
      [59, 62, 66, 69], // Bm7
      [67, 71, 74, 78], // Gmaj7
      [69, 73, 76, 79], // A6
    ],
    bass: [38, 35, 43, 45],
    arp: [0, 2, 1, 3, 2, 4, 3, 1],
    bell: "triangle",
    hats: true,
  },
};

export const trackBpm = (id: TrackId) => TRACKS[id].bpm;

/**
 * Score for a track. `level` is reported back each 8th so the visualiser can dance
 * to what is actually being played rather than to a random number.
 */
export function scoreFor(id: TrackId, onBeat?: (energy: number) => void): Score {
  const t = TRACKS[id];
  return (step, time, dur) => {
    // step = 16th note. 16 steps per bar.
    const bar = Math.floor(step / 16) % t.chords.length;
    const s = step % 16;
    const chord = t.chords[bar];

    if (s === 0) {
      // Electric-piano pad: sine + a quiet detuned triangle an octave up.
      chord.forEach((n, i) => {
        playNote({ freq: n, midi: true, dur: dur * 15, gain: 0.035, attack: 0.04, release: 1.2, type: "sine", wet: 0.5, pan: (i - 1.5) * 0.25 }, time);
        playNote({ freq: n + 12, midi: true, dur: dur * 6, gain: 0.012, attack: 0.01, release: 0.8, type: "triangle", detune: 12, wet: 0.6 }, time);
      });
      playNote({ freq: t.bass[bar], midi: true, dur: dur * 7, gain: 0.11, attack: 0.02, release: 0.4, type: "sine" }, time);
    }
    if (s === 10) {
      playNote({ freq: t.bass[bar] + 7, midi: true, dur: dur * 4, gain: 0.07, attack: 0.02, release: 0.3, type: "sine" }, time);
    }

    if (s % 2 === 0) {
      const a = t.arp[(s / 2) % t.arp.length];
      if (a >= 0) {
        const note = chord[a % chord.length] + 12;
        playNote({ freq: note, midi: true, dur: 0.08, gain: 0.05, attack: 0.004, release: 0.9, type: t.bell, wet: 0.7, pan: Math.sin(step) * 0.5 }, time);
        // the glassy overtone
        playNote({ freq: note + 24, midi: true, dur: 0.03, gain: 0.012, attack: 0.002, release: 0.5, type: "sine", wet: 0.8 }, time);
      }
      onBeat?.(a >= 0 ? 0.6 + Math.random() * 0.4 : 0.3);
    }

    if (t.hats && s % 4 === 2) playNoise({ dur: 0.04, gain: 0.025, highpass: 7000, wet: 0.2 }, time);
    if (t.hats && s === 8) playNoise({ dur: 0.12, gain: 0.03, highpass: 1500, lowpass: 5000, wet: 0.4 }, time);
  };
}

/** The sign-in chime — the three-note "someone's online" toast. */
export function signInChime(): void {
  const t = audioBus()?.ctx.currentTime;
  if (t === undefined) return;
  [76, 83, 88].forEach((n, i) =>
    playNote({ freq: n, midi: true, dur: 0.09, gain: 0.07, release: 0.7, type: "sine", wet: 0.5 }, t + i * 0.11),
  );
}

/** Nudge: a buzzy wobble. */
export function nudgeSound(): void {
  const t = audioBus()?.ctx.currentTime;
  if (t === undefined) return;
  for (let i = 0; i < 6; i++) {
    playNote({ freq: 180 + (i % 2) * 40, dur: 0.05, gain: 0.08, type: "square", filter: 1200 }, t + i * 0.06);
  }
}

/** The startup swell. */
export function startupSound(): void {
  [60, 67, 72, 76, 79].forEach((n, i) =>
    playNote({ freq: n, midi: true, dur: 1.6 - i * 0.2, gain: 0.05, attack: 0.3 + i * 0.1, release: 1.8, type: "sine", wet: 0.7 }),
  );
}
