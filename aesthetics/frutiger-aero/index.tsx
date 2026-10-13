"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { useCanvas } from "@/components/CanvasStage";
import { cutN, img } from "@/lib/assets";
import { chime, droplet, noiseLoop, pop, unlock } from "@/lib/audio";
import { playNote, useMusic, type Score } from "@/lib/music";
import { sbGet, sbSet } from "@/lib/storage";
import { useShell } from "@/lib/store";
import styles from "./styles.module.css";

/**
 * Channel 01 — Frutiger Aero.
 *
 * Not a desktop (that is the Vista channel now). This is the picture the aesthetic
 * kept painting on every box, wallpaper and keynote slide between 2004 and 2012: a
 * split-level view — impossible blue sky and wet green grass above, sunlit water and
 * tropical fish below, one glass sphere sitting exactly on the waterline.
 *
 * One scene, one sun. Everything is lit from the same top-right source and every
 * mood regrades the whole frame at once, so nothing reads as pasted on.
 */

const A = "frutiger-aero";
const W = 1600;
const H = 900;
const WL_MIN = 150;
const WL_MAX = 720;
const WL_HOME = 520;

type Mood = "day" | "dusk" | "aurora";
const MOODS: { id: Mood; label: string }[] = [
  { id: "day", label: "Midday" },
  { id: "dusk", label: "Golden hour" },
  { id: "aurora", label: "Aurora" },
];

const SKY = img(A, "fa_ref", 20);
const SEA = img(A, "fa_ref", 19);
const AURORA = img(A, "fa_aurora", 8);
const FISH_ART = [cutN(A, "fa_fish", 2), cutN(A, "fa_fish", 3), cutN(A, "fa_fish", 4), cutN(A, "fa_fish", 1)];
const MORPHO = cutN(A, "fa_butterfly", 2);

/** The city the aesthetic always put on the horizon: real glass towers, matted out
 *  of their own skies and stood behind the hill in this one. */
const TOWERS = [
  { n: 6, x: 150, h: 250 },
  { n: 5, x: 610, h: 170 },
  { n: 7, x: 1090, h: 290 },
  { n: 3, x: 1420, h: 200, flip: true },
];

/** Things the era kept inside glass. Each bubble holds a real photograph. */
const ORBS = [
  { id: "dew", slot: "fa_dew", n: 2, x: 250, y: 250, d: 150, label: "dew on a leaf, 8 megapixels" },
  { id: "city", slot: "fa_ov", n: 1, x: 1240, y: 190, d: 128, label: "a city made of sky" },
  { id: "dolphin", slot: "fa_dolphin", n: 4, x: 910, y: 130, d: 136, label: "picture of a dolphin for some reason" },
  { id: "tower", slot: "fa_ov", n: 5, x: 470, y: 120, d: 90, label: "glass, reflecting cloud" },
];

interface Fish {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  art: number;
  depth: number;
  phase: number;
}

interface Bubble {
  x: number;
  y: number;
  r: number;
  vy: number;
  phase: number;
}

interface Ring {
  x: number;
  age: number;
}

function makeFish(): Fish[] {
  // Seeded by index, not Math.random — the school must be identical on server and client.
  return Array.from({ length: 13 }, (_, i) => {
    const depth = 0.55 + ((i * 37) % 10) / 22;
    return {
      x: 120 + ((i * 263) % 1360),
      y: 640 + ((i * 97) % 190),
      vx: (i % 2 ? 1 : -1) * (0.5 + (i % 4) * 0.2),
      vy: 0,
      size: (i % 5 === 0 ? 150 : 84 + (i % 3) * 22) * depth,
      art: i % FISH_ART.length,
      depth,
      phase: i * 1.7,
    };
  });
}

// Lydian, slow: the sound of a product demo in a glass atrium.
const CHORDS = [
  [53, 60, 64, 69, 71],
  [50, 57, 62, 66, 69],
  [55, 62, 66, 69, 74],
  [48, 55, 60, 64, 67],
];
const score: Score = (step, t, d) => {
  const bar = Math.floor(step / 32) % CHORDS.length;
  const chord = CHORDS[bar];
  if (step % 32 === 0) {
    for (const [i, m] of chord.entries()) {
      playNote({ freq: m, midi: true, dur: d * 30, type: "sine", gain: 0.035, attack: 1.6, release: 2.4, wet: 0.7, detune: 6, pan: (i - 2) / 3 }, t);
    }
  }
  if (step % 4 === 2 && (step * 7) % 5 < 3) {
    const m = chord[(step * 3) % chord.length] + 12 + (step % 16 === 6 ? 12 : 0);
    playNote({ freq: m, midi: true, dur: 0.5, type: "triangle", gain: 0.05, attack: 0.004, release: 1.2, wet: 0.8, pan: Math.sin(step) * 0.6 }, t);
  }
};

