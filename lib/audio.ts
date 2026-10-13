"use client";

import { useShell } from "@/lib/store";

/**
 * Sound, synthesised rather than sampled.
 *
 * Most of what these pages need is short UI sound — a droplet, a click, a chime, a
 * pop — and generating it with oscillators means every page has audio from day one
 * with no files to source, no bytes in the bucket, and no loading to sequence behind
 * a channel transition. Sampled audio (the dial-up handshake, Wii menu music, muzak)
 * comes later as real assets, per page.
 *
 * Two rules the browser enforces and we cooperate with:
 *   - No AudioContext until a real user gesture, or it starts suspended and stays
 *     that way. `unlock()` is called from the shell on the first click or key.
 *   - Sound is on by default. Mute is honoured here, centrally, so no page has to
 *     remember to check.
 */

let ctx: AudioContext | null = null;
/** The one output. Only the shell's own sounds are wired straight to it. */
let out: GainNode | null = null;
/** The channel that is on screen. Every page sound goes through this, so leaving a
 *  page takes all of it away at once: late notes, long tails, reverb, forgotten loops. */
let master: GainNode | null = null;

const LEVEL = 0.5;

function ensure(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  out = ctx.createGain();
  out.gain.value = useShell.getState().muted ? 0 : LEVEL;
  out.connect(ctx.destination);
  master = ctx.createGain();
  master.connect(out);
  // Mute is a hand on the output as well as a guard on each call, so a loop that was
  // already running when the visitor muted goes quiet with everything else.
  useShell.subscribe((st, prev) => {
    if (st.muted === prev.muted || !ctx || !out) return;
    out.gain.cancelScheduledValues(ctx.currentTime);
    out.gain.setTargetAtTime(st.muted ? 0 : LEVEL, ctx.currentTime, 0.05);
  });
  return ctx;
}

/** Turn the current channel down. Called as the static comes up over it. */
export function duckScene(seconds = 0.26): void {
  if (!ctx || !master) return;
  const t = ctx.currentTime;
  master.gain.cancelScheduledValues(t);
  master.gain.setValueAtTime(master.gain.value, t);
  master.gain.linearRampToValueAtTime(0, t + seconds);
}

/**
 * A new channel: the old one's bus is faded, then cut loose with whatever was still
 * sounding on it, and the next page gets a clean one that fades up. Called from a
 * layout effect, so it has happened before any page effect starts a sound.
 */
export function newScene(): void {
  // nothing has made a sound yet: there is no bus to swap, and no context to wake
  const c = ctx;
  if (!c || !out) return;
  const t = c.currentTime;
  const old = master;
  if (old) {
    old.gain.cancelScheduledValues(t);
    old.gain.setValueAtTime(old.gain.value, t);
    old.gain.linearRampToValueAtTime(0, t + 0.12);
    window.setTimeout(() => old.disconnect(), 400);
  }
  master = c.createGain();
  master.gain.setValueAtTime(0, t);
  master.gain.linearRampToValueAtTime(1, t + 0.9);
  master.connect(out);
}

/**
 * The channel change, heard: the tuner sliding off one station and settling on the
 * next. One soft sweep of band-passed static with a slow start and a slow end, and a
 * low settling note under it. It belongs to the shell, so it does not go through a page.
 */
