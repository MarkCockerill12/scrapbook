"use client";

import { useEffect, useRef } from "react";
import { img } from "@/lib/assets";
import { noiseLoop } from "@/lib/audio";
import { bail as bailSound, ding, landed, ollie as ollieSound } from "./punk";

/**
 * The run. A side-on street line, the way a filmer would shoot it from a car: you
 * push, you pop, you flip the board, you lock onto rails and ledges, and you try to
 * get it all into one line before your wheels touch down.
 *
 * Everything that is a surface is a photograph — scanned asphalt underfoot, scanned
 * concrete for the wall and the ledges, real box art wheat-pasted along the wall,
 * a real San Francisco street behind it. The skater is the one drawn thing, and he is
 * drawn the way the zine would: a cut-out with a fat marker outline.
 */

const A = "skate-zine";
const W = 1600;
const H = 900;
const GROUND = 690; // screen y of the ground when the camera is settled
const G = 2100;
const VMIN = 250;
const VMAX = 640;
const RUN = 120;

export interface Hud {
  score: number;
  combo: string[];
  pot: number;
  mult: number;
  time: number;
  banked: { text: string; k: number } | null;
  special: number;
}

interface Seg {
  x: number;
  w: number;
  y0: number;
  y1: number;
  stairs?: boolean;
}
interface Rail {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  kind: "rail" | "ledge";
}
interface Cone {
  x: number;
  y: number;
  hit?: boolean;
  kind: number;
}
interface Poster {
  x: number;
  n: number;
  r: number;
}
interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

type Mode = "ground" | "air" | "grind" | "bail";

function load(slot: string, n: number): HTMLImageElement | null {
  const a = img(A, slot, n);
  if (!a) return null;
  const el = new Image();
  el.src = a.src;
  return el;
}

