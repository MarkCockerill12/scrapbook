"use client";

import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { img } from "@/lib/assets";
import { Draggable } from "@/primitives/Draggable";
import type { Card } from "./data";
import styles from "./styles.module.css";

const A = "game-beach";
const W = 250;
const H = 176;

/**
 * One postcard on the sand: a real screenshot, a white border, a handwritten caption
 * and, sometimes, Shadow Mario's paint goop all over it. With FLUDD on, hold the mouse
 * and sweep over the goop to wash it off (canvas, destination-out).
 */
export function Postcard({
  card,
  x,
  y,
  rot,
  fludd,
  onOpen,
  onClean,
  onSpray,
}: {
  card: Card;
  x: number;
  y: number;
  rot: number;
  fludd: boolean;
  onOpen: () => void;
  onClean: () => void;
  onSpray: (clientX: number, clientY: number) => void;
}) {
  const goop = useRef<HTMLCanvasElement>(null);
  const last = useRef({ x, y });
  const cleaned = useRef(false);

  useEffect(() => {
    if (!card.goop) return;
    const c = goop.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    // Seeded blobs so the goop is the same shape every visit.
    let seed = card.id.length * 97;
    const r = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const cols = ["#6b3a12", "#8a4a1c", "#c1591e", "#9a4a14", "#7a3b12"];
    for (let i = 0; i < 26; i++) {
      const cx = r() * W;
      const cy = r() * H;
      const rad = 14 + r() * 38;
      const g = ctx.createRadialGradient(cx - rad * 0.3, cy - rad * 0.3, rad * 0.1, cx, cy, rad);
      const col = cols[Math.floor(r() * cols.length)];
      g.addColorStop(0, "rgba(255,210,150,0.9)");
      g.addColorStop(0.18, col);
      g.addColorStop(1, col);
      ctx.fillStyle = g;
      ctx.beginPath();
      for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.4) {
        const rr = rad * (0.75 + r() * 0.4);
        ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      }
      ctx.fill();
    }
  }, [card]);

  const scrub = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!fludd || e.buttons !== 1) return;
    onSpray(e.clientX, e.clientY);
    const c = goop.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx || cleaned.current) return;
    const rect = c.getBoundingClientRect();
    const lx = ((e.clientX - rect.left) / rect.width) * W;
    const ly = ((e.clientY - rect.top) / rect.height) * H;
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(lx, ly, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    // Clean enough? Sample the alpha on a coarse grid.
    const data = ctx.getImageData(0, 0, W, H).data;
    let left = 0;
    for (let i = 3; i < data.length; i += 4 * 97) if (data[i] > 40) left++;
    if (left < 6) {
      cleaned.current = true;
      ctx.clearRect(0, 0, W, H);
      onClean();
    }
  };

  return (
    <Draggable
      x={x}
      y={y}
      rotate={rot}
      disabled={fludd}
      bounds={{ left: -40, top: 150, right: 1600 - W + 40, bottom: 900 - H + 30 }}
      persistAs={{ aesthetic: A, key: `sand:${card.id}` }}
      onDragEnd={(p) => {
        if (Math.hypot(p.x - last.current.x, p.y - last.current.y) < 3) onOpen();
        last.current = p;
      }}
    >
      <div className={styles.card} onPointerMove={scrub} onPointerDown={scrub} style={{ width: W }}>
        <img className={styles.cardImg} src={img(A, card.slot, card.n)?.src ?? ""} alt={card.place} draggable={false} style={{ height: H }} />
        {card.goop && <canvas ref={goop} className={styles.goop} width={W} height={H} />}
        <span className={styles.cardCap}>
          {card.place} <i>{card.year.split(" · ")[1]}</i>
        </span>
      </div>
    </Draggable>
  );
}