export function channelChange(): void {
  if (!audible()) return;
  const c = ensure();
  if (!c || c.state !== "running" || !out) return;
  const t = c.currentTime;
  const dur = 0.62;

  const frames = Math.floor(c.sampleRate * (dur + 0.1));
  const buffer = c.createBuffer(1, frames, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buffer;
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.value = 1.1;
  bp.frequency.setValueAtTime(420, t);
  bp.frequency.exponentialRampToValueAtTime(2600, t + dur * 0.55);
  bp.frequency.exponentialRampToValueAtTime(900, t + dur);
  const env = c.createGain();
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(0.11, t + 0.16);
  env.gain.linearRampToValueAtTime(0.07, t + dur * 0.6);
  env.gain.linearRampToValueAtTime(0, t + dur);
  src.connect(bp);
  bp.connect(env);
  env.connect(out);
  src.start(t);
  src.stop(t + dur + 0.05);

  const osc = c.createOscillator();
  const og = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(196, t + dur * 0.5);
  osc.frequency.exponentialRampToValueAtTime(294, t + dur);
  og.gain.setValueAtTime(0, t + dur * 0.5);
  og.gain.linearRampToValueAtTime(0.05, t + dur * 0.8);
  og.gain.linearRampToValueAtTime(0, t + dur + 0.5);
  osc.connect(og);
  og.connect(out);
  osc.start(t + dur * 0.5);
  osc.stop(t + dur + 0.55);
}

/** Call from a real user gesture. Safe to call repeatedly. */
export function unlock(): void {
  const c = ensure();
  if (!c) return;
  const ready = () => c.state === "running" && useShell.getState().setAudioReady();
  if (c.state === "suspended") void c.resume().then(ready, () => {});
  else ready();
}

function audible(): boolean {
  return !useShell.getState().muted;
}

export interface ToneOptions {
  /** Hz at the start of the note. */
  freq: number;
  /** Hz at the end — a glide. Defaults to no glide. */
  toFreq?: number;
  duration?: number;
  type?: OscillatorType;
  gain?: number;
  /** Seconds to wait before playing. For stacking a chord or an echo. */
  delay?: number;
}

/** One enveloped oscillator. The building block for everything below. */
export function tone({
  freq,
  toFreq,
  duration = 0.18,
  type = "sine",
  gain = 0.22,
  delay = 0,
}: ToneOptions): void {
  if (!audible()) return;
  const c = ensure();
  if (!c || c.state !== "running" || !master) return;

  const t = c.currentTime + delay;
  const osc = c.createOscillator();
  const env = c.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (toFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(toFreq, 1), t + duration);

  // Fast attack, exponential decay — percussive, which is what UI sound wants.
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + 0.008);
  env.gain.exponentialRampToValueAtTime(0.0001, t + duration);

  osc.connect(env);
  env.connect(master);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

/** A water droplet. Pitch rises as it lands, the way a real one does. */
export function droplet(pitch = 1): void {
  tone({ freq: 420 * pitch, toFreq: 1500 * pitch, duration: 0.13, gain: 0.16 });
}

/** A bubble popping. Short, low, dry. */
export function pop(pitch = 1): void {
  tone({ freq: 700 * pitch, toFreq: 180 * pitch, duration: 0.07, type: "triangle", gain: 0.13 });
}

/** A soft two-note confirmation, for toggles and successful actions. */
export function chime(up = true): void {
  const [a, b] = up ? [660, 990] : [880, 587];
  tone({ freq: a, duration: 0.13, type: "sine", gain: 0.13 });
  tone({ freq: b, duration: 0.22, type: "sine", gain: 0.11, delay: 0.07 });
}

/** A dry tick for hovers and small state changes. */
export function tick(): void {
  tone({ freq: 1400, toFreq: 900, duration: 0.035, type: "square", gain: 0.05 });
}

export interface NoiseOptions {
  gain?: number;
  /** Cut everything above this, in Hz. Low values give rumble, high values give hiss. */
  lowpass?: number;
  /** Cut everything below this, in Hz. */
  highpass?: number;
  /** Seconds to fade in. Noise that starts instantly reads as a glitch. */
  attack?: number;
}

/**
 * A looping noise bed. Returns a stop function.
 *
 * Filtered white noise is the whole of a surprising number of sounds these pages
 * need — tape hiss, waves, rain, a fluorescent tube, a photocopier, room tone,
 * console fan. Two biquads and a gain cover all of them, and it costs one 2-second
 * buffer instead of a file per page.
 *
 * Mute is honoured at *start* only, the same way the looping music is: callers hold
 * this in an effect keyed on `muted`, so unmuting restarts it. A continuously
 * running source can't consult the per-call guard that `tone` uses.
 */
export function noiseLoop({
  gain = 0.06,
  lowpass = 8000,
  highpass = 0,
  attack = 0.6,
}: NoiseOptions = {}): () => void {
  if (!audible()) return () => {};
  const c = ensure();
  if (!c || c.state !== "running" || !master) return () => {};

  const frames = c.sampleRate * 2;
  const buffer = c.createBuffer(1, frames, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;

  const src = c.createBufferSource();
  src.buffer = buffer;
  src.loop = true;

  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = lowpass;

  const env = c.createGain();
  // The resting value has to be silence too: stopping in the same instant as starting
  // cancels the ramp below, and a gain node with nothing scheduled sits at 1 — which
  // was a burst of full-volume noise every time a page mounted twice.
  env.gain.value = 0.0001;
  env.gain.setValueAtTime(0.0001, c.currentTime);
  env.gain.exponentialRampToValueAtTime(gain, c.currentTime + attack);

  let tail: AudioNode = src;
  if (highpass > 0) {
    const hp = c.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = highpass;
    tail.connect(hp);
    tail = hp;
  }
  tail.connect(lp);
  lp.connect(env);
  env.connect(master);
  src.start();

  return () => {
    try {
      if (env.gain.cancelAndHoldAtTime) env.gain.cancelAndHoldAtTime(c.currentTime);
      else env.gain.cancelScheduledValues(c.currentTime);
      env.gain.setTargetAtTime(0.0001, c.currentTime, 0.08);
      src.stop(c.currentTime + 0.4);
    } catch {
      /* already stopped */
    }
  };
}

/**
 * Raw access for lib/music.ts — the running context and master bus, or null when
 * muted / locked. Everything scheduled against it must re-check on each tick.
 */
export function audioBus(): { ctx: AudioContext; master: GainNode } | null {
  if (!audible()) return null;
  const c = ensure();
  if (!c || c.state !== "running" || !master) return null;
  return { ctx: c, master };
}