export function Run({ live, onHud, onOver }: { live: boolean; onHud: (h: Hud) => void; onOver: (score: number) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const hudRef = useRef(onHud);
  hudRef.current = onHud;
  const overRef = useRef(onOver);
  overRef.current = onOver;

  useEffect(() => {
    if (!live) return;
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const asphalt = load("sk_tex", 1);
    const concrete = load("sk_tex", 2);
    const city = load("sk_city", 2);
    const posters = [2, 3, 5, 6, 7, 8, 9].map((n) => load("sk_th", n));

    // ---------------- the street, built ahead of you ----------------
    const segs: Seg[] = [{ x: -400, w: 1500, y0: 0, y1: 0 }];
    const rails: Rail[] = [];
    const cones: Cone[] = [];
    const wall: Poster[] = [];
    let built = 1100;
    let level = 0;
    let seed = 7;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const flat = (w: number) => {
      segs.push({ x: built, w, y0: level, y1: level });
      built += w;
    };
    const build = () => {
      const r = rnd();
      if (r < 0.22) {
        // a flat rail
        flat(140);
        const len = 320 + rnd() * 260;
        rails.push({ x1: built, y1: level - 62, x2: built + len, y2: level - 62, kind: "rail" });
        flat(len + 160);
      } else if (r < 0.42) {
        // a ledge: you have to get onto it
        flat(180);
        const len = 300 + rnd() * 220;
        rails.push({ x1: built, y1: level - 48, x2: built + len, y2: level - 48, kind: "ledge" });
        flat(len + 200);
      } else if (r < 0.6 && level < 260) {
        // a stair set with a handrail
        flat(160);
        const drop = 120;
        const run = 230;
        rails.push({ x1: built - 10, y1: level - 66, x2: built + run + 10, y2: level + drop - 66, kind: "rail" });
        segs.push({ x: built, w: run, y0: level, y1: level + drop, stairs: true });
        built += run;
        level += drop;
        flat(260);
      } else if (r < 0.74 && level > 0) {
        // a bank back up
        flat(120);
        const rise = Math.min(level, 120);
        segs.push({ x: built, w: 340, y0: level, y1: level - rise });
        built += 340;
        level -= rise;
        flat(200);
      } else if (r < 0.88) {
        // a kicker
        flat(140);
        segs.push({ x: built, w: 130, y0: level, y1: level - 54 });
        built += 130;
        flat(360);
      } else {
        // things somebody left in the way
        flat(200);
        const n = 1 + Math.floor(rnd() * 2);
        for (let i = 0; i < n; i++) cones.push({ x: built + i * 46, y: level, kind: Math.floor(rnd() * 2) });
        flat(260);
      }
      if (rnd() < 0.5) wall.push({ x: built + rnd() * 200, n: Math.floor(rnd() * posters.length), r: (rnd() - 0.5) * 0.14 });
    };
    while (built < 4000) build();

    const groundAt = (x: number): { y: number; slope: number; stairs: boolean } => {
      for (let i = segs.length - 1; i >= 0; i--) {
        const s = segs[i];
        if (x >= s.x && x < s.x + s.w) {
          const t = (x - s.x) / s.w;
          return { y: s.y0 + (s.y1 - s.y0) * t, slope: (s.y1 - s.y0) / s.w, stairs: !!s.stairs };
        }
      }
      return { y: level, slope: 0, stairs: false };
    };
    const railY = (r: Rail, x: number) => r.y1 + ((r.y2 - r.y1) * (x - r.x1)) / (r.x2 - r.x1);

    // ---------------- you ----------------
    const p = {
      x: 0,
      y: 0,
      vx: 330,
      vy: 0,
      mode: "ground" as Mode,
      crouch: 0,
      charge: 0,
      flip: 0, // remaining rotation, radians
      flipDir: 1,
      shove: 0,
      grab: false,
      manual: false,
      rail: null as Rail | null,
      push: 0,
      bailT: 0,
      air: 0,
      spin: 0,
      lean: 0,
    };
    let combo: { name: string; pts: number }[] = [];
    let score = 0;
    let special = 0;
    let time = RUN;
    let over = false;
    let banked: Hud["banked"] = null;
    let bk = 0;
    let camX = -420;
    let camY = 0;
    let shake = 0;
    const sparks: Spark[] = [];
    const keys = new Set<string>();
    let hudDirty = true;

    const pot = () => combo.reduce((a, c) => a + c.pts, 0);
    const add = (name: string, pts: number) => {
      const last = combo[combo.length - 1];
      // holding a trick grows it rather than repeating it
      if (last && last.name === name && (name.includes("grind") || name === "50-50" || name === "Manual" || name === "Melon" || name === "Boardslide")) last.pts += pts;
      else combo.push({ name, pts });
      hudDirty = true;
    };
    const bank = () => {
      if (!combo.length) return;
      const total = Math.round(pot() * combo.length);
      score += total;
      special = Math.min(1, special + total / 9000);
      banked = { text: `${total.toLocaleString()}`, k: ++bk };
      landed(combo.length > 3);
      combo = [];
      hudDirty = true;
    };
    const slam = () => {
      if (p.mode === "bail") return;
      p.mode = "bail";
      p.bailT = 0;
      p.vy = -260;
      p.rail = null;
      p.flip = 0;
      p.shove = 0;
      p.grab = false;
      p.manual = false;
      combo = [];
      special = Math.max(0, special - 0.35);
      shake = 16;
      banked = { text: "BAIL", k: ++bk };
      bailSound();
      hudDirty = true;
    };
    const pop = (power: number) => {
      p.mode = "air";
      p.rail = null;
      p.manual = false;
      p.vy = -(540 + 300 * power) * (special >= 1 ? 1.12 : 1);
      p.air = 0;
      p.crouch = 0;
      ollieSound();
    };

    const down = (e: KeyboardEvent) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(k)) {
        // The arrow keys also drive the channel dial; this keeps them on the board.
        e.preventDefault();
        e.stopPropagation();
      }
      if (e.repeat) return;
      keys.add(k);
      if (p.mode === "air" && p.flip === 0 && p.shove === 0) {
        if (k === "ArrowLeft" || k === "a") {
          p.flip = Math.PI * 2;
          p.flipDir = 1;
          add(keys.has("ArrowDown") || keys.has("s") ? "360 Flip" : "Kickflip", keys.has("ArrowDown") || keys.has("s") ? 320 : 120);
          if (keys.has("ArrowDown") || keys.has("s")) p.shove = Math.PI * 2;
        } else if (k === "ArrowRight" || k === "d") {
          p.flip = Math.PI * 2;
          p.flipDir = -1;
          add("Heelflip", 120);
        } else if (k === "ArrowDown" || k === "s") {
          p.shove = Math.PI;
          add("Pop Shove-It", 110);
        }
      }
      if ((k === " " || k === "x") && (p.mode === "grind" || (p.mode === "ground" && p.manual))) pop(0.35);
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      keys.delete(k);
      if ((k === " " || k === "x") && p.mode === "ground" && p.charge > 0) pop(Math.min(1, p.charge / 0.32));
      p.charge = 0;
    };
    const press = () => {
      if (p.mode === "ground" || p.mode === "grind") pop(0.6);
    };
    window.addEventListener("keydown", down, true);
    window.addEventListener("keyup", up, true);
    canvas.addEventListener("pointerdown", press);

    let roll: (() => void) | null = null;
    let scrape: (() => void) | null = null;
    const sound = (mode: Mode) => {
      const wantRoll = mode === "ground";
      const wantScrape = mode === "grind";
      if (wantRoll && !roll) roll = noiseLoop({ gain: 0.05, lowpass: 900, highpass: 180, attack: 0.05 });
      if (!wantRoll && roll) {
        roll();
        roll = null;
      }
      if (wantScrape && !scrape) scrape = noiseLoop({ gain: 0.07, lowpass: 7000, highpass: 2600, attack: 0.02 });
      if (!wantScrape && scrape) {
        scrape();
        scrape = null;
      }
    };

    // ---------------- drawing ----------------
    let patA: CanvasPattern | null = null;
    let patC: CanvasPattern | null = null;
    const limb = (pts: number[][], w: number, color: string) => {
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.strokeStyle = "#0b0b0c";
      ctx.lineWidth = w + 7;
      ctx.stroke();
      ctx.strokeStyle = color;
      ctx.lineWidth = w;
      ctx.stroke();
    };

    const drawSkater = (sx: number, sy: number, tilt: number) => {
      ctx.save();
      ctx.translate(sx, sy);
      const bailing = p.mode === "bail";
      if (bailing) {
        ctx.translate(0, -30);
        ctx.rotate(Math.min(p.bailT * 7, Math.PI * 0.55));
        ctx.translate(0, 30);
      } else ctx.rotate(tilt + p.lean);

      const air = p.mode === "air";
      const c = air ? Math.max(0.25, 1 - Math.min(1, p.air * 3.2)) * 0.9 : p.crouch;
      const tuck = air ? 0.55 : 0;
      const k = Math.max(c, tuck);

      // --- the board
      ctx.save();
      const lift = air ? -Math.sin(Math.min(1, p.air * 5) * Math.PI) * 0.34 : p.manual ? -0.3 : 0;
      ctx.translate(0, -9);
      ctx.rotate(lift);
      const roll = Math.cos(p.flip * p.flipDir);
      const yaw = Math.cos(p.shove);
      ctx.scale(Math.abs(yaw) < 0.12 ? 0.12 : yaw, 1);
      const sY = Math.abs(roll) < 0.14 ? 0.14 * Math.sign(roll || 1) : roll;
      if (sY > 0) {
        ctx.fillStyle = "#0b0b0c";
        for (const wx of [-27, 27]) {
          ctx.beginPath();
          ctx.arc(wx, 6, 6.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#e8e2d2";
          ctx.beginPath();
          ctx.arc(wx, 6, 3.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#0b0b0c";
        }
      }
      ctx.scale(1, sY);
      ctx.beginPath();
      ctx.moveTo(-46, -7);
      ctx.quadraticCurveTo(-40, -1, -30, -1);
      ctx.lineTo(30, -1);
      ctx.quadraticCurveTo(40, -1, 46, -7);
      ctx.lineWidth = 8;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#0b0b0c";
      ctx.stroke();
      ctx.lineWidth = 4.5;
      ctx.strokeStyle = sY > 0 ? "#2a2a2c" : "#e23b2e";
      ctx.stroke();
      ctx.restore();

      // --- the body
      const hipY = -78 + k * 30;
      const hip = [-4 - k * 6, hipY];
      const sh = [6 + k * 12, hipY - 50 + k * 10];
      const footB = bailing ? [-30, -30] : [-22, -15 + (air ? -tuck * 16 : 0)];
      const footF = bailing ? [34, -44] : [20, -15 + (air ? -tuck * 20 : 0)];
      // pushing: the back foot leaves the board and paws at the street
      if (p.push > 0 && p.mode === "ground") {
        const ph = p.push;
        footB[0] = -22 - Math.sin(ph * Math.PI) * 30;
        footB[1] = -15 + Math.sin(ph * Math.PI) * 15;
      }
      const knee = (f: number[], out: number) => [(hip[0] + f[0]) / 2 + out, (hip[1] + f[1]) / 2 - 2];
      limb([hip, knee(footB, 8 + k * 14), footB], 13, "#27303f");
      limb([hip, knee(footF, 14 + k * 16), footF], 13, "#2f3a4d");
      // shoes
      limb([footB, [footB[0] + 9, footB[1] + 1]], 9, "#ece6d8");
      limb([footF, [footF[0] + 9, footF[1] + 1]], 9, "#ece6d8");
      // arms behind, torso, arm in front
      const fling = air ? -26 : p.mode === "grind" ? -14 : 0;
      limb([sh, [sh[0] - 22, sh[1] + 14 + fling * 0.4], [sh[0] - 40, sh[1] + 6 + fling]], 7, "#c8966f");
      limb([hip, sh], 21, "#ece6d8");
      const handF = p.grab ? [14, -18] : [sh[0] + 38, sh[1] + 10 + fling];
      limb([sh, [sh[0] + 20, sh[1] + 16 + fling * 0.3], handF], 7, "#d6a57d");
      // head, beanie
      const hd = [sh[0] + 5, sh[1] - 21];
      ctx.beginPath();
      ctx.arc(hd[0], hd[1], 14.5, 0, Math.PI * 2);
      ctx.fillStyle = "#0b0b0c";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(hd[0], hd[1], 11, 0, Math.PI * 2);
      ctx.fillStyle = "#d6a57d";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(hd[0], hd[1] - 1, 11.6, Math.PI * 1.02, Math.PI * 1.98);
      ctx.closePath();
      ctx.fillStyle = "#e23b2e";
      ctx.fill();
      ctx.restore();
    };

    const draw = () => {
      if (!patA && asphalt?.complete && asphalt.naturalWidth) patA = ctx.createPattern(asphalt, "repeat");
      if (!patC && concrete?.complete && concrete.naturalWidth) patC = ctx.createPattern(concrete, "repeat");

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const sxk = shake > 0 ? (Math.random() - 0.5) * shake : 0;
      const syk = shake > 0 ? (Math.random() - 0.5) * shake : 0;

      // the city, far away and barely moving
      if (city?.complete && city.naturalWidth) {
        const s = Math.max(W / city.naturalWidth, 700 / city.naturalHeight) * 1.12;
        const dx = -((camX * 0.04) % 120) - 60;
        ctx.drawImage(city, dx, -40 - camY * 0.05, city.naturalWidth * s, city.naturalHeight * s);
        ctx.fillStyle = "rgba(20, 16, 30, 0.28)";
        ctx.fillRect(0, 0, W, H);
      } else {
        ctx.fillStyle = "#5d6470";
        ctx.fillRect(0, 0, W, H);
      }

      // the wall on the far kerb, with what has been pasted on it
      const wx = camX * 0.62;
      const wy = GROUND - 250 - camY * 0.62;
      if (patC) {
        patC.setTransform(new DOMMatrix().translate(-wx, wy).scale(0.5));
        ctx.fillStyle = patC;
        ctx.fillRect(0, wy, W, 400);
      }
      ctx.fillStyle = "rgba(24, 20, 34, 0.42)";
      ctx.fillRect(0, wy, W, 400);
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, wy - 6, W, 8);
      for (const po of wall) {
        const x = po.x * 0.62 - wx;
        if (x < -260 || x > W + 60) continue;
        const im = posters[po.n];
        if (!im?.complete || !im.naturalWidth) continue;
        ctx.save();
        ctx.translate(x + 80, wy + 118);
        ctx.rotate(po.r);
        const ph = 170;
        const pw = (im.naturalWidth / im.naturalHeight) * ph;
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(-pw / 2 + 4, -ph / 2 + 5, pw, ph);
        ctx.globalAlpha = 0.82;
        ctx.drawImage(im, -pw / 2, -ph / 2, pw, ph);
        ctx.restore();
      }

      ctx.save();
      ctx.translate(-camX + sxk, GROUND - camY + syk);

      // the street
      const x0 = camX - 40;
      const x1 = camX + W + 40;
      ctx.beginPath();
      ctx.moveTo(x0, groundAt(x0).y);
      for (const s of segs) {
        if (s.x + s.w < x0 || s.x > x1) continue;
        if (s.stairs) {
          const n = 6;
          for (let i = 0; i < n; i++) {
            const ax = s.x + (s.w * i) / n;
            const ay = s.y0 + ((s.y1 - s.y0) * i) / n;
            ctx.lineTo(ax, ay);
            ctx.lineTo(ax + s.w / n, ay);
            ctx.lineTo(ax + s.w / n, ay + (s.y1 - s.y0) / n);
          }
        } else {
          ctx.lineTo(s.x, s.y0);
          ctx.lineTo(s.x + s.w, s.y1);
        }
      }
      ctx.lineTo(x1, 900);
      ctx.lineTo(x0, 900);
      ctx.closePath();
      if (patA) {
        patA.setTransform(new DOMMatrix().scale(0.42));
        ctx.fillStyle = patA;
      } else ctx.fillStyle = "#3b3b40";
      ctx.fill();
      const shade = ctx.createLinearGradient(0, camY - 40, 0, camY + 260);
      shade.addColorStop(0, "rgba(0,0,0,0)");
      shade.addColorStop(1, "rgba(0,0,0,0.6)");
      ctx.fillStyle = shade;
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(255, 244, 214, 0.5)";
      ctx.stroke();

      // ledges and rails
      for (const r of rails) {
        if (r.x2 < x0 || r.x1 > x1) continue;
        if (r.kind === "ledge") {
          const base = groundAt(r.x1 + 1).y;
          if (patC) {
            patC.setTransform(new DOMMatrix().scale(0.36));
            ctx.fillStyle = patC;
          } else ctx.fillStyle = "#8a8a86";
          ctx.fillRect(r.x1, r.y1, r.x2 - r.x1, base - r.y1);
          ctx.fillStyle = "rgba(0,0,0,0.28)";
          ctx.fillRect(r.x1, r.y1 + 8, r.x2 - r.x1, base - r.y1 - 8);
          // the waxed, chewed-up coping
          ctx.fillStyle = "#c9c2ae";
          ctx.fillRect(r.x1, r.y1, r.x2 - r.x1, 6);
          ctx.fillStyle = "rgba(20,20,20,0.55)";
          for (let x = r.x1 + 12; x < r.x2 - 20; x += 46) ctx.fillRect(x, r.y1 + 1, 18, 2);
        } else {
          ctx.lineCap = "round";
          ctx.strokeStyle = "#0b0b0c";
          ctx.lineWidth = 9;
          for (let x = r.x1 + 14; x < r.x2; x += 120) {
            ctx.beginPath();
            ctx.moveTo(x, railY(r, x));
            ctx.lineTo(x, groundAt(x).y);
            ctx.stroke();
          }
          ctx.beginPath();
          ctx.moveTo(r.x1, r.y1);
          ctx.lineTo(r.x2, r.y2);
          ctx.lineWidth = 11;
          ctx.stroke();
          ctx.strokeStyle = "#d8d4c8";
          ctx.lineWidth = 5;
          ctx.stroke();
          ctx.strokeStyle = "rgba(255,255,255,0.8)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(r.x1, r.y1 - 1.5);
          ctx.lineTo(r.x2, r.y2 - 1.5);
          ctx.stroke();
        }
      }

      // cones and cans
      for (const c of cones) {
        if (c.x < x0 || c.x > x1) continue;
        ctx.save();
        ctx.translate(c.x, c.y);
        if (c.hit) ctx.rotate(1.4);
        ctx.fillStyle = "#0b0b0c";
        ctx.beginPath();
        ctx.moveTo(-17, 2);
        ctx.lineTo(17, 2);
        ctx.lineTo(7, -46);
        ctx.lineTo(-7, -46);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#f26a1b";
        ctx.beginPath();
        ctx.moveTo(-12, -2);
        ctx.lineTo(12, -2);
        ctx.lineTo(5, -42);
        ctx.lineTo(-5, -42);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#f4efe2";
        ctx.fillRect(-8, -27, 16, 7);
        ctx.restore();
      }

      // shadow, then you
      const g = groundAt(p.x);
      let floor = g.y;
      for (const r of rails) if (p.x >= r.x1 && p.x <= r.x2 && railY(r, p.x) >= p.y - 4) floor = Math.min(floor, railY(r, p.x));
      const hgt = Math.max(0, floor - p.y);
      ctx.fillStyle = `rgba(0,0,0,${0.45 - Math.min(0.3, hgt / 500)})`;
      ctx.beginPath();
      ctx.ellipse(p.x, floor + 3, 46 - Math.min(18, hgt / 9), 7, 0, 0, Math.PI * 2);
      ctx.fill();

      const tilt = p.mode === "ground" ? Math.atan(g.slope) : p.mode === "grind" && p.rail ? Math.atan((p.rail.y2 - p.rail.y1) / (p.rail.x2 - p.rail.x1)) : 0;
      drawSkater(p.x, p.y, tilt);

      for (const s of sparks) {
        ctx.fillStyle = `rgba(255, ${190 + Math.floor(Math.random() * 60)}, 90, ${Math.min(1, s.life * 3)})`;
        ctx.fillRect(s.x, s.y, 4, 2.5);
      }
      ctx.restore();
    };

    // ---------------- the loop ----------------
    let raf = 0;
    let last = performance.now();
    let hudClock = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.033, Math.max(0, (now - last) / 1000));
      last = now;

      if (!over) {
        time -= dt;
        if (time <= 0) {
          time = 0;
          over = true;
          bank();
          sound("bail");
          overRef.current(score);
        }
      }

      const has = (...ks: string[]) => ks.some((k) => keys.has(k));
      const prevY = p.y;

      if (p.mode === "bail") {
        p.bailT += dt;
        p.vx *= 1 - dt * 3.2;
        p.vy += G * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const gy = groundAt(p.x).y;
        if (p.y > gy) {
          p.y = gy;
          p.vy = 0;
        }
        if (p.bailT > 1.35) {
          p.mode = "ground";
          p.vx = VMIN + 40;
          p.y = gy;
        }
      } else if (p.mode === "ground") {
        const pushing = has("ArrowRight", "d") && !p.manual;
        const braking = has("ArrowLeft", "a");
        if (pushing) {
          p.vx = Math.min(VMAX, p.vx + 300 * dt);
          p.push = (p.push + dt * 2.1) % 1;
        } else p.push = 0;
        if (braking) p.vx = Math.max(VMIN * 0.7, p.vx - 520 * dt);
        if (!pushing && !braking) p.vx = Math.max(VMIN, p.vx - 36 * dt);

        if (has(" ", "x")) {
          p.charge += dt;
          p.crouch = Math.min(1, p.charge / 0.32);
        } else p.crouch *= 1 - dt * 10;

        const want = has("ArrowDown", "s");
        if (want && !p.manual && combo.length) {
          p.manual = true;
          add("Manual", 40);
        } else if (!want && p.manual) {
          p.manual = false;
          bank();
        } else if (p.manual) add("Manual", 130 * dt);
        if (!p.manual && combo.length && !has(" ", "x")) bank();

        const before = groundAt(p.x);
        p.x += p.vx * dt;
        const after = groundAt(p.x);
        p.vx += after.slope * 520 * dt;
        if (after.y > p.y + 7 + Math.abs(before.slope) * p.vx * dt * 1.6 && !after.stairs) {
          // the street fell away: you are in the air whether you meant it or not
          p.mode = "air";
          p.vy = before.slope * p.vx;
          p.air = 0.2;
        } else p.y = after.y;

        for (const r of rails)
          if (r.kind === "ledge" && p.x > r.x1 - 30 && p.x < r.x1 && p.y > r.y1 + 8) slam();
        for (const c of cones)
          if (!c.hit && Math.abs(p.x - c.x) < 24 && p.y > c.y - 30) {
            c.hit = true;
            slam();
          }
      } else if (p.mode === "air") {
        p.air += dt;
        p.vy += G * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.flip > 0) p.flip = Math.max(0, p.flip - dt * 15.5);
        if (p.shove > 0) p.shove = Math.max(0, p.shove - dt * 12.5);
        const grab = has("ArrowUp", "w") && p.flip === 0 && p.shove === 0;
        if (grab) add("Melon", p.grab ? 190 * dt : 60);
        p.grab = grab;

        // lock on to anything grindable you come down onto
        if (p.vy > 0) {
          for (const r of rails) {
            if (p.x < r.x1 || p.x > r.x2) continue;
            const ry = railY(r, p.x);
            if (prevY <= ry + 6 && p.y >= ry) {
              if (p.flip > 0.5 || p.shove > 0.5 || p.grab) {
                slam();
                break;
              }
              p.mode = "grind";
              p.rail = r;
              p.y = ry;
              p.vy = 0;
              p.flip = 0;
              p.shove = 0;
              const name = has("ArrowDown", "s") ? "Nosegrind" : has("ArrowLeft", "a") ? "Boardslide" : r.kind === "ledge" ? "5-0 grind" : "50-50";
              add(name, name === "50-50" ? 80 : 130);
              ding();
              break;
            }
          }
        }
        // ...and a ledge you did not clear is a wall
        if (p.mode === "air")
          for (const r of rails) if (r.kind === "ledge" && p.x > r.x1 && p.x < r.x1 + 34 && p.y > r.y1 + 14) slam();
        if (p.mode === "air") {
          const gy = groundAt(p.x).y;
          if (p.y >= gy) {
            p.y = gy;
            if (p.flip > 0.6 || p.shove > 0.6 || p.grab) slam();
            else {
              p.mode = "ground";
              p.vy = 0;
              p.flip = 0;
              p.shove = 0;
              p.crouch = 0.9;
              if (p.air > 0.75) add("Big Air", Math.round(p.air * 120));
              if (has("ArrowDown", "s") && combo.length) {
                p.manual = true;
                add("Manual", 40);
              } else if (combo.length) bank();
              else landed(false);
            }
          }
        }
      } else if (p.mode === "grind" && p.rail) {
        const r = p.rail;
        const slope = (r.y2 - r.y1) / (r.x2 - r.x1);
        p.vx = Math.min(VMAX * 1.1, p.vx + slope * 700 * dt + 20 * dt);
        p.x += p.vx * dt;
        add(combo[combo.length - 1]?.name ?? "50-50", 240 * dt);
        if (Math.random() < 0.7) sparks.push({ x: p.x - 24, y: p.y - 4, vx: -80 - Math.random() * 220, vy: -60 - Math.random() * 160, life: 0.35 });
        if (p.x >= r.x2) {
          p.mode = "air";
          p.rail = null;
          p.vy = slope * p.vx - 120;
          p.air = 0.3;
        } else p.y = railY(r, p.x);
      }

      p.lean += ((p.mode === "air" ? -0.08 : p.mode === "grind" ? 0.1 : 0) - p.lean) * Math.min(1, dt * 8);
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life -= dt;
        s.vy += 900 * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        if (s.life <= 0) sparks.splice(i, 1);
      }
      shake = Math.max(0, shake - dt * 40);

      // street ahead, and forget the street behind
      while (built < p.x + 2600) build();
      while (segs.length > 4 && segs[1].x + segs[1].w < p.x - 1200) segs.shift();
      while (rails.length && rails[0].x2 < p.x - 1200) rails.shift();
      while (cones.length && cones[0].x < p.x - 1200) cones.shift();
      while (wall.length && wall[0].x * 0.62 < camX * 0.62 - 400) wall.shift();

      camX += (p.x - 430 + Math.min(120, (p.vx - VMIN) * 0.25) - camX) * Math.min(1, dt * 7);
      camY += (groundAt(p.x).y - camY) * Math.min(1, dt * 3.2);

      sound(over ? "bail" : p.mode);
      draw();

      hudClock += dt;
      if (hudDirty || hudClock > 0.2) {
        hudClock = 0;
        hudDirty = false;
        hudRef.current({ score, combo: combo.map((c) => c.name), pot: Math.round(pot()), mult: combo.length, time, banked, special });
      }
      if (!over) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", down, true);
      window.removeEventListener("keyup", up, true);
      canvas.removeEventListener("pointerdown", press);
      roll?.();
      scrape?.();
    };
  }, [live]);

  return <canvas ref={ref} width={W} height={H} style={{ position: "absolute", inset: 0, width: W, height: H }} />;
}
