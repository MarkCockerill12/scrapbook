"use client";

import { useEffect, useRef } from "react";
import { tone } from "@/lib/audio";
import { sbGet, sbSet } from "@/lib/storage";
import { coin, jackpot, start as startJingle } from "./sound";

/**
 * STAR SCRAP — the game in the one cabinet you can play.
 *
 * 256x224, the resolution these boards actually ran at, drawn with no smoothing and
 * projected onto the real tube. A fixed-screen shooter in the 1979–81 mould: a rank
 * of things that march and drop, things that peel off and dive, three lives, and a
 * high-score table that remembers.
 */

const W = 256;
const H = 224;
const A = "arcade";

type Phase = "attract" | "play" | "over";

interface Foe {
  x: number;
  y: number;
  kind: number;
  alive: boolean;
  dive: number; // 0 = in rank; >0 = diving, the time it has been at it
  dx: number;
}
interface Shot {
  x: number;
  y: number;
  vy: number;
}
interface Bit {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  c: string;
}

// 8x8 sprites, one string per row
const SPR: Record<string, string[]> = {
  ship: ["...##...", "...##...", "..####..", ".######.", "########", "########", "##.##.##", "#......#"],
  a0: ["..#..#..", "...##...", ".######.", "##.##.##", "########", ".#.##.#.", "#......#", ".#....#."],
  a1: ["..#..#..", "#..##..#", "#######.", "##.##.##", "########", "..#..#..", ".#....#.", "#......#"],
  b0: ["...##...", "..####..", ".######.", "##.##.##", "########", "..#..#..", ".#.##.#.", "#.#..#.#"],
  b1: ["...##...", "..####..", ".######.", "##.##.##", "########", ".#.##.#.", "#......#", ".#....#."],
  c0: [".##..##.", "########", "#.####.#", "########", ".######.", "..#..#..", ".#....#.", "..#..#.."],
  c1: [".##..##.", "########", "#.####.#", "########", ".######.", ".#.##.#.", "#......#", "#......#"],
};
const COL = ["#ff5fa2", "#5fe8ff", "#ffe45f"];

