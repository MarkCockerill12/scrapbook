"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { pop } from "@/lib/audio";

/**
 * Bubbles, two ways, on one canvas above the desktop (pointer-events: none — a
 * full-bleed overlay must never swallow clicks; TECHNICAL_SPECS gotcha #3).
 *
 *  - Click bursts: small bubbles that wobble upward and pop when the cursor touches.
 *  - The screen saver: Vista's "Bubbles" — big thin-film spheres drifting and
 *    bouncing off the screen edges and each other, over the live desktop.
 *
 * Thin film is drawn as a hue-rotating rim on a mostly transparent sphere, plus
 * the two specular windows every photographed soap bubble has.
 */

export interface BubblesHandle {
  burst: (x: number, y: number, n?: number) => void;
  pointer: (x: number, y: number) => void;
}

interface B {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  hue: number;
  phase: number;
  big: boolean;
  life: number;
}

export const Bubbles = forwardRef<BubblesHandle, { saver: boolean; width: number; height: number }>(
  function Bubbles({ saver, width, height }, ref) {
    const canvas = useRef<HTMLCanvasElement>(null);
    const list = useRef<B[]>([]);
    const ptr = useRef({ x: -999, y: -999 });

    useImperativeHandle(ref, () => ({
      burst(x, y, n = 14) {
        for (let i = 0; i < n; i++) {
          list.current.push({
            x: x + (Math.random() - 0.5) * 30,
            y: y + (Math.random() - 0.5) * 20,
            r: 5 + Math.random() * 16,
            vx: (Math.random() - 0.5) * 1.2,
            vy: -0.6 - Math.random() * 1.6,
            hue: Math.random() * 360,
            phase: Math.random() * 6,
            big: false,
            life: 1,
          });
        }
        if (list.current.length > 220) list.current.splice(0, list.current.length - 220);
      },
      pointer(x, y) {
        ptr.current = { x, y };
      },
    }));

    // Seed / clear the screen saver population.
    useEffect(() => {
      list.current = list.current.filter((b) => !b.big);
      if (!saver) return;
      for (let i = 0; i < 16; i++) {
        const r = 50 + Math.random() * 90;
        list.current.push({
          x: r + Math.random() * (width - r * 2),
          y: r + Math.random() * (height - r * 2),
          r,
          vx: (Math.random() - 0.5) * 2.4,
          vy: (Math.random() - 0.5) * 2.4,
          hue: Math.random() * 360,
          phase: Math.random() * 6,
          big: true,
          life: 1,
        });
      }
    }, [saver, width, height]);

    useEffect(() => {
      const c = canvas.current;
      const ctx = c?.getContext("2d");
      if (!c || !ctx) return;
      let raf = 0;

      const drawBubble = (b: B, t: number) => {
        const { x, y, r } = b;
        ctx.save();
        ctx.globalAlpha = b.life;
        // body: nearly clear, a little darker at the rim
        const body = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
        body.addColorStop(0, "rgba(255,255,255,0.02)");
        body.addColorStop(0.82, "rgba(200,240,255,0.08)");
        body.addColorStop(1, "rgba(255,255,255,0.45)");
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        // thin-film rim — three hue bands chasing each other round the edge
        ctx.lineWidth = Math.max(1.2, r * 0.07);
        for (let k = 0; k < 3; k++) {
          const a0 = t * 0.0006 + b.phase + (k * Math.PI * 2) / 3;
          ctx.strokeStyle = `hsla(${(b.hue + k * 110 + t * 0.03) % 360}, 95%, 65%, 0.55)`;
          ctx.beginPath();
          ctx.arc(x, y, r * 0.93, a0, a0 + 1.6);
          ctx.stroke();
        }
        // specular windows
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.beginPath();
        ctx.ellipse(x - r * 0.38, y - r * 0.42, r * 0.22, r * 0.12, -0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.beginPath();
        ctx.ellipse(x + r * 0.45, y + r * 0.45, r * 0.1, r * 0.05, -0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };

      const step = (t: number) => {
        ctx.clearRect(0, 0, width, height);
        const L = list.current;
        const p = ptr.current;
        for (let i = L.length - 1; i >= 0; i--) {
          const b = L[i];
          if (b.big) {
            b.x += b.vx;
            b.y += b.vy;
            if (b.x < b.r || b.x > width - b.r) b.vx *= -1;
            if (b.y < b.r || b.y > height - b.r) b.vy *= -1;
            for (let j = i - 1; j >= 0; j--) {
              const o = L[j];
              if (!o.big) continue;
              const dx = o.x - b.x;
              const dy = o.y - b.y;
              const d = Math.hypot(dx, dy);
              if (d < b.r + o.r && d > 0) {
                const nx = dx / d;
                const ny = dy / d;
                const rel = (b.vx - o.vx) * nx + (b.vy - o.vy) * ny;
                if (rel > 0) {
                  b.vx -= rel * nx;
                  b.vy -= rel * ny;
                  o.vx += rel * nx;
                  o.vy += rel * ny;
                }
              }
            }
          } else {
            b.phase += 0.05;
            b.x += b.vx + Math.sin(b.phase) * 0.4;
            b.y += b.vy;
            b.vy *= 0.995;
            if (Math.hypot(p.x - b.x, p.y - b.y) < b.r + 6 || b.y < -40) {
              if (b.y > -40) pop(0.8 + (20 - b.r) / 20);
              L.splice(i, 1);
              continue;
            }
          }
          drawBubble(b, t);
        }
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
      return () => cancelAnimationFrame(raf);
    }, [width, height]);

    return (
      <canvas
        ref={canvas}
        width={width}
        height={height}
        style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: saver ? 9000 : 800 }}
      />
    );
  },
);
