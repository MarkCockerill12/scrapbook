"use client";

import { useEffect, useRef } from "react";
import { tick } from "@/lib/audio";

/**
 * The Galaxy tile — a planetoid you can grab and spin.
 *
 * The sphere is a Fibonacci point lattice rather than a mesh: at this size a
 * stippled surface reads as a rounded body more convincingly than flat-shaded
 * triangles, and it costs one loop with no geometry to carry around.
 *
 * Points are painted back-to-front by depth, sized and dimmed by it, which is the
 * whole trick — the same lattice with uniform dots looks like a flat disc.
 *
 * Spin is angular velocity with drag: throw it and it keeps going, and it never
 * fully stops because a planet that halts looks broken.
 */

const N = 620;
const IDLE_SPIN = 0.0042;

interface Pt {
  x: number;
  y: number;
  z: number;
  land: boolean;
  shade: number;
}

function lattice(): Pt[] {
  const pts: Pt[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const th = golden * i;
    const x = Math.cos(th) * r;
    const z = Math.sin(th) * r;
    // Two bands of "continent" so the spin is legible — a uniform sphere gives no
    // motion cue at all and reads as static.
    const n = Math.sin(th * 1.7) + Math.cos(y * 5.2) + Math.sin((x + z) * 3.1);
    pts.push({ x, y, z, land: n > 0.35, shade: 0.7 + Math.random() * 0.3 });
  }
  return pts;
}

export function GalaxyView({ width = 284, height = 130 }: { width?: number; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const pts = lattice();
    const stars = Array.from({ length: 90 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.1 + 0.2,
      tw: Math.random() * Math.PI * 2,
    }));

    const cx = width * 0.5;
    const cy = height * 0.56;
    const R = 44;

    let yaw = 0;
    let pitch = -0.28;
    let yawVel = IDLE_SPIN;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let tickAcc = 0;
    let t = 0;

    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      yawVel = dx * 0.006;
      yaw += yawVel;
      pitch = Math.max(-1.1, Math.min(1.1, pitch + dy * 0.006));
      tickAcc += Math.abs(dx);
      if (tickAcc > 46) {
        tickAcc = 0;
        tick();
      }
    };
    const onUp = (e: PointerEvent) => {
      dragging = false;
      canvas.releasePointerCapture?.(e.pointerId);
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);

    let raf = 0;
    const frame = () => {
      t += 1;
      if (!dragging) {
        yaw += yawVel;
        // Bleed thrown momentum back down to the idle drift, never to zero.
        yawVel += (IDLE_SPIN - yawVel) * 0.02;
      }

      const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, width * 0.7);
      g.addColorStop(0, "#132a52");
      g.addColorStop(1, "#04060f");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);

      for (const s of stars) {
        const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 0.045 + s.tw));
        ctx.globalAlpha = a;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(s.x, s.y, s.r, s.r);
      }
      ctx.globalAlpha = 1;

      // atmosphere
      const halo = ctx.createRadialGradient(cx, cy, R * 0.8, cx, cy, R * 1.9);
      halo.addColorStop(0, "rgba(90,190,255,0.30)");
      halo.addColorStop(1, "rgba(90,190,255,0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.9, 0, Math.PI * 2);
      ctx.fill();

      const cyw = Math.cos(yaw);
      const syw = Math.sin(yaw);
      const cp = Math.cos(pitch);
      const sp = Math.sin(pitch);

      const projected = pts.map((p) => {
        const x1 = p.x * cyw - p.z * syw;
        const z1 = p.x * syw + p.z * cyw;
        const y2 = p.y * cp - z1 * sp;
        const z2 = p.y * sp + z1 * cp;
        return { sx: cx + x1 * R, sy: cy + y2 * R, z: z2, land: p.land, shade: p.shade };
      });
      projected.sort((a, b) => a.z - b.z);

      for (const p of projected) {
        const depth = (p.z + 1) / 2; // 0 far, 1 near
        const lit = 0.25 + depth * 0.75;
        const size = 0.9 + depth * 1.9;
        ctx.globalAlpha = (0.25 + depth * 0.75) * p.shade;
        ctx.fillStyle = p.land
          ? `rgb(${(70 * lit) | 0},${(190 * lit) | 0},${(110 * lit) | 0})`
          : `rgb(${(38 * lit) | 0},${(110 * lit) | 0},${(205 * lit) | 0})`;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // terminator: a soft shadow on the lower-right, so it reads as lit from somewhere
      const shade = ctx.createRadialGradient(
        cx - R * 0.5,
        cy - R * 0.5,
        R * 0.2,
        cx,
        cy,
        R * 1.15,
      );
      shade.addColorStop(0, "rgba(255,255,255,0.10)");
      shade.addColorStop(0.6, "rgba(0,0,0,0)");
      shade.addColorStop(1, "rgba(0,0,10,0.55)");
      ctx.fillStyle = shade;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.15, 0, Math.PI * 2);
      ctx.fill();

      raf = requestAnimationFrame(frame);
    };
    frame();

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
  }, [width, height]);

  return (
    <canvas
      ref={ref}
      style={{ width, height, display: "block", touchAction: "none" }}
    />
  );
}
