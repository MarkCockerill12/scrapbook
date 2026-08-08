"use client";

import { useEffect, useRef } from "react";
import styles from "./styles.module.css";

/**
 * The infinite grid floor.
 *
 * Three things make a grid read as *receding* rather than as a flat pattern:
 *
 *   1. THE HORIZONTAL SPACING IS QUADRATIC. `y = H * p²` puts the lines almost on top
 *      of each other at the horizon and far apart at your feet, which is what
 *      perspective actually does. Even spacing reads as a fence lying down.
 *   2. THE VERTICAL LINES CONVERGE TO A POINT. All of them, at the exact horizon.
 *   3. IT ACCELERATES TOWARD YOU. Because spacing grows, the same constant offset
 *      makes lines speed up as they approach — for free, and it's the whole feeling.
 *
 * Chromatic fringing is done by drawing the grid three times (red offset one way,
 * cyan the other, then the main pass) under `lighter` compositing, which is what a
 * badly converged RGB signal genuinely does. Filters can't do it directionally.
 */

const ROWS = 22;
const COLS = 26;

export function GridFloor({
  speed,
  chroma,
  width = 1600,
  height = 470,
}: {
  speed: number;
  chroma: number;
  width?: number;
  height?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const speedRef = useRef(speed);
  const chromaRef = useRef(chroma);
  speedRef.current = speed;
  chromaRef.current = chroma;

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    let offset = 0;
    let raf = 0;

    const pass = (dx: number, colour: string, alpha: number) => {
      ctx.save();
      ctx.translate(dx, 0);
      ctx.strokeStyle = colour;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 1.4;

      // horizontals
      for (let i = 0; i < ROWS; i++) {
        const p = ((i + offset) % ROWS) / ROWS;
        const y = height * p * p;
        if (y < 1) continue;
        ctx.beginPath();
        ctx.moveTo(-40, y);
        ctx.lineTo(width + 40, y);
        ctx.stroke();
      }

      // verticals, all converging on the vanishing point
      const vp = width / 2;
      for (let i = -COLS; i <= COLS; i++) {
        const xBottom = vp + i * 150;
        ctx.beginPath();
        ctx.moveTo(vp, 0);
        ctx.lineTo(xBottom, height);
        ctx.stroke();
      }
      ctx.restore();
    };

    const frame = () => {
      offset = (offset + speedRef.current * 0.045) % ROWS;
      ctx.clearRect(0, 0, width, height);

      // ground haze, so the lines sit in something rather than on nothing
      const g = ctx.createLinearGradient(0, 0, 0, height);
      g.addColorStop(0, "rgba(120, 20, 90, 0.55)");
      g.addColorStop(0.35, "rgba(40, 6, 48, 0.5)");
      g.addColorStop(1, "rgba(10, 2, 20, 0.75)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);

      const c = chromaRef.current;
      ctx.globalCompositeOperation = "lighter";
      if (c > 0.05) {
        pass(-c * 3, "#ff0080", 0.55);
        pass(c * 3, "#00f0ff", 0.55);
      }
      pass(0, "#ff8ce0", 0.85);
      ctx.globalCompositeOperation = "source-over";

      // the horizon itself, blown out
      const h = ctx.createLinearGradient(0, 0, 0, 26);
      h.addColorStop(0, "rgba(255, 200, 240, 0.85)");
      h.addColorStop(1, "rgba(255, 100, 180, 0)");
      ctx.fillStyle = h;
      ctx.fillRect(0, 0, width, 26);

      raf = requestAnimationFrame(frame);
    };
    frame();
    return () => cancelAnimationFrame(raf);
  }, [width, height]);

  return <canvas ref={ref} className={styles.grid} style={{ width, height }} />;
}
