"use client";

import { useEffect, useRef } from "react";
import { audioBus } from "@/lib/audio";
import { useShell } from "@/lib/store";

/**
 * Generative music — behaviour only, no aesthetic opinion.
 *
 * `lib/audio.ts` covers UI blips and noise beds; this covers the thing that actually
 * makes a page feel inhabited: a slow bed of chords, a bell arpeggio, a bass line.
 * Every page writes its own score (a `Score` callback that is asked, step by step,
 * what to play) and chooses its own timbres, so no two pages sound alike.
 *
 * Scheduling uses the standard look-ahead pattern: a coarse JS timer fills the next
 * ~200ms of the audio clock, so timing is sample-accurate however busy the page is.
 *
 * Muted is honoured continuously: the hook stops the loop the moment the shell mutes
 * and restarts it on unmute.
 */

export interface NoteSpec {
  /** Hz, or a MIDI note number when `midi` is true. */
  freq: number;
  midi?: boolean;
  /** Seconds. */
  dur: number;
  type?: OscillatorType;
  gain?: number;
  attack?: number;
  release?: number;
  /** Lowpass cutoff (Hz). Omit for none. */
  filter?: number;
  /** Filter sweep target over the note. */
  filterTo?: number;
  /** Detuned twin oscillator, in cents — instant chorus/supersaw. */
  detune?: number;
  /** -1..1 */
  pan?: number;
  /** 0..1 amount sent to the shared reverb. */
  wet?: number;
  /** Vibrato depth in cents (5Hz). */
  vibrato?: number;
  /** Glide from this frequency (Hz) into `freq`. */
  from?: number;
}

export const mtof = (m: number) => 440 * 2 ** ((m - 69) / 12);

/** One reverb per channel bus, so a tail never rings on into the next page. */
let reverbFor: WeakMap<GainNode, ConvolverNode> = new WeakMap();

/** Synthesised impulse response: decaying stereo noise. Cheap, lush, no files. */
function reverb(ctx: AudioContext, master: GainNode): ConvolverNode {
  const have = reverbFor.get(master);
  if (have) return have;
  const seconds = 3.2;
  const len = Math.floor(ctx.sampleRate * seconds);
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.6;
  }
  const conv = ctx.createConvolver();
  conv.buffer = ir;
  const ret = ctx.createGain();
  ret.gain.value = 0.55;
  conv.connect(ret);
  ret.connect(master);
  reverbFor.set(master, conv);
  return conv;
}

/** Schedule one note at audio time `t`. Returns nothing; fire and forget. */
export function playNote(n: NoteSpec, t?: number): void {
  const bus = audioBus();
  if (!bus) return;
  const { ctx, master } = bus;
  const at = t ?? ctx.currentTime;
  const f = n.midi ? mtof(n.freq) : n.freq;
  const attack = n.attack ?? 0.01;
  const release = n.release ?? 0.3;
  const peak = n.gain ?? 0.1;
  const end = at + n.dur;

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(peak, at + attack);
  env.gain.setValueAtTime(peak, Math.max(at + attack, end - 0.001));
  env.gain.exponentialRampToValueAtTime(0.0001, end + release);

  let tail: AudioNode = env;
  if (n.filter) {
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(n.filter, at);
    if (n.filterTo) lp.frequency.exponentialRampToValueAtTime(n.filterTo, end + release);
    lp.Q.value = 0.8;
    env.connect(lp);
    tail = lp;
  }
  if (n.pan) {
    const p = ctx.createStereoPanner();
    p.pan.value = n.pan;
    tail.connect(p);
    tail = p;
  }
  tail.connect(master);
  if (n.wet) {
    const send = ctx.createGain();
    send.gain.value = n.wet;
    tail.connect(send);
    send.connect(reverb(ctx, master));
  }

  const oscs: OscillatorNode[] = [];
  const voices = n.detune ? [-n.detune / 2, n.detune / 2] : [0];
  for (const cents of voices) {
    const o = ctx.createOscillator();
    o.type = n.type ?? "sine";
    if (n.from) {
      o.frequency.setValueAtTime(n.from, at);
      o.frequency.exponentialRampToValueAtTime(f, at + Math.min(0.12, n.dur));
    } else o.frequency.setValueAtTime(f, at);
    o.detune.value = cents;
    if (n.vibrato) {
      const lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      lfo.frequency.value = 5;
      depth.gain.value = n.vibrato;
      lfo.connect(depth);
      depth.connect(o.detune);
      lfo.start(at);
      lfo.stop(end + release + 0.05);
    }
    const g = ctx.createGain();
    g.gain.value = 1 / voices.length;
    o.connect(g);
    g.connect(env);
    o.start(at);
    o.stop(end + release + 0.05);
    oscs.push(o);
  }
}

