"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Wireframe mountains — the 1986 render-farm version of a landscape, which is the
 * one thing in vaporwave that was ALWAYS computer graphics.
 *
 * A heightfield flown over: rows are drawn far → near, each row's polygon filled with
 * night before its line is stroked, so nearer ridges genuinely occlude farther ones
 * (painter's algorithm — which is also exactly how it was done at the time). The
 * valley stays flat down the middle so the road/grid reads through it. The kick drum
 * flashes the lines (`pulse` ref, decays per frame).
 */

const COLS = 64;
const ROWS = 34;

function hgt(x: number, z: number): number {
  return (
    Math.sin(x * 0.9 + z * 0.35) * 0.5 +
    Math.sin(x * 2.3 - z * 0.8) * 0.28 +
    Math.sin(x * 5.1 + z * 1.7) * 0.12 +
    Math.sin(z * 0.23 + x * 0.3) * 0.4 +
    1
  );
}

/** What the control panel can turn. Read every frame, so nothing restarts. */
export interface Terrain {
  /** ridge height, 0 flat – 2 alpine */
  amp: number;
  /** how fast you fly over it */
  speed: number;
  /** how broken the ground is */
  rough: number;
  /** hue of the ridge lines and of the cross-hatching */
  ridge: number;
  cross: number;
  /** what the hills are filled with: the night behind the lines */
  fill: string;
  /** whether the kick drum flashes the lines */
  flash: boolean;
}

export function Mountains({
  width,
  height,
  horizon,
  speed,
  pulse,
  terrain,
}: {
  width: number;
  height: number;
  horizon: number;
  speed: RefObject<number>;
  pulse: RefObject<number>;
  terrain: RefObject<Terrain>;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    let raf = 0;
    let travel = 0;
    const F = 520;
    const camH = 0.9;
    const cx = width / 2;

    const frame = () => {
      const tr = terrain.current;
      travel += (speed.current ?? 1) * 0.02 * tr.speed;
      const raw = pulse.current ?? 0;
      (pulse as { current: number }).current = raw * 0.9;
      const pl = tr.flash ? raw : 0;
      const k = 0.5 * tr.rough;
      const lift = 3.2 * tr.amp;
      ctx.clearRect(0, 0, width, height);
      const dz = travel % 1;

      for (let r = ROWS; r >= 1; r--) {
        const z = r - dz + 0.6;
        const worldZ = r + Math.floor(travel);
        const pts: [number, number][] = [];
        for (let i = 0; i <= COLS; i++) {
          const x = (i / COLS - 0.5) * 26;
          const valley = Math.min(1, Math.max(0, (Math.abs(x) - 1.6) / 4.5));
          const h = hgt(x * k, worldZ * k) * valley * valley * lift;
          const sx = cx + (x / z) * F;
          const sy = horizon + ((camH - h) / z) * F * 0.55;
          pts.push([sx, sy]);
        }
        const fade = 1 - r / ROWS;
        // fill to occlude what's behind
        ctx.beginPath();
        ctx.moveTo(pts[0][0], height);
        for (const [x, y] of pts) ctx.lineTo(x, y);
        ctx.lineTo(pts[pts.length - 1][0], height);
        ctx.closePath();
        ctx.fillStyle = tr.fill;
        ctx.fill();
        // the ridge line
        ctx.beginPath();
        pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.strokeStyle = `hsla(${tr.ridge}, 100%, ${62 + pl * 26}%, ${0.15 + fade * 0.75})`;
        ctx.lineWidth = 1 + fade * 0.8;
        ctx.shadowColor = `hsl(${tr.ridge}, 100%, 62%)`;
        ctx.shadowBlur = 6 + pl * 14;
        ctx.stroke();
        ctx.shadowBlur = 0;
        // cross-hatching: the columns, every other one, between this row and the next
        if (r < ROWS) {
          const zN = r + 1 - dz + 0.6;
          const worldN = r + 1 + Math.floor(travel);
          ctx.strokeStyle = `hsla(${tr.cross}, 100%, 55%, ${0.08 + fade * 0.45 + pl * 0.2})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          for (let i = 0; i <= COLS; i += 2) {
            const x = (i / COLS - 0.5) * 26;
            const valley = Math.min(1, Math.max(0, (Math.abs(x) - 1.6) / 4.5));
            if (valley <= 0) continue;
            const hN = hgt(x * k, worldN * k) * valley * valley * lift;
            ctx.moveTo(pts[i][0], pts[i][1]);
            ctx.lineTo(cx + (x / zN) * F, horizon + ((camH - hN) / zN) * F * 0.55);
          }
          ctx.stroke();
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [width, height, horizon, speed, pulse, terrain]);

  return <canvas ref={ref} width={width} height={height} style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }} />;
}
