"use client";

import { useEffect, useRef } from "react";
import styles from "./styles.module.css";

/**
 * Toon water.
 *
 * The whole effect is that the caustics are BANDED with hard edges — three flat
 * steps of turquoise, no anti-aliasing between them and no gradient anywhere. A
 * smooth sine surface reads as a modern water shader; the hard step is what makes it
 * 2002.
 *
 * Drawn as horizontal scanlines rather than as shapes: for each row, evaluate two
 * summed sines, quantise the result to three levels and fill. It's one pass over 440
 * rows and it gives real interference patterns for free.
 */

const LEVELS = ["#0e8fa8", "#23c9d8", "#7fe8f2"];

export function Sea({
  night,
  width = 1600,
  height = 440,
}: {
  night: boolean;
  width?: number;
  height?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const nightRef = useRef(night);
  nightRef.current = night;

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    // Half resolution, scaled up: the bands should be chunky, and this halves the work.
    const W = width / 2;
    const H = height / 2;
    canvas.width = W;
    canvas.height = H;

    let raf = 0;
    let t = 0;

    const frame = () => {
      t += 0.02;
      for (let y = 0; y < H; y++) {
        // Perspective: rows near the horizon are compressed, so the wavelength
        // shortens with distance the way a real sea does.
        const depth = y / H;
        const scale = 0.06 + depth * 0.12;
        for (let x = 0; x < W; x += 2) {
          const v =
            Math.sin(x * scale + t * 2 + y * 0.09) +
            Math.sin(x * scale * 0.6 - t * 1.3 + y * 0.16) * 0.7;
          // Three flat steps. The hard boundary is the entire point.
          const level = v > 0.85 ? 2 : v > -0.2 ? 1 : 0;
          ctx.fillStyle = LEVELS[level];
          ctx.fillRect(x, y, 2, 1);
        }
      }

      // Foam along the shoreline, also banded.
      ctx.fillStyle = "#ffffff";
      for (let x = 0; x < W; x += 2) {
        const edge = H - 6 - Math.sin(x * 0.05 + t * 1.6) * 4 - Math.sin(x * 0.13 - t) * 3;
        ctx.fillRect(x, edge, 2, H - edge);
      }

      raf = requestAnimationFrame(frame);
    };
    frame();
    return () => cancelAnimationFrame(raf);
  }, [width, height]);

  return (
    <canvas
      ref={ref}
      className={styles.sea}
      style={{ width, height, imageRendering: "pixelated" }}
    />
  );
}
