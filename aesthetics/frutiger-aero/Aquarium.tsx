"use client";

import { useEffect, useImperativeHandle, useRef, type RefObject } from "react";
import { pop as popSound } from "@/lib/audio";

/**
 * The living half of the page: caustics, fish and bubbles, on one canvas.
 *
 * All three share a single rAF loop deliberately. Three components each running their
 * own loop would triple the layout/paint churn behind a full-screen backdrop-filter,
 * which is the most expensive thing on this page by a wide margin.
 *
 * Canvas sits BEHIND the glass, so bubbles and fish are refracted by the panels
 * rather than drawn over them — which is the entire reason the glass reads as glass.
 */

export interface AquariumHandle {
  /** Spawn a burst of bubbles at a canvas-space point. */
  burst: (x: number, y: number, count?: number) => void;
  /** Tell the sim where the cursor is, in canvas space. */
  setPointer: (x: number, y: number) => void;
  /** Push a ripple into the water surface. */
  ripple: (x: number, y: number) => void;
}

interface Bubble {
  x: number;
  y: number;
  r: number;
  vy: number;
  drift: number;
  phase: number;
  alive: boolean;
}

interface Fish {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  hue: number;
  wob: number;
}

interface Ripple {
  x: number;
  y: number;
  r: number;
  life: number;
}

const AMBIENT_BUBBLES = 26;
const FISH_COUNT = 14;
const MAX_BUBBLES = 130;

