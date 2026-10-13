"use client";

import { Fragment } from "react";
import { img } from "@/lib/assets";
import { INSTRUMENTS, PATCHES, type Inst, type Pattern } from "./engine";
import styles from "./instruments.module.css";

const A = "vaporwave";

/*
 * Both instruments are REAL photographs (Wikipedia lead images, file numbers on the
 * contact sheet: 1 = TR-808, 2 = Juno-60) with invisible hotspots measured off the
 * photo, as fractions of its width/height, so they survive any display size.
 */

const pct = (v: number) => `${(v * 100).toFixed(3)}%`;

/* ------------------------------------------------------------------ Juno-60 */

const KEY_L = 300 / 1600;
const KEY_R = 1500 / 1600;
const WHITE_N = 36;
const WHITE_W = (KEY_R - KEY_L) / WHITE_N;
const KEY_TOP = 340 / 580;
const BLACK_BOTTOM = 495 / 580;
const LOW = 36; // C2
const WHITE_STEPS = [0, 2, 4, 5, 7, 9, 11];
const BLACK_AFTER = [0, 1, 3, 4, 5]; // white index within octave that a black key follows

const NOTE = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
/** What a key is, and which computer key plays it, if any. */
function keyTip(m: number): string {
  const pc = Object.entries(KEYMAP).find(([, v]) => v === m)?.[0];
  return `${NOTE[m % 12]}${Math.floor(m / 12) - 1}${pc ? ` — computer key ${pc.toUpperCase()}` : ""}`;
}

export const KEYMAP: Record<string, number> = {
  a: 60, w: 61, s: 62, e: 63, d: 64, f: 65, t: 66, g: 67, y: 68, h: 69, u: 70, j: 71, k: 72, o: 73, l: 74, p: 75, ";": 76,
};

