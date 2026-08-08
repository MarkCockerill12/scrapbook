"use client";

import { useEffect, useRef } from "react";

/**
 * Rotating wireframe globe with target pings.
 *
 * Drawn rather than modelled — a real 3D globe here would pull in three.js for
 * something that is, honestly, a decoration. Latitude rings are ellipses whose height
 * is the cosine of their latitude; longitude lines are ellipses whose *width* is the
 * cosine of their rotated angle. That's enough to read as a sphere.
 *
 * Lines on the far side are drawn dimmer, which is what actually sells the depth.
 */
export function WireGlobe({ size }: { size: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    canvas.width = size;
    canvas.height = size;

    const cx = size / 2;
    const cy = size / 2;
    const r = size * 0.37;

    const pings = Array.from({ length: 7 }, () => ({
      lat: (Math.random() - 0.5) * Math.PI * 0.8,
      lon: Math.random() * Math.PI * 2,
      t: Math.random(),
    }));

    let spin = 0;

    const tick = () => {
      spin += 0.006;
      ctx.clearRect(0, 0, size, size);

      // limb
      ctx.strokeStyle = "rgba(0,255,65,.55)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      // latitude rings
      for (let i = -4; i <= 4; i++) {
        const lat = (i / 5) * (Math.PI / 2);
        const ry = Math.abs(Math.sin(lat)) * r * 0.34 + 1;
        const rx = Math.cos(lat) * r;
        const y = cy - Math.sin(lat) * r * 0.78;
        ctx.strokeStyle = `rgba(0,255,65,${0.1 + 0.14 * Math.cos(lat)})`;
        ctx.beginPath();
        ctx.ellipse(cx, y, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // longitude lines — width tracks cos of the rotated angle, and the half facing
      // away is drawn fainter
      for (let i = 0; i < 12; i++) {
        const a = spin + (i / 12) * Math.PI * 2;
        const rx = Math.abs(Math.cos(a)) * r;
        const facing = Math.cos(a) > 0;
        ctx.strokeStyle = `rgba(0,255,65,${facing ? 0.3 : 0.1})`;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, r, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // pings
      for (const p of pings) {
        p.t += 0.006;
        if (p.t > 1) p.t = 0;

        const a = p.lon + spin;
        const x = cx + Math.cos(a) * Math.cos(p.lat) * r;
        const y = cy - Math.sin(p.lat) * r * 0.78;
        const front = Math.sin(a) > 0;

        ctx.fillStyle = front ? "rgba(217,255,228,.95)" : "rgba(0,255,65,.28)";
        ctx.beginPath();
        ctx.arc(x, y, front ? 2.4 : 1.4, 0, Math.PI * 2);
        ctx.fill();

        if (front) {
          ctx.strokeStyle = `rgba(0,255,65,${(1 - p.t) * 0.7})`;
          ctx.beginPath();
          ctx.arc(x, y, p.t * 22, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    tick();
    return () => cancelAnimationFrame(rafRef.current);
  }, [size]);

  return <canvas ref={canvasRef} width={size} height={size} style={{ display: "block" }} />;
}
