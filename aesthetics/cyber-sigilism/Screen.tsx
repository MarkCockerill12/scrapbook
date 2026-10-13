"use client";

import { useEffect, useRef } from "react";

/**
 * What a device shows once it is switched on. Each is a tiny low-resolution canvas,
 * scaled up without smoothing, laid over the screen in the photograph — so the
 * Nokia really is running Snake and the Game Boy really is dropping blocks.
 */

export type Show = "pet" | "snake" | "blocks" | "boot" | "desktop" | "shooter" | "clock";

const LCD = "#1d2a16";

export function Screen({ show, tint }: { show: Show; tint?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    const g = cv?.getContext("2d");
    if (!cv || !g) return;
    const W = cv.width;
    const H = cv.height;
    let raf = 0;
    let last = 0;
    const t0 = performance.now();

    // state the little programs keep between frames
    const snake = { body: [[6, 8], [5, 8], [4, 8]] as number[][], dir: [1, 0], food: [14, 5] };
    const well: number[][] = Array.from({ length: 16 }, () => Array(10).fill(0));
    let piece = { x: 4, y: 0, w: 2 };
    const stars = Array.from({ length: 14 }, (_, i) => ({ x: (i * 37) % W, y: (i * 23) % H, v: 0.4 + (i % 3) * 0.4 }));

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const step = show === "snake" ? 130 : show === "blocks" ? 170 : 60;
      if (now - last < step) return;
      last = now;
      const t = (now - t0) / 1000;

      if (show === "pet") {
        // a one-bit creature, bobbing, that blinks and sometimes has a heart
        g.fillStyle = tint ?? "#b9c9a8";
        g.fillRect(0, 0, W, H);
        g.fillStyle = LCD;
        const bx = Math.round(W / 2 - 8 + Math.sin(t * 1.4) * 9);
        const by = Math.round(H / 2 - 5 + Math.abs(Math.sin(t * 3)) * -4);
        g.fillRect(bx + 2, by, 12, 2);
        g.fillRect(bx, by + 2, 16, 8);
        g.fillRect(bx + 2, by + 10, 4, 2);
        g.fillRect(bx + 10, by + 10, 4, 2);
        g.fillStyle = tint ?? "#b9c9a8";
        if (Math.floor(t * 2) % 7 !== 0) {
          g.fillRect(bx + 4, by + 4, 2, 2);
          g.fillRect(bx + 10, by + 4, 2, 2);
        }
        g.fillRect(bx + 6, by + 7, 4, 1);
        g.fillStyle = LCD;
        if (Math.floor(t) % 4 === 0) {
          g.fillRect(bx + 19, by - 3, 2, 2);
          g.fillRect(bx + 22, by - 3, 2, 2);
          g.fillRect(bx + 19, by - 1, 5, 2);
          g.fillRect(bx + 20, by + 1, 3, 1);
        }
        for (let i = 0; i < W; i += 4) g.fillRect(i, H - 2, 2, 1);
      } else if (show === "snake") {
        const C = 4;
        const cols = Math.floor(W / C);
        const rows = Math.floor(H / C);
        const head = snake.body[0];
        // steer at the food, one axis at a time
        if (head[0] !== snake.food[0] && Math.random() < 0.7) snake.dir = [Math.sign(snake.food[0] - head[0]), 0];
        else if (head[1] !== snake.food[1]) snake.dir = [0, Math.sign(snake.food[1] - head[1])];
        const nx = (head[0] + snake.dir[0] + cols) % cols;
        const ny = (head[1] + snake.dir[1] + rows) % rows;
        snake.body.unshift([nx, ny]);
        if (nx === snake.food[0] && ny === snake.food[1]) {
          snake.food = [1 + Math.floor(Math.random() * (cols - 2)), 1 + Math.floor(Math.random() * (rows - 2))];
          if (snake.body.length > 16) snake.body.length = 4;
        } else snake.body.pop();
        g.fillStyle = "#9bbf5c";
        g.fillRect(0, 0, W, H);
        g.fillStyle = "#1c2a10";
        for (const [x, y] of snake.body) g.fillRect(x * C, y * C, C - 1, C - 1);
        g.fillRect(snake.food[0] * C + 1, snake.food[1] * C + 1, 2, 2);
      } else if (show === "blocks") {
        const C = Math.floor(H / 16);
        const ox = Math.floor((W - C * 10) / 2);
        piece.y += 1;
        const floor = (c: number) => well.findIndex((r) => r[c]);
        const lands = [0, 1].some((k) => {
          const f = floor(piece.x + k);
          return piece.y + 1 >= (f < 0 ? 16 : f);
        });
        if (lands) {
          for (let k = 0; k < piece.w; k++) if (well[piece.y]) well[piece.y][piece.x + k] = 1;
          for (let r = 15; r >= 0; r--) {
            if (well[r].every(Boolean)) {
              well.splice(r, 1);
              well.unshift(Array(10).fill(0));
            }
          }
          if (well[2].some(Boolean)) well.forEach((r) => r.fill(0));
          piece = { x: Math.floor(Math.random() * 9), y: 0, w: 2 };
        }
        g.fillStyle = "#c4cfa1";
        g.fillRect(0, 0, W, H);
        g.fillStyle = "#8b956d";
        g.fillRect(ox - 2, 0, 1, H);
        g.fillRect(ox + C * 10 + 1, 0, 1, H);
        g.fillStyle = "#2a3320";
        well.forEach((r, y) => r.forEach((v, x) => v && g.fillRect(ox + x * C, y * C, C - 1, C - 1)));
        for (let k = 0; k < piece.w; k++) g.fillRect(ox + (piece.x + k) * C, piece.y * C, C - 1, C - 1);
      } else if (show === "boot") {
        // the logo comes down, lands, and the cartridge starts
        const drop = Math.min(1, t / 1.6);
        g.fillStyle = t < 2.6 ? "#f4f6fb" : "#101a3a";
        g.fillRect(0, 0, W, H);
        if (t < 2.6) {
          g.fillStyle = "#2a2f8f";
          g.font = `bold ${Math.floor(H / 4.2)}px sans-serif`;
          g.textAlign = "center";
          g.fillText("GAME BOY", W / 2, Math.round(H * 0.52 * drop + 2));
          if (drop >= 1) {
            g.fillStyle = "#b02a6a";
            g.font = `${Math.floor(H / 7)}px sans-serif`;
            g.fillText("ADVANCE", W / 2, H * 0.74);
          }
        } else {
          // a side-scroller: hills going by, and something running along them
          const s = (t * 40) % W;
          g.fillStyle = "#2f6fd6";
          g.fillRect(0, 0, W, H * 0.62);
          g.fillStyle = "#3fbf6a";
          for (let x = -W; x < W * 2; x += 22) {
            g.beginPath();
            g.arc(x - s, H * 0.66, 15, Math.PI, 0);
            g.fill();
          }
          g.fillStyle = "#7a4a1c";
          g.fillRect(0, H * 0.66, W, H);
          g.fillStyle = "#ffd23f";
          const jy = Math.abs(Math.sin(t * 5)) * 9;
          g.fillRect(W * 0.3, H * 0.66 - 8 - jy, 6, 8);
          g.fillStyle = "#fff";
          for (let k = 0; k < 3; k++) g.fillRect(((k * 31 - s * 1.6) % W + W) % W, H * 0.4 + k * 4, 3, 3);
        }
      } else if (show === "desktop") {
        // grey, a menu bar, one window with a progress bar that never quite finishes
        g.fillStyle = "#6f9fd6";
        g.fillRect(0, 0, W, H);
        g.fillStyle = "#f2f2f2";
        g.fillRect(0, 0, W, 5);
        g.fillStyle = "#222";
        g.fillRect(2, 1, 3, 3);
        g.fillRect(8, 2, 8, 1);
        g.fillRect(19, 2, 8, 1);
        g.fillStyle = "#fff";
        g.fillRect(W * 0.16, H * 0.24, W * 0.68, H * 0.5);
        g.fillStyle = "#c8c8c8";
        g.fillRect(W * 0.16, H * 0.24, W * 0.68, 5);
        g.fillStyle = "#3a6fd0";
        g.fillRect(W * 0.22, H * 0.52, W * 0.56 * ((t * 0.18) % 1), 4);
        g.strokeStyle = "#888";
        g.strokeRect(W * 0.22 - 0.5, H * 0.52 - 0.5, W * 0.56 + 1, 5);
        g.fillStyle = "#333";
        g.fillRect(W * 0.22, H * 0.38, W * 0.34, 2);
        g.fillRect(W * 0.22, H * 0.44, W * 0.22, 2);
        for (let k = 0; k < 3; k++) {
          g.fillStyle = ["#ffd23f", "#ff6a8a", "#7dffb0"][k];
          g.fillRect(W - 12, 10 + k * 12, 8, 7);
        }
      } else if (show === "shooter") {
        g.fillStyle = "#0a0e2a";
        g.fillRect(0, 0, W, H);
        g.fillStyle = "#fff";
        for (const s of stars) {
          s.x -= s.v * 2;
          if (s.x < 0) s.x = W;
          g.fillRect(Math.round(s.x), s.y, 1, 1);
        }
        const py = Math.round(H / 2 + Math.sin(t * 2.2) * H * 0.3);
        g.fillStyle = "#7df9ff";
        g.fillRect(8, py, 8, 3);
        g.fillRect(6, py + 1, 2, 1);
        g.fillStyle = "#ffe98a";
        const b = ((t * 70) % (W - 18)) + 18;
        g.fillRect(b, py + 1, 4, 1);
        g.fillStyle = "#ff6a8a";
        const ey = Math.round(H / 2 + Math.cos(t * 1.7) * H * 0.3);
        g.fillRect(W - 14, ey, 6, 5);
      } else {
        // the outer display: the time, and a signal that is always full
        g.fillStyle = "#0b1020";
        g.fillRect(0, 0, W, H);
        g.fillStyle = "#9fe6ff";
        const d = new Date();
        g.font = `bold ${Math.floor(H / 2.2)}px monospace`;
        g.textAlign = "center";
        g.fillText(`${String(d.getHours()).padStart(2, "0")}${d.getSeconds() % 2 ? ":" : " "}${String(d.getMinutes()).padStart(2, "0")}`, W / 2, H * 0.68);
        for (let k = 0; k < 4; k++) g.fillRect(3 + k * 3, 7 - k, 2, 2 + k);
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [show, tint]);

  const wide = show === "boot" || show === "desktop" || show === "shooter";
  return <canvas ref={ref} width={wide ? 96 : 64} height={show === "blocks" ? 64 : wide ? 64 : 44} style={{ width: "100%", height: "100%", display: "block", imageRendering: "pixelated" }} />;
}
