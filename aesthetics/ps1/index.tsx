"use client";

import { useCallback, useEffect, useState } from "react";
import { audioBus, noiseLoop, unlock } from "@/lib/audio";
import { playNote, useMusic, type Score } from "@/lib/music";
import { useShell } from "@/lib/store";
import { blip } from "./sound";
import { PLACES, World } from "./World";
import p from "./world.module.css";

/**
 * Channel — PS1 Low-Poly.
 *
 * Rebuilt 2026-10 (Mark: "get rid of all the game selection stuff and just focus on
 * the main part, the aesthetic"). The bedroom floor, the jewel cases, the four
 * mini-games and their scores are gone. What is left is the picture itself, filling
 * the tube: the boot, then a small town in fog, rendered by the software rasteriser
 * with every period defect intact, that you can simply walk around in.
 */

type Phase = "sony" | "ps" | "world";

function bootChime() {
  const t = audioBus()?.ctx.currentTime;
  if (t === undefined) return;
  // the airy rising swell, then the deep 'bong' — the PlayStation boot shape
  playNote({ freq: 36, midi: true, dur: 1.6, gain: 0.12, type: "sine", attack: 0.6, release: 2.5, wet: 0.8 }, t);
  [72, 79, 84, 88].forEach((m, i) => playNote({ freq: m, midi: true, dur: 1.4, gain: 0.03, type: "sine", attack: 0.8, release: 2.4, detune: 10, wet: 0.9 }, t + i * 0.12));
  playNote({ freq: 48, midi: true, dur: 0.4, gain: 0.16, type: "triangle", release: 3, wet: 0.9 }, t + 2.6);
  playNote({ freq: 55, midi: true, dur: 0.4, gain: 0.08, type: "sine", release: 3, wet: 0.9 }, t + 2.6);
}

// Save-room music: a music-box figure over a held fifth, a lot of reverb, no hurry.
const FIGURE = [69, 76, 72, 76, 67, 76, 72, 74, 65, 72, 69, 72, 64, 71, 67, 72];
const score: Score = (step, t, d) => {
  if (step % 2 === 0) {
    playNote({ freq: FIGURE[(step / 2) % FIGURE.length], midi: true, dur: 0.5, type: "triangle", gain: 0.07, attack: 0.004, release: 1.6, wet: 0.85, pan: (step % 8) / 8 - 0.5 }, t);
  }
  if (step % 32 === 0) {
    const root = [45, 43, 41, 40][(step / 32) % 4];
    playNote({ freq: root, midi: true, dur: d * 30, type: "sine", gain: 0.09, attack: 1.2, release: 2, wet: 0.6 }, t);
    playNote({ freq: root + 7, midi: true, dur: d * 30, type: "sine", gain: 0.05, attack: 1.6, release: 2, wet: 0.7, detune: 7 }, t);
  }
};

export default function PS1() {
  const muted = useShell((s) => s.muted);
  const [phase, setPhase] = useState<Phase>("sony");
  const [near, setNear] = useState(-1);
  const [chars, setChars] = useState(0);

  useEffect(() => {
    bootChime();
    const a = window.setTimeout(() => setPhase((ph) => (ph === "sony" ? "ps" : ph)), 3000);
    const b = window.setTimeout(() => setPhase("world"), 5600);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, []);

  useMusic(score, 92, phase === "world");
  useEffect(() => {
    if (muted || phase !== "world") return;
    // wind, and the 15kHz whine of the tube
    const wind = noiseLoop({ gain: 0.035, lowpass: 480, attack: 3 });
    return wind;
  }, [muted, phase]);

  const onNear = useCallback((i: number) => {
    setNear(i);
    setChars(0);
    if (i >= 0) blip();
  }, []);

  // The message window types itself out, one character at a time.
  const text = near >= 0 ? PLACES[near].text : "";
  useEffect(() => {
    if (chars >= text.length) return;
    const id = window.setTimeout(() => setChars((c) => c + 1), 26);
    return () => window.clearTimeout(id);
  }, [chars, text]);

  return (
    <div
      className={p.root}
      onPointerDown={() => {
        unlock();
        if (phase !== "world") setPhase("world");
      }}
    >
      <div className={p.tube}>
        {phase === "sony" && (
          <div className={p.sony}>
            <i className={p.diamond} />
            <b>Sony Computer Entertainment</b>
          </div>
        )}
        {phase === "ps" && (
          <div className={p.ps}>
            <b>PlayStation</b>
            <small>Licensed by Sony Computer Entertainment</small>
          </div>
        )}
        {phase === "world" && (
          <div className={p.world}>
            <World width={1200} height={900} onNear={onNear} />
            {near >= 0 && (
              <div className={p.window}>
                {text.slice(0, chars)}
                {chars >= text.length && <i className={p.more}>▼</i>}
              </div>
            )}
            <div className={p.legend}>
              <span>
                <b>▲</b>
                <b>▼</b> walk
              </span>
              <span>
                <b>◀</b>
                <b>▶</b> turn
              </span>
            </div>
          </div>
        )}
        <div className={p.scan} />
        <div className={p.glass} />
      </div>
    </div>
  );
}
