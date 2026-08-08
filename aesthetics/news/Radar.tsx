"use client";

import { useEffect, useRef } from "react";
import styles from "./styles.module.css";

/**
 * The doppler radar wall.
 *
 * Scrubbable, which means the storm cannot be random — every cell's position is a
 * pure function of the frame index, so dragging the timeline backwards shows you
 * exactly the weather you already saw. A radar loop you can't rewind is just an
 * animation.
 *
 * Reflectivity is drawn as three nested blobs per cell (green, then amber, then red
 * cores) rather than as a gradient, because that is how a real NEXRAD product
 * quantises: hard bands at fixed dBZ thresholds, no smooth falloff.
 */

const CELLS = 9;
const GREEN = "#1f9e3f";
const AMBER = "#e3c520";
const RED = "#cf2020";

/** Deterministic per-cell noise. */
function h(n: number): number {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

export function Radar({
  frame,
  chroma,
  width = 1200,
  height = 900,
}: {
  /** 0..47 — the scrub position. */
  frame: number;
  /** Chroma-key mode: the map is replaced by flat key green. */
  chroma: boolean;
  width?: number;
  height?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (chroma) {
      ctx.fillStyle = "#00b140";
      ctx.fillRect(0, 0, width, height);
      return;
    }

    // ground
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, "#0a2340");
    sky.addColorStop(1, "#04111f");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    // A coastline and a county grid. Invented, but consistently invented.
    ctx.beginPath();
    ctx.moveTo(width, 120);
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const x = width - 120 - Math.sin(t * 3.1 + 0.6) * 130 - t * 190;
      const y = 120 + t * (height - 240);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height - 120);
    ctx.closePath();
    ctx.fillStyle = "#0d3a5c";
    ctx.fill();

    ctx.strokeStyle = "rgba(120,170,210,0.32)";
    ctx.lineWidth = 1;
    for (let x = 100; x < width; x += 150) {
      ctx.beginPath();
      ctx.moveTo(x, 60);
      ctx.lineTo(x, height - 60);
      ctx.stroke();
    }
    for (let y = 120; y < height - 60; y += 130) {
      ctx.beginPath();
      ctx.moveTo(60, y);
      ctx.lineTo(width - 60, y);
      ctx.stroke();
    }

    // storm cells: everything derived from `frame`, nothing from Math.random
    const blob = (cx: number, cy: number, r: number, colour: string) => {
      ctx.fillStyle = colour;
      ctx.beginPath();
      for (let a = 0; a <= 24; a++) {
        const th = (a / 24) * Math.PI * 2;
        const wob = 0.72 + h(cx * 0.13 + a) * 0.6;
        const px = cx + Math.cos(th) * r * wob;
        const py = cy + Math.sin(th) * r * wob * 0.8;
        if (a === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    };

    ctx.globalAlpha = 0.86;
    for (let i = 0; i < CELLS; i++) {
      const drift = frame * (5 + h(i) * 7);
      const cx = ((h(i * 3) * width + drift) % (width + 320)) - 160;
      const cy = 150 + h(i * 7) * (height - 380) + Math.sin(frame * 0.1 + i) * 26;
      const grow = 0.7 + 0.5 * Math.sin(frame * 0.13 + i * 1.7);
      const r = (48 + h(i * 11) * 66) * grow;
      blob(cx, cy, r, GREEN);
      blob(cx + 6, cy - 4, r * 0.62, AMBER);
      if (h(i * 13) > 0.45) blob(cx + 10, cy - 8, r * 0.3, RED);
    }
    ctx.globalAlpha = 1;

    // sweep arm, so it reads as radar rather than as a painting of weather
    const ang = (frame / 48) * Math.PI * 2;
    const sweep = ctx.createLinearGradient(
      width * 0.62, height * 0.5,
      width * 0.62 + Math.cos(ang) * 600, height * 0.5 + Math.sin(ang) * 600,
    );
    sweep.addColorStop(0, "rgba(140,255,190,0.30)");
    sweep.addColorStop(1, "rgba(140,255,190,0)");
    ctx.strokeStyle = sweep;
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.moveTo(width * 0.62, height * 0.5);
    ctx.lineTo(width * 0.62 + Math.cos(ang) * 600, height * 0.5 + Math.sin(ang) * 600);
    ctx.stroke();
  }, [frame, chroma, width, height]);

  return <canvas ref={ref} className={styles.radar} />;
}