/** A filtered noise hit — hats, snares, surf, vinyl crackle. */
export function playNoise(
  { dur, gain = 0.08, highpass = 0, lowpass = 12000, wet = 0, pan = 0 }:
  { dur: number; gain?: number; highpass?: number; lowpass?: number; wet?: number; pan?: number },
  t?: number,
): void {
  const bus = audioBus();
  if (!bus) return;
  const { ctx, master } = bus;
  const at = t ?? ctx.currentTime;
  const len = Math.max(1, Math.floor(ctx.sampleRate * (dur + 0.05)));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const env = ctx.createGain();
  env.gain.setValueAtTime(gain, at);
  env.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  let tail: AudioNode = src;
  if (highpass) {
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = highpass;
    tail.connect(hp);
    tail = hp;
  }
  const lp = ctx.createBiquadFilter();
  lp.frequency.value = lowpass;
  tail.connect(lp);
  lp.connect(env);
  let out: AudioNode = env;
  if (pan) {
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    env.connect(p);
    out = p;
  }
  out.connect(master);
  if (wet) {
    const s = ctx.createGain();
    s.gain.value = wet;
    out.connect(s);
    s.connect(reverb(ctx, master));
  }
  src.start(at);
  src.stop(at + dur + 0.05);
}

/** A kick drum: sine pitch-drop. */
export function playKick(t?: number, gain = 0.5, tone = 1): void {
  playNote({ freq: 50 * tone, from: 150 * tone, dur: 0.12, gain, release: 0.18, type: "sine" }, t);
}

/**
 * The score: called once per step with the step index and its exact audio time.
 * Schedule whatever that step should play with playNote/playNoise at `time`.
 */
export type Score = (step: number, time: number, stepDur: number) => void;

export interface Loop {
  stop: () => void;
  setBpm: (bpm: number) => void;
}

/** Start a step sequencer. `stepsPerBeat` 4 = sixteenth notes. */
export function startLoop(score: Score, bpm = 90, stepsPerBeat = 4): Loop {
  let bus = audioBus();
  if (!bus) return { stop: () => {}, setBpm: () => {} };
  let stepDur = 60 / bpm / stepsPerBeat;
  let next = bus.ctx.currentTime + 0.08;
  let step = 0;
  let alive = true;
  const tick = () => {
    if (!alive) return;
    bus = audioBus();
    if (!bus) return;
    while (next < bus.ctx.currentTime + 0.22) {
      try {
        score(step, next, stepDur);
      } catch {
        /* a bad bar must never kill the loop */
      }
      next += stepDur;
      step += 1;
    }
  };
  const id = window.setInterval(tick, 50);
  tick();
  return {
    stop: () => {
      alive = false;
      window.clearInterval(id);
    },
    setBpm: (b: number) => {
      stepDur = 60 / b / stepsPerBeat;
    },
  };
}

/**
 * React hook: runs `score` while `on` and the shell is unmuted. The score is read
 * through a ref, so a page can change what it plays (a new track, a new weather)
 * without restarting the clock.
 */
export function useMusic(score: Score | null, bpm = 90, on = true, stepsPerBeat = 4): void {
  const muted = useShell((s) => s.muted);
  const ref = useRef(score);
  ref.current = score;
  const loop = useRef<Loop | null>(null);
  useEffect(() => {
    if (muted || !on || !ref.current) return;
    // Unlock is gesture-bound elsewhere; if the context isn't running yet, poll briefly.
    let l: Loop | null = null;
    const tryStart = () => {
      if (l) return;
      if (!audioBus()) return;
      l = startLoop((s, t, d) => ref.current?.(s, t, d), bpm, stepsPerBeat);
      loop.current = l;
    };
    tryStart();
    const id = window.setInterval(tryStart, 500);
    return () => {
      window.clearInterval(id);
      l?.stop();
      loop.current = null;
    };
    // bpm handled below without a restart
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [muted, on, stepsPerBeat]);
  useEffect(() => {
    loop.current?.setBpm(bpm);
  }, [bpm]);
}

/** Reset the cached reverb (for tests / context swaps). */
export function _resetMusic(): void {
  reverbFor = new WeakMap();
}
