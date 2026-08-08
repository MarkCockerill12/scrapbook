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
 *     that way. `unlock()` is called from the consent modal and the boot screen.
 *   - Muted is the default and it's honoured here, centrally, so no page has to
 *     remember to check.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function ensure(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);
  return ctx;
}

/** Call from a real user gesture. Safe to call repeatedly. */
export function unlock(): void {
  const c = ensure();
  if (c && c.state === "suspended") void c.resume();
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
