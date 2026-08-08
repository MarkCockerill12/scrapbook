"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useCanvas } from "@/components/CanvasStage";
import styles from "./styles.module.css";

/**
 * A panel with five hundred years of dirt on it that you rub off by dragging.
 *
 * The dirt is a canvas painted with mottled grime; the brush is
 * `globalCompositeOperation = "destination-out"`, which is the only honest way to do
 * this — a mask would need the whole cleared region as a shape, and the whole point
 * is that the shape is whatever the visitor's hand did.
 *
 * Coverage is sampled from the alpha channel every 12th stroke rather than every
 * move: `getImageData` on a 414x190 buffer is far too expensive at pointer rate, and
 * "roughly how clean is it" does not need to be exact.
 */

const BRUSH = 34;

export function RubPanel({
  width,
  height,
  onClean,
  children,
}: {
  width: number;
  height: number;
  /** Fired once, when enough has been cleared to count as revealed. */
  onClean: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { toCanvasSpace } = useCanvas();
  const done = useRef(false);
  const strokes = useRef(0);
  const cleaned = useRef(onClean);
  cleaned.current = onClean;

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !ctx) return;
    canvas.width = width;
    canvas.height = height;

    // Grime: a base coat plus a few hundred blotches, so the edge of a wiped area
    // is irregular and the surface never looks like flat paint.
    ctx.fillStyle = "#5d5138";
    ctx.fillRect(0, 0, width, height);
    for (let i = 0; i < 420; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const r = 4 + Math.random() * 26;
      ctx.globalAlpha = 0.05 + Math.random() * 0.18;
      ctx.fillStyle = Math.random() > 0.5 ? "#3b3222" : "#7a6a49";
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    let down = false;

    const rub = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const p = toCanvasSpace(clientX, clientY);
      const origin = toCanvasSpace(rect.left, rect.top);
      const x = p.x - origin.x;
      const y = p.y - origin.y;

      ctx.globalCompositeOperation = "destination-out";
      const g = ctx.createRadialGradient(x, y, 0, x, y, BRUSH);
      g.addColorStop(0, "rgba(0,0,0,0.9)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, BRUSH, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";

      strokes.current += 1;
      if (done.current || strokes.current % 12 !== 0) return;

      const data = ctx.getImageData(0, 0, width, height).data;
      let clear = 0;
      // Every 40th pixel is plenty for a percentage.
      for (let i = 3; i < data.length; i += 160) {
        if (data[i] < 60) clear++;
      }
      if (clear / (data.length / 160) > 0.5) {
        done.current = true;
        cleaned.current();
      }
    };

    const onDown = (e: PointerEvent) => {
      down = true;
      canvas.setPointerCapture(e.pointerId);
      rub(e.clientX, e.clientY);
    };
    const onMove = (e: PointerEvent) => down && rub(e.clientX, e.clientY);
    const onUp = (e: PointerEvent) => {
      down = false;
      canvas.releasePointerCapture?.(e.pointerId);
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
  }, [width, height, toCanvasSpace]);

  return (
    <div className={styles.rub} style={{ width, height }}>
      <div className={styles.rubReveal}>{children}</div>
      <canvas ref={ref} className={styles.rubCanvas} style={{ width, height }} />
    </div>
  );
}
