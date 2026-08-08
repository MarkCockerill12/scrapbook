"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./styles.module.css";

/**
 * The montage itself: a fake clip, rendered.
 *
 * Drawn at 400x206 and scaled up with `image-rendering: pixelated`, because the
 * defining quality of a 2010 montage is not the gameplay — it is the *compression*.
 * A crisp render of the same scene looks like a modern game capture; a chunky one
 * looks like something re-encoded four times on the way to a 360p upload.
 *
 * The clip is on a fixed 18-second loop with scripted beats (kill, kill, headshot,
 * quad) so the HUD numbers and the on-screen text always agree with each other. A
 * randomised version reads as a screensaver.
 */

const W = 416;
const H = 234;
const LOOP = 18;

interface Beat {
  t: number;
  text: string;
}

const BEATS: Beat[] = [
  { t: 2.4, text: "+100 HEADSHOT" },
  { t: 5.1, text: "+50 KILL" },
  { t: 8.7, text: "+100 HEADSHOT" },
  { t: 11.2, text: "DOUBLE KILL" },
  { t: 14.6, text: "+250 NO SCOPE" },
  { t: 16.4, text: "SICK BRO" },
];

export function MontagePlayer({ montage }: { montage: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [t, setT] = useState(0);
  const montageRef = useRef(montage);
  montageRef.current = montage;

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    canvas.width = W;
    canvas.height = H;

    const start = performance.now();
    let raf = 0;

    const frame = () => {
      const time = ((performance.now() - start) / 1000) % LOOP;
      setT(time);

      const shot = BEATS.find((b) => time > b.t && time < b.t + 0.9);
      const flash = BEATS.find((b) => time > b.t && time < b.t + 0.09);

      // Camera: a slow drift plus recoil kick on each beat.
      const kick = flash ? 5 : 0;
      const drift = Math.sin(time * 0.7) * 8;
      const bob = Math.sin(time * 5.2) * 1.4;

      // sky / far haze
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#2a3a4a");
      sky.addColorStop(0.52, "#5c6a66");
      sky.addColorStop(1, "#2c2a22");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      const horizon = H * 0.52 + bob + kick;

      // ground: a perspective grid running toward the horizon
      ctx.strokeStyle = "rgba(30,36,28,0.65)";
      ctx.lineWidth = 1;
      for (let i = 1; i < 14; i++) {
        const p = i / 14;
        const y = horizon + Math.pow(p, 2.1) * (H - horizon) * 1.35;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      const scrolled = (time * 40) % 40;
      for (let i = -6; i < 16; i++) {
        const x = i * 40 - scrolled - drift;
        ctx.beginPath();
        ctx.moveTo(W / 2 + (x - W / 2) * 0.16, horizon);
        ctx.lineTo(x, H);
        ctx.stroke();
      }

      // two crates and a distant silhouette, so the frame has a subject
      const drawBox = (cx: number, w: number, h: number, shade: string) => {
        ctx.fillStyle = shade;
        ctx.fillRect(cx - w / 2, horizon - h, w, h);
        ctx.fillStyle = "rgba(255,255,255,0.09)";
        ctx.fillRect(cx - w / 2, horizon - h, w, 3);
      };
      drawBox(78 - drift * 0.6, 52, 30, "#3d4034");
      drawBox(318 - drift * 0.4, 44, 24, "#35382d");

      const enemyX = W / 2 + Math.sin(time * 0.9) * 70 - drift;
      ctx.fillStyle = shot ? "#d64b2a" : "#2b3128";
      ctx.fillRect(enemyX - 5, horizon - 26, 10, 26);
      ctx.fillRect(enemyX - 4, horizon - 33, 8, 8);

      // muzzle flash
      if (flash) {
        ctx.fillStyle = "rgba(255,236,150,0.85)";
        ctx.beginPath();
        ctx.arc(W / 2 + 42, horizon + 22, 16, 0, Math.PI * 2);
        ctx.fill();
      }

      // crosshair
      ctx.strokeStyle = "rgba(230,255,210,0.9)";
      ctx.lineWidth = 1;
      const cx = W / 2;
      const cy = H / 2 + bob;
      const gap = flash ? 9 : 5;
      ctx.beginPath();
      ctx.moveTo(cx - gap - 6, cy);
      ctx.lineTo(cx - gap, cy);
      ctx.moveTo(cx + gap, cy);
      ctx.lineTo(cx + gap + 6, cy);
      ctx.moveTo(cx, cy - gap - 6);
      ctx.lineTo(cx, cy - gap);
      ctx.moveTo(cx, cy + gap);
      ctx.lineTo(cx, cy + gap + 6);
      ctx.stroke();

      if (shot) {
        // hitmarker
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 9, cy - 9);
        ctx.lineTo(cx - 4, cy - 4);
        ctx.moveTo(cx + 9, cy - 9);
        ctx.lineTo(cx + 4, cy - 4);
        ctx.moveTo(cx - 9, cy + 9);
        ctx.lineTo(cx - 4, cy + 4);
        ctx.moveTo(cx + 9, cy + 9);
        ctx.lineTo(cx + 4, cy + 4);
        ctx.stroke();

        ctx.font = "bold italic 15px 'Segoe UI', sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffd34a";
        ctx.fillText(shot.text, cx, cy - 34);
      }

      // HUD
      ctx.font = "bold 13px 'Segoe UI', sans-serif";
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(235,245,225,0.92)";
      ctx.fillText(`${Math.max(0, 30 - (BEATS.filter((b) => time > b.t).length * 4)) }/210`, 12, H - 14);
      ctx.textAlign = "right";
      ctx.fillText("100", W - 12, H - 14);

      // 360p compression: chunky luma banding, no fine detail survives re-encoding
      if (montageRef.current) {
        ctx.fillStyle = "rgba(255,90,20,0.10)";
        ctx.fillRect(0, 0, W, H);
      }
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = "#000";
      for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
      ctx.globalAlpha = 1;

      raf = requestAnimationFrame(frame);
    };
    frame();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className={styles.player}>
      <canvas
        ref={ref}
        className={styles.playerCanvas}
        style={{ imageRendering: "pixelated" }}
      />
      <div className={styles.playerBar}>
        <span>▶</span>
        <span>
          {String(Math.floor(t / 60)).padStart(2, "0")}:
          {String(Math.floor(t % 60)).padStart(2, "0")}
        </span>
        <div className={styles.progress}>
          <div className={styles.progressFill} style={{ width: `${(t / LOOP) * 100}%` }} />
        </div>
        <span>360p</span>
      </div>
    </div>
  );
}
