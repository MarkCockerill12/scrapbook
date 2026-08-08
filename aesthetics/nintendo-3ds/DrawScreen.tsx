"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useCanvas } from "@/components/CanvasStage";
import { sbGet, sbSet } from "@/lib/storage";
import { flip, scratch, touch } from "./sound";
import styles from "./styles.module.css";

/**
 * The bottom screen: a Flipnote-ish drawing app that keeps what you drew.
 *
 * Strokes are persisted as POINT LISTS, not as a PNG data URL. A 496x372 dataURL is
 * 50–200KB of base64 in localStorage for something that is mostly white; the same
 * drawing as coordinates is a couple of KB, survives a redraw at any size, and — the
 * reason it matters here — can be replayed in order, which is what makes the flipnote
 * playback possible at all.
 */

const W = 456;
const H = 342;
const COLOURS = ["#1d2430", "#e33b4e", "#2a6ff0", "#f2c53d", "#f6f4ea"];
const MAX_POINTS = 6000;

interface Stroke {
  c: number;
  w: number;
  p: number[];
}

const SLUG = "nintendo-3ds";

export function DrawScreen({ onInk }: { onInk: (ink: number) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { toCanvasSpace } = useCanvas();
  const [colour, setColour] = useState(0);
  const [playing, setPlaying] = useState(false);
  const strokes = useRef<Stroke[]>([]);
  const current = useRef<Stroke | null>(null);
  const last = useRef({ x: 0, y: 0, t: 0 });
  const report = useRef(onInk);
  report.current = onInk;

  const paint = useCallback((list: Stroke[]) => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const s of list) {
      ctx.strokeStyle = COLOURS[s.c];
      ctx.lineWidth = s.w;
      ctx.beginPath();
      for (let i = 0; i < s.p.length; i += 2) {
        if (i === 0) ctx.moveTo(s.p[0], s.p[1]);
        else ctx.lineTo(s.p[i], s.p[i + 1]);
      }
      ctx.stroke();
    }
  }, []);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    canvas.width = W;
    canvas.height = H;
    strokes.current = sbGet<Stroke[]>(SLUG, "flipnote", []);
    paint(strokes.current);
    report.current(strokes.current.reduce((n, s) => n + s.p.length / 2, 0));
  }, [paint]);

  const commit = () => {
    let total = strokes.current.reduce((n, s) => n + s.p.length / 2, 0);
    // Oldest strokes fall off the top rather than refusing new ones — the app should
    // never simply stop working.
    while (total > MAX_POINTS && strokes.current.length > 1) {
      total -= strokes.current[0].p.length / 2;
      strokes.current.shift();
    }
    sbSet(SLUG, "flipnote", strokes.current);
    report.current(total);
  };

  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (playing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const p = toCanvasSpace(e.clientX, e.clientY);
    const o = toCanvasSpace(rect.left, rect.top);
    const x = p.x - o.x;
    const y = p.y - o.y;
    current.current = { c: colour, w: colour === 4 ? 16 : 3, p: [x, y] };
    strokes.current.push(current.current);
    last.current = { x, y, t: performance.now() };
    e.currentTarget.setPointerCapture(e.pointerId);
    touch();
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = current.current;
    if (!s) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const p = toCanvasSpace(e.clientX, e.clientY);
    const o = toCanvasSpace(rect.left, rect.top);
    const x = p.x - o.x;
    const y = p.y - o.y;
    const dx = x - last.current.x;
    const dy = y - last.current.y;
    if (dx * dx + dy * dy < 6) return;
    s.p.push(x, y);
    const dt = Math.max(1, performance.now() - last.current.t);
    scratch(Math.hypot(dx, dy) / dt);
    last.current = { x, y, t: performance.now() };
    paint(strokes.current);
  };

  const up = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!current.current) return;
    current.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    commit();
  };

  /** Replay every stroke in the order it was drawn. This is the flipnote. */
  const play = () => {
    if (playing || strokes.current.length === 0) return;
    setPlaying(true);
    flip();
    const all = strokes.current;
    let s = 0;
    let i = 2;
    const id = window.setInterval(() => {
      const partial = all.slice(0, s).concat(
        all[s] ? [{ ...all[s], p: all[s].p.slice(0, i) }] : [],
      );
      paint(partial);
      i += 6;
      if (all[s] && i > all[s].p.length) {
        s += 1;
        i = 2;
        flip();
      }
      if (s >= all.length) {
        window.clearInterval(id);
        paint(all);
        setPlaying(false);
      }
    }, 26);
  };

  const clear = () => {
    strokes.current = [];
    paint([]);
    commit();
    touch();
  };

  return (
    <>
      <div className={styles.paper} />
      <canvas
        ref={ref}
        className={styles.draw}
        style={{ width: W, height: H }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      />
      <div className={styles.tools}>
        {COLOURS.map((c, i) => (
          <button
            key={c}
            type="button"
            aria-label={i === 4 ? "Eraser" : `Colour ${i + 1}`}
            className={`${styles.swatch} ${i === colour ? styles.swatchOn : ""}`}
            style={{ background: c }}
            onClick={() => {
              setColour(i);
              touch();
            }}
          />
        ))}
        <button type="button" className={styles.tool} onClick={play}>
          {playing ? "playing" : "play"}
        </button>
        <button type="button" className={styles.tool} onClick={clear}>
          clear
        </button>
      </div>
    </>
  );
}