export function Aquarium({
  width,
  height,
  horizon,
  handleRef,
  fishEnabled,
  causticsEnabled,
}: {
  width: number;
  height: number;
  horizon: number;
  handleRef: RefObject<AquariumHandle | null>;
  fishEnabled: boolean;
  causticsEnabled: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const bubbles = useRef<Bubble[]>([]);
  const fish = useRef<Fish[]>([]);
  const ripples = useRef<Ripple[]>([]);
  const pointer = useRef({ x: -999, y: -999 });
  const rafRef = useRef(0);

  // Live flags, so toggling them doesn't tear down and restart the whole sim.
  const flags = useRef({ fish: fishEnabled, caustics: causticsEnabled });
  flags.current = { fish: fishEnabled, caustics: causticsEnabled };

  const spawnBubble = (x: number, y: number, big = false): Bubble => ({
    x,
    y,
    r: big ? 7 + Math.random() * 17 : 3 + Math.random() * 9,
    vy: -(0.35 + Math.random() * 0.9) * (big ? 1.25 : 1),
    drift: (Math.random() - 0.5) * 0.42,
    phase: Math.random() * Math.PI * 2,
    alive: true,
  });

  useImperativeHandle(handleRef, () => ({
    burst(x, y, count = 9) {
      for (let i = 0; i < count; i++) {
        const b = spawnBubble(
          x + (Math.random() - 0.5) * 46,
          y + (Math.random() - 0.5) * 26,
          true,
        );
        bubbles.current.push(b);
      }
      if (bubbles.current.length > MAX_BUBBLES) {
        bubbles.current.splice(0, bubbles.current.length - MAX_BUBBLES);
      }
    },
    setPointer(x, y) {
      pointer.current = { x, y };
    },
    ripple(x, y) {
      ripples.current.push({ x, y, r: 4, life: 1 });
      if (ripples.current.length > 24) ripples.current.shift();
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    // The canvas is inside the scaled stage, so its backing store is authored at
    // canvas resolution; CanvasStage's transform handles the rest. Bumping by DPR
    // here would double-scale it.
    canvas.width = width;
    canvas.height = height;

    bubbles.current = Array.from({ length: AMBIENT_BUBBLES }, () =>
      spawnBubble(Math.random() * width, horizon + Math.random() * (height - horizon)),
    );

    fish.current = Array.from({ length: FISH_COUNT }, () => ({
      x: Math.random() * width,
      y: horizon + 40 + Math.random() * (height - horizon - 80),
      vx: (Math.random() - 0.5) * 1.6,
      vy: (Math.random() - 0.5) * 0.5,
      size: 9 + Math.random() * 15,
      hue: 24 + Math.random() * 40,
      wob: Math.random() * Math.PI * 2,
    }));

    let t = 0;

    const drawFish = (f: Fish) => {
      const dir = Math.sign(f.vx) || 1;
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.scale(dir, 1);
      ctx.rotate(Math.sin(f.wob) * 0.12);

      ctx.fillStyle = `hsla(${f.hue}, 95%, 62%, .88)`;
      ctx.beginPath();
      ctx.ellipse(0, 0, f.size, f.size * 0.52, 0, 0, Math.PI * 2);
      ctx.fill();

      // tail, flicking with the body wobble
      ctx.beginPath();
      ctx.moveTo(-f.size * 0.85, 0);
      ctx.lineTo(-f.size * 1.7, -f.size * 0.5 + Math.sin(f.wob * 2) * f.size * 0.2);
      ctx.lineTo(-f.size * 1.7, f.size * 0.5 + Math.sin(f.wob * 2) * f.size * 0.2);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "rgba(255,255,255,.55)";
      ctx.beginPath();
      ctx.ellipse(f.size * 0.2, -f.size * 0.18, f.size * 0.5, f.size * 0.16, -0.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(4,30,54,.9)";
      ctx.beginPath();
      ctx.arc(f.size * 0.55, -f.size * 0.1, f.size * 0.11, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    const drawBubble = (b: Bubble) => {
      const g = ctx.createRadialGradient(
        b.x - b.r * 0.35,
        b.y - b.r * 0.4,
        b.r * 0.06,
        b.x,
        b.y,
        b.r,
      );
      g.addColorStop(0, "rgba(255,255,255,.92)");
      g.addColorStop(0.35, "rgba(210,244,255,.24)");
      g.addColorStop(0.82, "rgba(150,220,255,.12)");
      g.addColorStop(1, "rgba(255,255,255,.42)");

      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();

      ctx.strokeStyle = "rgba(255,255,255,.5)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // the tiny hard highlight that sells it as a sphere
      ctx.beginPath();
      ctx.arc(b.x - b.r * 0.34, b.y - b.r * 0.38, Math.max(b.r * 0.17, 0.8), 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,.95)";
      ctx.fill();
    };

    const frame = () => {
      t += 1;
      ctx.clearRect(0, 0, width, height);

      // --- caustics: crossing sine bands, only under the waterline ---
      if (flags.current.caustics) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, horizon, width, height - horizon);
        ctx.clip();
        ctx.globalCompositeOperation = "screen";
        for (let i = 0; i < 5; i++) {
          const y = horizon + 30 + i * 82 + Math.sin(t * 0.011 + i) * 16;
          const g = ctx.createLinearGradient(0, y - 46, 0, y + 46);
          g.addColorStop(0, "rgba(150,235,255,0)");
          g.addColorStop(0.5, `rgba(170,240,255,${0.09 - i * 0.012})`);
          g.addColorStop(1, "rgba(150,235,255,0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(0, y);
          for (let x = 0; x <= width; x += 24) {
            ctx.lineTo(x, y + Math.sin(x * 0.006 + t * 0.017 + i * 1.7) * 22);
          }
          ctx.lineTo(width, y + 60);
          ctx.lineTo(0, y + 60);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      // --- fish ---
      if (flags.current.fish) {
        const p = pointer.current;
        const chasing = p.y > horizon;
        for (const f of fish.current) {
          f.wob += 0.11;

          if (chasing) {
            const dx = p.x - f.x;
            const dy = p.y - f.y;
            const d = Math.hypot(dx, dy);
            if (d < 300 && d > 1) {
              // Curious at range, startled up close — the scatter is what makes them
              // feel alive rather than magnetic.
              const pull = d < 90 ? -0.055 : 0.02;
              f.vx += (dx / d) * pull;
              f.vy += (dy / d) * pull;
            }
          }

          f.vx += (Math.random() - 0.5) * 0.06;
          f.vy += (Math.random() - 0.5) * 0.04;

          const speed = Math.hypot(f.vx, f.vy);
          const max = 2.4;
          if (speed > max) {
            f.vx = (f.vx / speed) * max;
            f.vy = (f.vy / speed) * max;
          }
          if (speed < 0.35) f.vx += f.vx >= 0 ? 0.06 : -0.06;

          f.x += f.vx;
          f.y += f.vy;

          if (f.x < -60) f.x = width + 60;
          if (f.x > width + 60) f.x = -60;
          // Keep them in the water, and turn them away from the boundaries softly.
          if (f.y < horizon + 28) f.vy += 0.05;
          if (f.y > height - 34) f.vy -= 0.05;

          drawFish(f);
        }
      }

      // --- bubbles ---
      const p = pointer.current;
      for (const b of bubbles.current) {
        if (!b.alive) continue;
        b.phase += 0.045;
        b.y += b.vy;
        b.x += Math.sin(b.phase) * b.drift;

        // Popped by the cursor.
        if (Math.hypot(b.x - p.x, b.y - p.y) < b.r + 7) {
          b.alive = false;
          ripples.current.push({ x: b.x, y: b.y, r: b.r, life: 1 });
          popSound(0.7 + Math.random() * 0.7);
          continue;
        }

        // Reaching the surface pops it too.
        if (b.y + b.r < horizon) {
          b.alive = false;
          ripples.current.push({ x: b.x, y: horizon, r: b.r * 1.4, life: 1 });
          continue;
        }

        drawBubble(b);
      }

      bubbles.current = bubbles.current.filter((b) => b.alive);
      while (bubbles.current.length < AMBIENT_BUBBLES) {
        bubbles.current.push(
          spawnBubble(Math.random() * width, height + Math.random() * 40),
        );
      }

      // --- ripples ---
      for (const r of ripples.current) {
        r.r += 2.4;
        r.life -= 0.028;
        if (r.life <= 0) continue;
        ctx.beginPath();
        ctx.ellipse(r.x, r.y, r.r, r.r * 0.34, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(235,252,255,${r.life * 0.62})`;
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
      ripples.current = ripples.current.filter((r) => r.life > 0);

      rafRef.current = requestAnimationFrame(frame);
    };

    frame();
    return () => cancelAnimationFrame(rafRef.current);
  }, [width, height, horizon, handleRef]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    />
  );
}
