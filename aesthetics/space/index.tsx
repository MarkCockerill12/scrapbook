"use client";

import { useEffect, useRef, useState } from "react";
import { useCanvas } from "@/components/CanvasStage";
import { img } from "@/lib/assets";
import { noiseLoop, unlock } from "@/lib/audio";
import { playNote, useMusic, type Score } from "@/lib/music";
import { useShell } from "@/lib/store";
import styles from "./page.module.css";

/**
 * Deep Space.
 *
 * One continuous outward fall. Twelve real photographs — Hubble, Webb, ESO — ordered
 * by distance, each one growing out of the dark, filling the frame and passing behind
 * you as the next resolves. Nothing to operate: the wheel is the only control, and
 * left alone the page drifts by itself.
 *
 * Every plate is feathered to black, because space is the one backdrop where a
 * photograph's own background is also the page's background. That is what lets
 * twelve unrelated exposures read as a single place.
 */

const A = "space";

interface Stop {
  n: number;
  name: string;
  kind: string;
  /** Light-years. */
  ly: number;
  note: string;
  /** How much of the frame the plate may cover at rest (1 = canvas height). */
  size: number;
}

const STOPS: Stop[] = [
  { n: 7, name: "The Milky Way", kind: "Home", ly: 0, note: "Every star you have ever seen is in this picture.", size: 1.5 },
  { n: 4, name: "Orion Nebula", kind: "Stellar nursery · M42", ly: 1344, note: "The light left when Rome was falling.", size: 1.25 },
  { n: 3, name: "Crab Nebula", kind: "Supernova remnant · M1", ly: 6500, note: "A star that was seen to die in the year 1054.", size: 1.05 },
  { n: 13, name: "Pillars of Creation", kind: "Eagle Nebula · M16", ly: 6500, note: "Each pillar is taller than our solar system is wide — by a thousand times.", size: 1.9 },
  { n: 11, name: "The Cosmic Cliffs", kind: "Carina Nebula · NGC 3324", ly: 7600, note: "The tallest peaks here are seven light-years high.", size: 1.35 },
  { n: 12, name: "Tarantula Nebula", kind: "Large Magellanic Cloud", ly: 161000, note: "The first thing on this journey that is not in our galaxy.", size: 1.35 },
  { n: 8, name: "Andromeda", kind: "Spiral galaxy · M31", ly: 2537000, note: "A trillion suns. It is falling toward us.", size: 1.3 },
  { n: 5, name: "The Whirlpool", kind: "Interacting galaxies · M51", ly: 31000000, note: "Two galaxies, mid-collision, for the last few hundred million years.", size: 1.25 },
  { n: 1, name: "The Sombrero", kind: "Galaxy · M104", ly: 31100000, note: "Seen almost exactly edge-on.", size: 1.2 },
  { n: 10, name: "Stephan's Quintet", kind: "Galaxy group", ly: 290000000, note: "This light is older than the dinosaurs.", size: 1.15 },
  { n: 9, name: "SMACS 0723", kind: "Webb's first deep field", ly: 4600000000, note: "A patch of sky the size of a grain of sand held at arm's length.", size: 1.15 },
  { n: 6, name: "The Ultra Deep Field", kind: "Ten thousand galaxies", ly: 13000000000, note: "Almost nothing here is a star. This is as far as there is to see.", size: 1.1 },
];

const PLATES = STOPS.map((s) => img(A, "sp_obj", s.n));
const LAST = STOPS.length - 1;

function distance(ly: number): { value: string; unit: string } {
  if (ly < 1) return { value: "0", unit: "light-years from home" };
  if (ly < 1e6) return { value: Math.round(ly).toLocaleString("en-GB"), unit: "light-years" };
  if (ly < 1e9) return { value: (ly / 1e6).toLocaleString("en-GB", { maximumFractionDigits: ly < 1e7 ? 2 : 0 }), unit: "million light-years" };
  return { value: (ly / 1e9).toLocaleString("en-GB", { maximumFractionDigits: 1 }), unit: "billion light-years" };
}

// Geometric interpolation: distance climbs by orders of magnitude, so should the readout.
function lyAt(pos: number): number {
  const i = Math.max(0, Math.min(LAST - 1, Math.floor(pos)));
  const f = Math.max(0, Math.min(1, pos - i));
  const a = Math.max(1, STOPS[i].ly);
  const b = Math.max(1, STOPS[i + 1].ly);
  const v = a * (b / a) ** f;
  return pos <= 0.02 ? 0 : v;
}