export function Juno({
  width,
  held,
  arp,
  hold,
  chorus,
  patch,
  onDown,
  onUp,
  onArp,
  onHold,
  onChorus,
  onPatch,
}: {
  width: number;
  held: number[];
  arp: boolean;
  hold: boolean;
  chorus: number;
  patch: number;
  onDown: (m: number) => void;
  onUp: (m: number) => void;
  onArp: () => void;
  onHold: () => void;
  onChorus: (c: number) => void;
  onPatch: (p: number) => void;
}) {
  const e = img(A, "vw_synth", 2);
  const height = e ? (width * e.height) / e.width : width / 2.76;
  const whites: { m: number; i: number }[] = [];
  const blacks: { m: number; x: number }[] = [];
  for (let i = 0; i < WHITE_N; i++) {
    const oct = Math.floor(i / 7);
    const wi = i % 7;
    whites.push({ m: LOW + oct * 12 + WHITE_STEPS[wi], i });
    if (BLACK_AFTER.includes(wi) && i < WHITE_N - 1) blacks.push({ m: LOW + oct * 12 + WHITE_STEPS[wi] + 1, x: KEY_L + (i + 1) * WHITE_W });
  }
  const press = (m: number) => (ev: React.PointerEvent) => {
    ev.currentTarget.releasePointerCapture?.(ev.pointerId);
    onDown(m);
  };
  const btn = (x: number, y: number, w: number, h: number, on: boolean, click: () => void, label: string, led?: { x: number; y: number }) => (
    <Fragment key={label}>
      <button
        type="button"
        aria-label={label}
        data-tip={label}
        data-side={x > 0.5 ? "r" : "l"}
        className={`${styles.btn} ${on ? styles.btnOn : ""}`}
        style={{ left: pct(x - w / 2), top: pct(y - h / 2), width: pct(w), height: pct(h) }}
        onClick={click}
      />
      {led && <i className={`${styles.led} ${on ? styles.ledOn : ""}`} style={{ left: pct(led.x), top: pct(led.y) }} />}
    </Fragment>
  );
  return (
    <div className={styles.juno} style={{ width, height }}>
      <img src={e?.src ?? ""} alt="Roland Juno-60" draggable={false} />
      <span className={styles.lcd}>{String(patch + 11).padStart(2, "0")}</span>
      <span className={styles.patchName}>{PATCHES[patch].name}</span>
      {btn(266 / 1600, 228 / 580, 0.018, 0.05, arp, onArp, arp ? "ARPEGGIO: on — plays the held notes one at a time" : "ARPEGGIO: off — click to run the held notes as a pattern", { x: 266 / 1600, y: 205 / 580 })}
      {btn(215 / 1600, 228 / 580, 0.018, 0.05, hold, onHold, hold ? "HOLD: on — keys stay down until pressed again" : "HOLD: off — click to latch the keys you press", { x: 215 / 1600, y: 205 / 580 })}
      {[0, 1, 2].map((c) => btn((1136 + c * 24) / 1600, 228 / 580, 0.015, 0.05, chorus === c, () => onChorus(c), ["CHORUS off — dry", "CHORUS I — slow shimmer", "CHORUS II — deep, wide shimmer"][c], c ? { x: (1136 + c * 24) / 1600, y: 205 / 580 } : undefined))}
      {PATCHES.map((_, p) => btn((1237 + p * 22.4) / 1600, 253 / 580, 0.013, 0.04, patch === p, () => onPatch(p), `PATCH ${p + 11}: ${PATCHES[p].name} — click to load and hear it`))}
      {whites.map((k) => (
        <button
          key={k.m}
          type="button"
          aria-label={`key ${k.m}`}
          data-tip={keyTip(k.m)}
          className={`${styles.white} ${held.includes(k.m) ? styles.down : ""}`}
          style={{ left: pct(KEY_L + k.i * WHITE_W), top: pct(KEY_TOP), width: pct(WHITE_W), height: pct(0.99 - KEY_TOP) }}
          onPointerDown={press(k.m)}
          onPointerUp={() => onUp(k.m)}
          onPointerLeave={() => held.includes(k.m) && !hold && onUp(k.m)}
          onPointerEnter={(ev) => ev.buttons === 1 && onDown(k.m)}
        />
      ))}
      {blacks.map((k) => (
        <button
          key={k.m}
          type="button"
          aria-label={`key ${k.m}`}
          data-tip={keyTip(k.m)}
          className={`${styles.black} ${held.includes(k.m) ? styles.down : ""}`}
          style={{ left: pct(k.x - WHITE_W * 0.32), top: pct(KEY_TOP), width: pct(WHITE_W * 0.64), height: pct(BLACK_BOTTOM - KEY_TOP) }}
          onPointerDown={press(k.m)}
          onPointerUp={() => onUp(k.m)}
          onPointerLeave={() => held.includes(k.m) && !hold && onUp(k.m)}
          onPointerEnter={(ev) => ev.buttons === 1 && onDown(k.m)}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ TR-808 */

const INST_X: Record<Inst, number> = { BD: 470, SD: 547, LT: 625, HT: 780, RS: 857, CP: 935, CB: 1013, CY: 1091, OH: 1169, CH: 1247 };
const INST_NAME: Record<Inst, string> = { BD: "Bass Drum", SD: "Snare", LT: "Low Tom", HT: "Hi Tom", RS: "Rim Shot", CP: "Clap", CB: "Cowbell", CY: "Cymbal", OH: "Open Hat", CH: "Closed Hat" };

export function TR808({
  width,
  pattern,
  inst,
  step,
  playing,
  tempo,
  onInst,
  onToggle,
  onStartStop,
  onTempo,
}: {
  width: number;
  pattern: Pattern;
  inst: Inst;
  step: number;
  playing: boolean;
  tempo: number;
  onInst: (i: Inst) => void;
  onToggle: (s: number) => void;
  onStartStop: () => void;
  onTempo: () => void;
}) {
  const e = img(A, "vw_synth", 1);
  const height = e ? (width * e.height) / e.width : width / 1.68;
  const W8 = 1400;
  const H8 = 833;
  return (
    <div className={styles.tr} style={{ width, height }}>
      <img src={e?.src ?? ""} alt="Roland TR-808" draggable={false} />
      {INSTRUMENTS.map((i) => (
        <button
          key={i}
          type="button"
          data-tip={`${INST_NAME[i]} — click to hear it and edit its steps below`}
          aria-label={INST_NAME[i]}
          className={`${styles.inst} ${inst === i ? styles.instOn : ""}`}
          style={{ left: pct((INST_X[i] - 38) / W8), top: pct(405 / H8), width: pct(76 / W8), height: pct(26 / H8) }}
          onClick={() => onInst(i)}
        />
      ))}
      {Array.from({ length: 16 }, (_, s) => {
        const x = (371 + s * 51.9) / W8;
        const on = pattern[inst][s];
        return (
          <button
            key={s}
            type="button"
            aria-label={`step ${s + 1}`}
            data-tip={`Step ${s + 1}: ${INST_NAME[inst]} ${on ? "plays here — click to remove" : "is silent here — click to add"}`}
            className={`${styles.step} ${on ? styles.stepOn : ""} ${playing && step === s ? styles.stepNow : ""}`}
            style={{ left: pct(x - 20 / W8), top: pct(655 / H8), width: pct(40 / W8), height: pct(64 / H8) }}
            onClick={() => onToggle(s)}
          >
            <i style={{ opacity: on || (playing && step === s) ? 1 : 0 }} />
          </button>
        );
      })}
      <button
        type="button"
        className={`${styles.start} ${playing ? styles.startOn : ""}`}
        style={{ left: pct(135 / W8), top: pct(655 / H8), width: pct(112 / W8), height: pct(66 / H8) }}
        onClick={onStartStop}
        aria-label="Start / Stop"
        data-tip={playing ? "STOP the drum pattern (space)" : "START the drum pattern (space)"}
      />
      <button
        type="button"
        className={styles.tempo}
        aria-label="Tempo"
        data-tip={`TEMPO: ${tempo} BPM — click for the next speed`}
        style={{ left: pct(118 / W8), top: pct(378 / H8), width: pct(124 / W8), height: pct(124 / H8), rotate: `${(tempo - 60) * 3 - 120}deg`, ["--turn" as string]: `${(tempo - 60) * 3 - 120}deg` }}
        onClick={onTempo}
      />
      <span className={styles.readout}>
        {INST_NAME[inst].toUpperCase()} · {tempo} BPM
      </span>
    </div>
  );
}