export function Game({ live, onScore }: { live: boolean; onScore?: (n: number) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const liveRef = useRef(live);
  liveRef.current = live;

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    ctx.imageSmoothingEnabled = false;

    let phase: Phase = "attract";
    let score = 0;
    let lives = 3;
    let wave = 1;
    let hi = sbGet(A, "hi", 12000);
    let px = W / 2;
    let cool = 0;
    let dir = 1;
    let rankX = 0;
    let stepT = 0;
    let dead = 0;
    let over = 0;
    let foes: Foe[] = [];
    const shots: Shot[] = [];
    const bombs: Shot[] = [];
    const bits: Bit[] = [];
    const keys = new Set<string>();
    const stars = Array.from({ length: 40 }, (_, i) => ({ x: (i * 67) % W, y: (i * 41) % H, s: 0.2 + ((i * 13) % 10) / 12 }));

    const spawn = () => {
      foes = [];
      for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) foes.push({ x: 36 + c * 24, y: 34 + r * 16, kind: r === 0 ? 2 : r < 3 ? 1 : 0, alive: true, dive: 0, dx: 0 });
      rankX = 0;
      dir = 1;
    };
    const begin = () => {
      phase = "play";
      score = 0;
      lives = 3;
      wave = 1;
      px = W / 2;
      shots.length = 0;
      bombs.length = 0;
      spawn();
      startJingle();
    };
    const boom = (x: number, y: number, c: string, n = 10) => {
      for (let i = 0; i < n; i++) bits.push({ x, y, vx: (Math.random() - 0.5) * 90, vy: (Math.random() - 0.5) * 90, life: 0.5, c });
    };

    const down = (e: KeyboardEvent) => {
      if (!liveRef.current) return;
      const k = e.key;
      if (["ArrowLeft", "ArrowRight", " ", "Enter", "a", "d"].includes(k)) {
        e.preventDefault();
        e.stopPropagation();
        keys.add(k);
        if ((k === "Enter" || k === " ") && phase !== "play" && over <= 0) {
          coin();
          window.setTimeout(begin, 380);
        }
      }
    };
    const up = (e: KeyboardEvent) => keys.delete(e.key);
    window.addEventListener("keydown", down, true);
    window.addEventListener("keyup", up, true);

    const sprite = (name: string, x: number, y: number, c: string) => {
      const s = SPR[name];
      ctx.fillStyle = c;
      for (let r = 0; r < 8; r++) for (let q = 0; q < 8; q++) if (s[r][q] === "#") ctx.fillRect(Math.round(x) - 4 + q, Math.round(y) - 4 + r, 1, 1);
    };
    const text = (t: string, x: number, y: number, c = "#fff", align: CanvasTextAlign = "left") => {
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.textAlign = align;
      ctx.textBaseline = "top";
      ctx.fillStyle = c;
      ctx.fillText(t, x, y);
    };

    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.033, Math.max(0, (now - last) / 1000));
      last = now;
      const t = now / 1000;
      const on = liveRef.current;

      // ---------- update
      if (phase === "play" && on) {
        if (dead > 0) {
          dead -= dt;
          if (dead <= 0 && lives <= 0) {
            phase = "over";
            over = 3;
            if (score > hi) {
              hi = score;
              sbSet(A, "hi", hi);
              jackpot();
            }
            onScore?.(score);
          }
        } else {
          if (keys.has("ArrowLeft") || keys.has("a")) px -= 110 * dt;
          if (keys.has("ArrowRight") || keys.has("d")) px += 110 * dt;
          px = Math.max(10, Math.min(W - 10, px));
          cool -= dt;
          if (keys.has(" ") && cool <= 0 && shots.length < 3) {
            shots.push({ x: px, y: H - 30, vy: -230 });
            cool = 0.22;
            tone({ freq: 1400, toFreq: 500, duration: 0.07, type: "square", gain: 0.05 });
          }
        }

        // the rank marches; faster as it thins
        const left = foes.filter((f) => f.alive);
        stepT -= dt;
        if (stepT <= 0) {
          stepT = Math.max(0.05, 0.03 + left.length * 0.016 - wave * 0.02);
          rankX += dir * 4;
          const xs = left.filter((f) => !f.dive).map((f) => f.x + rankX);
          if (xs.length && (Math.max(...xs) > W - 12 || Math.min(...xs) < 12)) {
            dir *= -1;
            for (const f of foes) f.y += 5;
          }
          tone({ freq: 90 + (Math.round(t * 4) % 4) * 12, duration: 0.04, type: "square", gain: 0.03 });
        }
        // one peels off
        if (left.length && Math.random() < dt * (0.35 + wave * 0.12)) {
          const f = left[Math.floor(Math.random() * left.length)];
          if (!f.dive) {
            f.dive = 0.001;
            f.dx = f.x + rankX;
            tone({ freq: 900, toFreq: 300, duration: 0.3, type: "sawtooth", gain: 0.03 });
          }
        }
        for (const f of foes) {
          if (!f.alive) continue;
          if (f.dive) {
            f.dive += dt;
            f.y += (70 + wave * 8) * dt;
            f.dx += Math.sin(f.dive * 5) * 70 * dt + Math.sign(px - f.dx) * 26 * dt;
            if (Math.random() < dt * 1.2) bombs.push({ x: f.dx, y: f.y + 6, vy: 110 });
            if (f.y > H + 10) {
              f.y = 34 + Math.floor(Math.random() * 3) * 16;
              f.dive = 0;
            }
          } else if (Math.random() < dt * 0.05 * (1 + wave * 0.3)) bombs.push({ x: f.x + rankX, y: f.y + 6, vy: 90 });
          const fx = f.dive ? f.dx : f.x + rankX;
          if (dead <= 0 && Math.abs(fx - px) < 8 && Math.abs(f.y - (H - 22)) < 8) {
            f.alive = false;
            lives -= 1;
            dead = 1.4;
            boom(px, H - 22, "#fff", 24);
            tone({ freq: 200, toFreq: 40, duration: 0.6, type: "sawtooth", gain: 0.12 });
          }
        }
        for (let i = shots.length - 1; i >= 0; i--) {
          const s = shots[i];
          s.y += s.vy * dt;
          let gone = s.y < 14;
          for (const f of foes) {
            if (!f.alive) continue;
            const fx = f.dive ? f.dx : f.x + rankX;
            if (Math.abs(fx - s.x) < 6 && Math.abs(f.y - s.y) < 6) {
              f.alive = false;
              gone = true;
              score += (f.kind + 1) * (f.dive ? 100 : 50);
              boom(fx, f.y, COL[f.kind]);
              tone({ freq: 300, toFreq: 80, duration: 0.12, type: "square", gain: 0.07 });
              break;
            }
          }
          if (gone) shots.splice(i, 1);
        }
        for (let i = bombs.length - 1; i >= 0; i--) {
          const b = bombs[i];
          b.y += b.vy * dt;
          if (dead <= 0 && Math.abs(b.x - px) < 5 && Math.abs(b.y - (H - 22)) < 6) {
            bombs.splice(i, 1);
            lives -= 1;
            dead = 1.4;
            boom(px, H - 22, "#fff", 24);
            tone({ freq: 200, toFreq: 40, duration: 0.6, type: "sawtooth", gain: 0.12 });
          } else if (b.y > H) bombs.splice(i, 1);
        }
        if (!foes.some((f) => f.alive)) {
          wave += 1;
          spawn();
          score += 500;
          startJingle();
        }
      } else if (phase === "over") {
        over -= dt;
        if (over <= -5) phase = "attract";
      }
      for (let i = bits.length - 1; i >= 0; i--) {
        const b = bits[i];
        b.life -= dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.life <= 0) bits.splice(i, 1);
      }

      // ---------- draw
      ctx.fillStyle = "#03020a";
      ctx.fillRect(0, 0, W, H);
      for (const s of stars) {
        s.y = (s.y + s.s * 26 * dt) % H;
        ctx.fillStyle = `rgba(200,220,255,${0.3 + s.s * 0.6})`;
        ctx.fillRect(s.x, Math.floor(s.y), 1, 1);
      }
      text("1UP", 12, 4, "#ff5fa2");
      text(String(score).padStart(6, "0"), 12, 14);
      text("HI-SCORE", W / 2, 4, "#ff5fa2", "center");
      text(String(Math.max(hi, score)).padStart(6, "0"), W / 2, 14, "#fff", "center");

      if (phase === "attract") {
        const flip = Math.floor(t * 2) % 2;
        text("STAR SCRAP", W / 2, 58, "#5fe8ff", "center");
        sprite(`c${flip}`, 92, 96, COL[2]);
        text("= 150 PTS", 106, 92);
        sprite(`b${flip}`, 92, 114, COL[1]);
        text("= 100 PTS", 106, 110);
        sprite(`a${flip}`, 92, 132, COL[0]);
        text("=  50 PTS", 106, 128);
        if (flip) text(on ? "PRESS START" : "INSERT COIN", W / 2, 164, "#ffe45f", "center");
        text("© 1981 TILT! CO.", W / 2, 204, "#8a86a8", "center");
      } else {
        const flip = Math.floor(t * 3) % 2;
        for (const f of foes) {
          if (!f.alive) continue;
          sprite(`${"abc"[f.kind]}${flip}`, f.dive ? f.dx : f.x + rankX, f.y, COL[f.kind]);
        }
        ctx.fillStyle = "#fff";
        for (const s of shots) ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, 5);
        ctx.fillStyle = "#ff8a5f";
        for (const b of bombs) ctx.fillRect(Math.round(b.x), Math.round(b.y), 2, 4);
        if (dead <= 0 || Math.floor(t * 14) % 2) if (lives > 0 || dead > 0) sprite("ship", px, H - 22, "#7dff9a");
        for (let i = 0; i < lives - 1; i++) sprite("ship", 14 + i * 12, H - 8, "#7dff9a");
        text(`WAVE ${wave}`, W - 12, H - 12, "#8a86a8", "right");
        if (phase === "over") {
          text("GAME OVER", W / 2, 100, "#ff5fa2", "center");
          if (score >= hi && score > 0) text("NEW HIGH SCORE", W / 2, 118, "#ffe45f", "center");
        }
      }
      for (const b of bits) {
        ctx.fillStyle = b.c;
        ctx.fillRect(Math.round(b.x), Math.round(b.y), 1, 1);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", down, true);
      window.removeEventListener("keyup", up, true);
    };
  }, [onScore]);

  return <canvas ref={ref} width={W} height={H} style={{ width: "100%", height: "100%", imageRendering: "pixelated", display: "block" }} />;
}