// A drone that never resolves: stacked fifths, with one high voice wandering.
const ROOTS = [38, 36, 41, 33];
const score: Score = (step, t, d) => {
  const root = ROOTS[Math.floor(step / 64) % ROOTS.length];
  if (step % 64 === 0) {
    for (const [i, off] of [0, 7, 14, 19, 26].entries()) {
      playNote({ freq: root + off, midi: true, dur: d * 62, type: i < 2 ? "sawtooth" : "sine", gain: i < 2 ? 0.018 : 0.03, attack: 4, release: 5, filter: 420, wet: 0.9, detune: 9, pan: (i - 2) / 2.5 }, t);
    }
  }
  if (step % 16 === 9 && (step / 16) % 3 < 2) {
    const m = root + 36 + [0, 2, 7, 9, 14][(step * 5) % 5];
    playNote({ freq: m, midi: true, dur: 1.2, type: "sine", gain: 0.035, attack: 0.3, release: 3.5, wet: 1, pan: Math.sin(step) * 0.7 }, t);
  }
};

interface Star {
  x: number;
  y: number;
  z: number;
  tint: number;
}

export default function Space() {
  const { toCanvasSpace } = useCanvas();
  const muted = useShell((s) => s.muted);
  const root = useRef<HTMLDivElement>(null);
  const plateEls = useRef<(HTMLDivElement | null)[]>([]);
  const starCanvas = useRef<HTMLCanvasElement>(null);
  const readout = useRef<HTMLSpanElement>(null);
  const unitEl = useRef<HTMLSpanElement>(null);
  const railEl = useRef<HTMLSpanElement>(null);
  const target = useRef(0);
  const pos = useRef(0);
  const idleAt = useRef(0);
  const ptr = useRef({ x: 0, y: 0 });
  const [at, setAt] = useState(0);
  const [moved, setMoved] = useState(false);

  useMusic(score, 60);
  useEffect(() => {
    if (muted) return;
    return noiseLoop({ gain: 0.03, lowpass: 180, attack: 4 });
  }, [muted]);

  // The wheel must be a native, non-passive listener to stop the shell scrolling.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      unlock();
      target.current = Math.max(0, Math.min(LAST, target.current + e.deltaY * 0.0011));
      idleAt.current = performance.now();
      setMoved(true);
    };
    const onKey = (e: KeyboardEvent) => {
      const step = e.key === "ArrowDown" || e.key === "PageDown" || e.key === " " ? 1 : e.key === "ArrowUp" || e.key === "PageUp" ? -1 : 0;
      if (!step) return;
      e.preventDefault();
      target.current = Math.max(0, Math.min(LAST, Math.round(target.current) + step));
      idleAt.current = performance.now();
      setMoved(true);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    return () => {
      el.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    const c = starCanvas.current;
    const g = c?.getContext("2d");
    if (!c || !g) return;
    const stars: Star[] = Array.from({ length: 420 }, (_, i) => ({
      x: (((i * 7919) % 2000) / 1000 - 1) * 1700,
      y: (((i * 104729) % 2000) / 1000 - 1) * 1000,
      z: 0.08 + ((i * 31) % 100) / 100,
      tint: i % 7,
    }));
    let raf = 0;
    let last = performance.now();
    let shown = -1;
    idleAt.current = last;

    const frame = (t: number) => {
      const dt = Math.min(3, (t - last) / 16.7);
      last = t;
      // Left alone for a while, the page carries on outward by itself.
      if (t - idleAt.current > 9000 && target.current < LAST) target.current = Math.min(LAST, target.current + 0.0011 * dt);
      const before = pos.current;
      pos.current += (target.current - pos.current) * 0.045 * dt;
      const vel = pos.current - before;
      const p = pos.current;

      for (const [i, el] of plateEls.current.entries()) {
        if (!el) continue;
        const d = p - i;
        if (d < -1.25 || d > 0.95) {
          el.style.opacity = "0";
          el.style.visibility = "hidden";
          continue;
        }
        // Ahead of us it is a point of light; as we pass, it swallows the frame.
        const scale = Math.exp(d * 2.1);
        const fade = d < 0 ? Math.max(0, 1 + d * 1.05) ** 1.6 : Math.max(0, 1 - d * 1.75) ** 1.3;
        const par = 18 * scale;
        el.style.visibility = "visible";
        el.style.opacity = String(fade);
        el.style.transform = `translate3d(${-ptr.current.x * par}px,${-ptr.current.y * par}px,0) scale(${scale}) rotate(${d * (i % 2 ? 5 : -5)}deg)`;
      }

      // Foreground stars: drift at rest, streak when travelling.
      g.clearRect(0, 0, 1600, 900);
      const speed = Math.abs(vel) * 60;
      for (const s of stars) {
        s.z -= vel * 0.9 + 0.00012 * dt;
        if (s.z <= 0.04) s.z += 1;
        if (s.z > 1.04) s.z -= 1;
        const k = 0.5 / s.z;
        const x = 800 + s.x * k - ptr.current.x * 30 * k;
        const y = 450 + s.y * k - ptr.current.y * 30 * k;
        if (x < -20 || x > 1620 || y < -20 || y > 920) continue;
        const a = Math.min(1, (1.05 - s.z) * 1.3) * 0.85;
        const r = Math.min(2.2, 0.35 * k);
        g.fillStyle = s.tint === 0 ? `rgba(255,214,170,${a})` : s.tint === 1 ? `rgba(170,200,255,${a})` : `rgba(255,255,255,${a})`;
        if (speed > 0.25) {
          const len = Math.min(140, speed * 16 * k);
          const dx = x - 800;
          const dy = y - 450;
          const m = Math.hypot(dx, dy) + 0.001;
          g.strokeStyle = g.fillStyle;
          g.lineWidth = r;
          g.beginPath();
          g.moveTo(x, y);
          g.lineTo(x - (dx / m) * len * Math.sign(vel), y - (dy / m) * len * Math.sign(vel));
          g.stroke();
        } else {
          g.beginPath();
          g.arc(x, y, r, 0, Math.PI * 2);
          g.fill();
        }
      }

      const d = distance(lyAt(p));
      if (readout.current) readout.current.textContent = d.value;
      if (unitEl.current) unitEl.current.textContent = d.unit;
      if (railEl.current) railEl.current.style.transform = `scaleY(${p / LAST})`;
      const nearest = Math.round(p);
      if (nearest !== shown && Math.abs(p - nearest) < 0.22) {
        shown = nearest;
        setAt(nearest);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const stop = STOPS[at];

  return (
    <div
      ref={root}
      className={styles.root}
      onPointerDown={() => unlock()}
      onPointerMove={(e) => {
        const p = toCanvasSpace(e.clientX, e.clientY);
        ptr.current = { x: p.x / 800 - 1, y: p.y / 450 - 1 };
      }}
    >
      <div className={styles.field}>
        {STOPS.map((s, i) => {
          const plate = PLATES[i];
          if (!plate) return null;
          const h = 900 * s.size;
          const w = (h * plate.width) / plate.height;
          return (
            <div
              key={s.n}
              ref={(el) => {
                plateEls.current[i] = el;
              }}
              className={styles.plate}
              style={{ width: w, height: h, marginLeft: -w / 2, marginTop: -h / 2 }}
            >
              <img src={plate.src} alt={s.name} draggable={false} />
            </div>
          );
        })}
      </div>

      <canvas ref={starCanvas} className={styles.stars} width={1600} height={900} />
      <div className={styles.vignette} />

      <div className={styles.caption} key={at}>
        <p className={styles.kind}>{stop.kind}</p>
        <h1>{stop.name}</h1>
        <p className={styles.note}>{stop.note}</p>
      </div>

      <div className={styles.odo}>
        <span ref={readout} className={styles.num}>
          0
        </span>
        <span ref={unitEl} className={styles.unit}>
          light-years from home
        </span>
      </div>

      <div className={styles.rail} aria-hidden>
        <span ref={railEl} />
        {STOPS.map((s, i) => (
          <button
            key={s.n}
            type="button"
            title={s.name}
            data-on={i === at || undefined}
            style={{ top: `${(i / LAST) * 100}%` }}
            onClick={() => {
              unlock();
              target.current = i;
              idleAt.current = performance.now();
              setMoved(true);
            }}
          />
        ))}
      </div>

      <p className={styles.hint} data-gone={moved || undefined}>
        scroll to fall outward
      </p>
    </div>
  );
}
