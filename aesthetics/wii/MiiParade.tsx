"use client";

import { useEffect, useRef } from "react";

/**
 * The Mii Parade tile — heads wandering across the screen, forever.
 *
 * Drawn on canvas rather than as DOM so a dozen of them animating in a 284x130 box
 * costs one paint instead of a dozen composited layers. They walk at their own
 * speeds, bob out of phase, blink independently and wrap around; the only rule is
 * that the tile must never look like a still image, because that is what makes a
 * console menu feel switched on.
 */

interface Mii {
  x: number;
  y: number;
  speed: number;
  phase: number;
  scale: number;
  skin: string;
  hair: string;
  shirt: string;
  /** Frames until the next blink. */
  blink: number;
  brow: number;
}

const SKIN = ["#f5cfa8", "#e8b98a", "#c98d5f", "#8d5a35", "#fbe0c4"];
const HAIR = ["#3a2a22", "#111111", "#8a5a2b", "#d8b25c", "#5a3f33", "#6d6d75"];
const SHIRT = ["#e0574f", "#3f8fd6", "#5cb85c", "#f0b429", "#8b6fd0", "#ffffff"];

const pick = <T,>(a: T[]) => a[(Math.random() * a.length) | 0];

export function MiiParade({ width = 284, height = 130 }: { width?: number; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const miis: Mii[] = Array.from({ length: 9 }, () => ({
      x: Math.random() * width,
      y: 52 + Math.random() * 54,
      speed: 0.16 + Math.random() * 0.34,
      phase: Math.random() * Math.PI * 2,
      scale: 0.7 + Math.random() * 0.5,
      skin: pick(SKIN),
      hair: pick(HAIR),
      shirt: pick(SHIRT),
      blink: 60 + ((Math.random() * 260) | 0),
      brow: Math.random() < 0.5 ? -1 : 1,
    }));
    // Farthest away first, so the near ones overlap correctly.
    miis.sort((a, b) => a.scale - b.scale);

    let raf = 0;
    let t = 0;

    const drawMii = (m: Mii) => {
      const s = m.scale;
      const bob = Math.sin(t * 0.09 * (0.7 + m.speed) + m.phase) * 1.8 * s;
      const lean = Math.sin(t * 0.09 * (0.7 + m.speed) + m.phase) * 0.05;
      ctx.save();
      ctx.translate(m.x, m.y + bob);
      ctx.rotate(lean);
      ctx.scale(s, s);

      // shadow on the ground
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = "#33505f";
      ctx.beginPath();
      ctx.ellipse(0, 30, 15, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // body
      ctx.fillStyle = m.shirt;
      ctx.beginPath();
      ctx.moveTo(-11, 30);
      ctx.quadraticCurveTo(-13, 12, 0, 11);
      ctx.quadraticCurveTo(13, 12, 11, 30);
      ctx.closePath();
      ctx.fill();

      // head
      ctx.fillStyle = m.skin;
      ctx.beginPath();
      ctx.ellipse(0, -3, 15, 17, 0, 0, Math.PI * 2);
      ctx.fill();

      // hair cap
      ctx.fillStyle = m.hair;
      ctx.beginPath();
      ctx.ellipse(0, -8, 15.4, 13, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(-15.4, -9, 3.6, 9);
      ctx.fillRect(11.8, -9, 3.6, 9);

      // eyes — a blink is two frames of a flat line, which is all it takes
      const blinking = m.blink < 6;
      ctx.fillStyle = "#22242a";
      if (blinking) {
        ctx.fillRect(-8.5, -2.5, 5, 1.4);
        ctx.fillRect(3.5, -2.5, 5, 1.4);
      } else {
        ctx.beginPath();
        ctx.ellipse(-6, -2, 2.1, 2.7, 0, 0, Math.PI * 2);
        ctx.ellipse(6, -2, 2.1, 2.7, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // brows carry the whole personality at this size
      ctx.strokeStyle = m.hair;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-9, -7 + m.brow);
      ctx.lineTo(-3, -8 - m.brow);
      ctx.moveTo(3, -8 - m.brow);
      ctx.lineTo(9, -7 + m.brow);
      ctx.stroke();

      // mouth
      ctx.strokeStyle = "#a4544b";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, 4, 4, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();

      ctx.restore();
    };

    const frame = () => {
      t += 1;
      ctx.clearRect(0, 0, width, height);

      // Sky: the Mii Plaza's pale blue, lit from the top.
      const g = ctx.createLinearGradient(0, 0, 0, height);
      g.addColorStop(0, "#dff1fb");
      g.addColorStop(0.62, "#f4fbff");
      g.addColorStop(1, "#e6f2f7");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);

      for (const m of miis) {
        m.x += m.speed;
        if (m.x > width + 24) m.x = -24;
        m.blink -= 1;
        if (m.blink < -2) m.blink = 90 + ((Math.random() * 280) | 0);
        drawMii(m);
      }

      raf = requestAnimationFrame(frame);
    };
    frame();
    return () => cancelAnimationFrame(raf);
  }, [width, height]);

  return <canvas ref={ref} style={{ width, height, display: "block" }} />;
}