export default function FrutigerAero() {
  const { toCanvasSpace } = useCanvas();
  const muted = useShell((s) => s.muted);
  const [mood, setMood] = useState<Mood>("day");
  const [wl, setWl] = useState(WL_HOME);
  const [now, setNow] = useState<Date | null>(null);
  const [fish] = useState(makeFish);
  const [open, setOpen] = useState<string | null>(null);

  const wlRef = useRef(WL_HOME);
  const ptr = useRef({ x: -999, y: -999, t: 0 });
  const fishEls = useRef<(HTMLDivElement | null)[]>([]);
  const flyEls = useRef<(HTMLDivElement | null)[]>([]);
  const orbEl = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const bubbles = useRef<Bubble[]>([]);
  const rings = useRef<Ring[]>([]);
  const scare = useRef(0);
  const dragging = useRef(false);

  useEffect(() => {
    setMood(sbGet<Mood>(A, "mood", "day"));
    const saved = sbGet(A, "waterline", WL_HOME);
    wlRef.current = saved;
    setWl(saved);
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  useMusic(score, 66);
  useEffect(() => {
    if (muted) return;
    // Two beds: open air above, a low wash below.
    const a = noiseLoop({ gain: 0.018, lowpass: 2400, highpass: 500, attack: 2 });
    const b = noiseLoop({ gain: 0.05, lowpass: 320, attack: 2 });
    return () => {
      a();
      b();
    };
  }, [muted]);

  const pickMood = (m: Mood) => {
    unlock();
    chime(m !== "aurora");
    setMood(m);
    sbSet(A, "mood", m);
  };

  const burst = useCallback((x: number, y: number, n: number) => {
    for (let i = 0; i < n; i++) {
      bubbles.current.push({
        x: x + (Math.random() - 0.5) * 36,
        y: y + (Math.random() - 0.5) * 24,
        r: 3 + Math.random() * 13,
        vy: 0.7 + Math.random() * 1.5,
        phase: Math.random() * 6,
      });
    }
    if (bubbles.current.length > 260) bubbles.current.splice(0, bubbles.current.length - 260);
  }, []);

  /* --------------------------------------------------------------- the loop */
  useEffect(() => {
    const c = canvas.current;
    const g = c?.getContext("2d");
    if (!c || !g) return;
    const flies = [
      { x: 380, y: 250, tx: 380, ty: 250, s: 0 },
      { x: 1180, y: 190, tx: 1180, ty: 190, s: 2.4 },
    ];
    let raf = 0;
    let last = performance.now();
    let vent = 0;

    const frame = (t: number) => {
      const dt = Math.min(2.5, (t - last) / 16.7);
      last = t;
      const line = wlRef.current;
      const p = ptr.current;
      const under = p.y > line + 10;

      // Fish: wander, school toward a pointer that is in the water, bolt on a click.
      scare.current = Math.max(0, scare.current - 0.02 * dt);
      for (const [i, f] of fish.entries()) {
        const cruise = (0.5 + f.depth * 0.5) * (f.vx >= 0 ? 1 : -1);
        f.vx += (cruise - f.vx) * 0.012 * dt;
        f.vy += (Math.sin(t / 1400 + f.phase) * 0.12 - f.vy) * 0.03 * dt;
        if (under) {
          const dx = p.x - f.x;
          const dy = p.y - f.y;
          const dist = Math.hypot(dx, dy) + 1;
          if (scare.current > 0) {
            if (dist < 420) {
              f.vx -= (dx / dist) * 0.9 * scare.current * dt;
              f.vy -= (dy / dist) * 0.5 * scare.current * dt;
            }
          } else if (dist < 520 && dist > 70) {
            f.vx += (dx / dist) * 0.035 * dt;
            f.vy += (dy / dist) * 0.028 * dt;
          }
        }
        const top = line + 46 + f.size * 0.3;
        if (f.y < top) f.vy += 0.09 * dt;
        if (f.y > H - 50) f.vy -= 0.09 * dt;
        f.vx = Math.max(-5, Math.min(5, f.vx));
        f.vy = Math.max(-2.4, Math.min(2.4, f.vy));
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        if (f.x < -180) f.x = W + 160;
        if (f.x > W + 180) f.x = -160;
        const el = fishEls.current[i];
        if (el) {
          const tilt = Math.max(-18, Math.min(18, f.vy * 9)) * (f.vx >= 0 ? 1 : -1);
          el.style.transform = `translate3d(${f.x - f.size / 2}px,${f.y - f.size / 3}px,0) scaleX(${f.vx >= 0 ? -1 : 1}) rotate(${tilt}deg)`;
          el.style.opacity = f.y < line + 20 ? "0" : String(0.55 + f.depth * 0.45);
        }
      }

      // Butterflies: lazy figure-eights over the meadow, drawn to a pointer in the air.
      for (const [i, b] of flies.entries()) {
        const air = !under && p.y > 0 && t - p.t < 4000;
        const hx = air ? p.x + (i ? 46 : -46) : (i ? 1160 : 400) + Math.sin(t / 2600 + b.s) * 190;
        const hy = air ? p.y - 34 : Math.min(line - 110, 250) + Math.sin(t / 1700 + b.s * 2) * 70;
        b.tx += (hx - b.tx) * 0.02 * dt;
        b.ty += (Math.min(hy, line - 50) - b.ty) * 0.02 * dt;
        b.x += (b.tx - b.x) * 0.05 * dt;
        b.y += (b.ty - b.y) * 0.05 * dt + Math.sin(t / 130 + b.s) * 0.7;
        const el = flyEls.current[i];
        if (el) {
          el.style.transform = `translate3d(${b.x - 36}px,${b.y - 30}px,0) rotate(${(b.tx - b.x) * 0.25}deg)`;
          el.style.opacity = line < 190 ? "0" : "1";
        }
      }

      // The sphere bobs on whatever the water is doing.
      if (orbEl.current) {
        orbEl.current.style.transform = `translate3d(0,${line - 118 + Math.sin(t / 900) * 5}px,0) rotate(${Math.sin(t / 1300) * 1.6}deg)`;
      }

      // Bubbles + surface rings.
      vent += dt;
      if (vent > 9) {
        vent = 0;
        const vx = [250, 820, 1330][Math.floor(Math.random() * 3)];
        bubbles.current.push({ x: vx + (Math.random() - 0.5) * 30, y: H + 10, r: 2 + Math.random() * 6, vy: 0.8 + Math.random(), phase: Math.random() * 6 });
      }
      g.clearRect(0, 0, W, H);
      const keep: Bubble[] = [];
      for (const b of bubbles.current) {
        b.y -= b.vy * dt * (1 + b.r / 14);
        b.x += Math.sin(t / 260 + b.phase) * 0.5 * dt;
        if (Math.hypot(b.x - p.x, b.y - p.y) < b.r + 8 && b.r > 7) {
          pop(1.2 - b.r / 30);
          continue;
        }
        if (b.y < line + 4) {
          rings.current.push({ x: b.x, age: 0 });
          continue;
        }
        keep.push(b);
        const grad = g.createRadialGradient(b.x - b.r * 0.35, b.y - b.r * 0.4, b.r * 0.1, b.x, b.y, b.r);
        grad.addColorStop(0, "rgba(255,255,255,0.75)");
        grad.addColorStop(0.35, "rgba(210,245,255,0.12)");
        grad.addColorStop(1, "rgba(255,255,255,0.5)");
        g.fillStyle = grad;
        g.beginPath();
        g.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        g.fill();
      }
      bubbles.current = keep;
      rings.current = rings.current.filter((r) => r.age < 1);
      for (const r of rings.current) {
        r.age += 0.03 * dt;
        g.strokeStyle = `rgba(255,255,255,${0.7 * (1 - r.age)})`;
        g.lineWidth = 1.5;
        g.beginPath();
        g.ellipse(r.x, line + 2, 6 + r.age * 26, 1.5 + r.age * 4, 0, 0, Math.PI * 2);
        g.stroke();
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [fish]);

  /* ----------------------------------------------------------------- input */
  const onMove = (e: ReactPointerEvent) => {
    const p = toCanvasSpace(e.clientX, e.clientY);
    ptr.current = { x: p.x, y: p.y, t: performance.now() };
    if (dragging.current) {
      const next = Math.max(WL_MIN, Math.min(WL_MAX, p.y));
      wlRef.current = next;
      setWl(next);
    }
  };
  const onDown = (e: ReactPointerEvent) => {
    unlock();
    if ((e.target as HTMLElement).closest("button")) return;
    const p = toCanvasSpace(e.clientX, e.clientY);
    if (p.y > wlRef.current + 10) {
      burst(p.x, p.y, 16);
      scare.current = 1;
      droplet(0.7 + Math.random() * 0.5);
    } else {
      // A pebble: it lands on the water directly below.
      rings.current.push({ x: p.x, age: 0 });
      burst(p.x, wlRef.current + 30, 7);
      droplet(1.2);
    }
  };
  const endDrag = () => {
    if (!dragging.current) return;
    dragging.current = false;
    sbSet(A, "waterline", wlRef.current);
  };

  const flooded = wl < 230;
  const hh = now ? String(now.getHours()).padStart(2, "0") : "--";
  const mm = now ? String(now.getMinutes()).padStart(2, "0") : "--";
  const date = now ? now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) : "";

  return (
    <div
      className={styles.root}
      data-mood={mood}
      data-flooded={flooded || undefined}
      style={{ "--wl": `${wl}px` } as CSSProperties}
      onPointerMove={onMove}
      onPointerDown={onDown}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
    >
      {/* ---- above the water */}
      <div className={styles.air}>
        {SKY && <img className={styles.sky} src={SKY.src} alt="" draggable={false} />}
        <div className={styles.skyline}>
          {TOWERS.map((tw) => {
            const cut = cutN(A, "fa_ov", tw.n);
            return cut ? <img key={tw.n} src={cut.src} alt="" draggable={false} style={{ left: tw.x, height: tw.h, transform: tw.flip ? "scaleX(-1)" : undefined }} /> : null;
          })}
        </div>
        <div className={styles.rainbow} />
        {AURORA && <img className={styles.aurora} src={AURORA.src} alt="" draggable={false} />}
        <div className={styles.sun} />
        <div className={styles.grade} />
      </div>

      {/* ---- below it */}
      <div className={styles.sea}>
        {SEA && <img className={styles.seaImg} src={SEA.src} alt="" draggable={false} />}
        <div className={styles.rays} />
        <div className={styles.seaGrade} />
        <svg className={styles.surface} viewBox="0 0 3200 60" preserveAspectRatio="none" aria-hidden>
          <path className={styles.swellB} d="M0 26 Q200 6 400 26 T800 26 T1200 26 T1600 26 T2000 26 T2400 26 T2800 26 T3200 26 V60 H0Z" />
          <path className={styles.swellA} d="M0 22 Q160 40 320 22 T640 22 T960 22 T1280 22 T1600 22 T1920 22 T2240 22 T2560 22 T2880 22 T3200 22 V0 H0Z" />
          <path className={styles.glint} d="M0 22 Q160 40 320 22 T640 22 T960 22 T1280 22 T1600 22 T1920 22 T2240 22 T2560 22 T2880 22 T3200 22" />
        </svg>
      </div>

      {fish.map((f, i) => {
        const art = FISH_ART[f.art];
        return art ? (
          <div
            key={i}
            ref={(el) => {
              fishEls.current[i] = el;
            }}
            className={styles.fish}
            style={{ width: f.size, filter: `blur(${(1 - f.depth) * 2.2}px)` }}
          >
            <img src={art.src} alt="" draggable={false} />
          </div>
        ) : null;
      })}

      {MORPHO &&
        [0, 1].map((i) => (
          <div
            key={i}
            ref={(el) => {
              flyEls.current[i] = el;
            }}
            className={styles.fly}
          >
            <img src={MORPHO.src} alt="" draggable={false} style={{ animationDelay: `${i * -0.13}s` }} />
          </div>
        ))}

      <canvas ref={canvas} className={styles.bubbles} width={W} height={H} />

      {/* ---- soap bubbles, each with a photograph caught in it */}
      {ORBS.map((o, i) => {
        const ph = img(A, o.slot, o.n);
        return ph ? (
          <button
            key={o.id}
            type="button"
            className={styles.photoOrb}
            data-open={open === o.id || undefined}
            style={{ left: o.x, top: o.y, width: o.d, height: o.d, animationDelay: `${i * -3.1}s` }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => {
              unlock();
              pop(open === o.id ? 0.8 : 1.3);
              setOpen(open === o.id ? null : o.id);
            }}
            aria-label={o.label}
          >
            <img src={ph.src} alt="" draggable={false} />
            <i />
            <span>{o.label}</span>
          </button>
        ) : null;
      })}

      {/* ---- the sphere on the waterline */}
      <div ref={orbEl} className={styles.orb}>
        <div className={styles.orbGlass} />
        <div className={styles.orbFace}>
          <span className={styles.time}>
            {hh}
            <i>:</i>
            {mm}
          </span>
          <span className={styles.date}>{date}</span>
        </div>
        <div className={styles.orbShine} />
      </div>

      {/* ---- the float you drag to set the water level */}
      <button
        type="button"
        className={styles.float}
        aria-label="Drag to raise or lower the water"
        onPointerDown={(e) => {
          unlock();
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerUp={endDrag}
      >
        <span />
      </button>

      <header className={styles.mark}>
        <h1>frutiger aero</h1>
      </header>

      <nav className={styles.moods} aria-label="Time of day">
        {MOODS.map((m) => (
          <button key={m.id} type="button" data-on={mood === m.id || undefined} data-mood={m.id} onClick={() => pickMood(m.id)}>
            <span className={styles.gel} />
            {m.label}
          </button>
        ))}
      </nav>

    </div>
  );
}
