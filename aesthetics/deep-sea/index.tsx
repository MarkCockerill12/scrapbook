"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useCanvas } from "@/components/CanvasStage";
import { tone } from "@/lib/audio";
import { useShell } from "@/lib/store";
import styles from "./styles.module.css";

/**
 * Channel 09 — Deep Sea.
 *
 * Fiction: DSV-4 descent log. You go down, it gets worse, nothing reassures you.
 *
 * This is the first page to use the canvas in "width" mode, and the first to earn a
 * scroll under rule R1: scrolling IS descending. The depth gauge, the pressure, the
 * hull creaks and the light all read off scroll position, so the scrollbar is the
 * page's only real control.
 *
 * The other channels are lit. This one is not — nothing has ambient illumination, so
 * most of the frame is genuinely empty and content only exists where your light is.
 */

const W = 1600;
const H = 5400;
const MAX_DEPTH = 10_994; // Challenger Deep, in metres

const ZONES = [
  {
    y: 420,
    depth: 0,
    name: "Surface",
    body: (
      <>
        <b>DSV-4, hatch sealed.</b> Ballast taken on. The support ship is already a
        shape rather than a boat. From here it is four hours down and there is nothing
        to do for any of it.
      </>
    ),
  },
  {
    y: 1120,
    depth: 200,
    name: "Twilight zone",
    body: (
      <>
        Below <b>200 metres</b> there is not enough light to photosynthesise. Below 400
        there is not enough to see by. Everything you meet from here down either makes
        its own light or has stopped bothering with eyes.
      </>
    ),
  },
  {
    y: 1900,
    depth: 1000,
    name: "Midnight zone",
    body: (
      <>
        No sunlight reaches this deep — <b>none</b>, at any hour, ever. And yet most of
        the animals here are luminous. Bioluminescence is not the exception in the
        ocean. It is the norm, and daylight is the local anomaly.
      </>
    ),
  },
  {
    y: 2760,
    depth: 3000,
    name: "Abyssal",
    body: (
      <>
        Pressure at this depth is around <b>300 atmospheres</b>. The viewport is
        90&nbsp;mm of borosilicate and it is being pushed inward with roughly the weight
        of a car on every square centimetre.
      </>
    ),
  },
  {
    y: 3620,
    depth: 6000,
    name: "Hadal",
    body: (
      <>
        Named for Hades. These are the trenches — narrow, cold, and older than most of
        the surface of the planet. More people have been to the moon than to the bottom
        of one.
      </>
    ),
  },
  {
    y: 4480,
    depth: 9000,
    name: "Below the charts",
    body: (
      <>
        The log stops recording detail here. The instruments still work. Nothing is
        wrong. It simply becomes difficult to describe a place where{" "}
        <b>nothing has happened for four million years</b>.
      </>
    ),
  },
];

/** Scroll progress at which a zone marker sits in the middle of the viewport. */
function progressForY(y: number, scale: number, viewportH: number): number {
  const travel = Math.max(H * scale - viewportH, 1);
  return Math.min(Math.max((y * scale - viewportH / 2) / travel, 0), 1);
}

/** Piecewise-linear through the zone anchors, so gauge and markers always agree. */
function depthAt(progress: number, scale: number, viewportH: number): number {
  const anchors: [number, number][] = (
    [
      [0, 0] as [number, number],
      ...ZONES.map(
        (z) => [progressForY(z.y, scale, viewportH), z.depth] as [number, number],
      ),
      [1, MAX_DEPTH] as [number, number],
    ]
  ).sort((a, b) => a[0] - b[0]);

  for (let i = 0; i < anchors.length - 1; i++) {
    const [p0, d0] = anchors[i];
    const [p1, d1] = anchors[i + 1];
    if (progress >= p0 && progress <= p1) {
      const t = p1 === p0 ? 0 : (progress - p0) / (p1 - p0);
      return d0 + (d1 - d0) * t;
    }
  }
  return MAX_DEPTH;
}

interface Creature {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hue: number;
  phase: number;
  kind: 0 | 1 | 2;
}

export default function DeepSea() {
  const { toCanvasSpace, scale } = useCanvas();
  const muted = useShell((s) => s.muted);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lightRef = useRef<HTMLDivElement>(null);
  const pointer = useRef({ x: -9999, y: -9999 });
  const pings = useRef<{ x: number; y: number; r: number; life: number }[]>([]);
  const creatures = useRef<Creature[]>([]);
  const rafRef = useRef(0);

  const [scrollY, setScrollY] = useState(0);
  const [viewportH, setViewportH] = useState(900);
  const [imploded, setImploded] = useState(false);

  /**
   * Scroll drives everything on this page. Both of these MUST come from state rather
   * than being read during render — the component body runs on the server during SSR,
   * where `window` doesn't exist, and reading it there is a 500 rather than a
   * hydration warning.
   */
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    const onResize = () => setViewportH(window.innerHeight);
    onScroll();
    onResize();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const travel = Math.max(H * scale - viewportH, 1);
  const progress = Math.min(Math.max(scrollY / travel, 0), 1);

  /**
   * Depth is interpolated through the zone markers rather than mapped linearly.
   *
   * A linear map put the gauge at 5,541 m while the marker beside it said 3,000 m,
   * which undermines the one thing the page is selling. Anchoring the curve to the
   * markers keeps them honest — and it's truer anyway, since ocean zones are not
   * evenly spaced by depth.
   */
  const depth = Math.round(depthAt(progress, scale, viewportH));
  const atm = (1 + depth / 10).toFixed(0);
  const temp = (18 - progress * 16).toFixed(1);
  const o2 = Math.max(0, 98 - progress * 34).toFixed(0);

  // Hull creaks, spaced out and pressure-dependent. The interval is deliberately
  // irregular — a metronome would read as a machine rather than a threat.
  useEffect(() => {
    if (muted || imploded) return;
    let id: number;
    const schedule = () => {
      const gap = 5200 - progress * 3200 + Math.random() * 3000;
      id = window.setTimeout(() => {
        tone({
          freq: 62 + Math.random() * 40,
          toFreq: 38,
          duration: 0.5 + Math.random() * 0.5,
          type: "sawtooth",
          gain: 0.05 + progress * 0.07,
        });
        schedule();
      }, gap);
    };
    schedule();
    return () => window.clearTimeout(id);
  }, [progress, muted, imploded]);

  // Implosion at the very bottom.
  useEffect(() => {
    if (progress > 0.995 && !imploded) {
      setImploded(true);
      tone({ freq: 320, toFreq: 30, duration: 1.6, type: "sawtooth", gain: 0.2 });
      window.setTimeout(() => setImploded(false), 5200);
    }
  }, [progress, imploded]);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const p = toCanvasSpace(e.clientX, e.clientY);
      pointer.current = p;
      if (lightRef.current) {
        lightRef.current.style.left = `${e.clientX}px`;
        lightRef.current.style.top = `${e.clientY}px`;
      }
    },
    [toCanvasSpace],
  );

  const ping = useCallback(
    (e: React.PointerEvent) => {
      const p = toCanvasSpace(e.clientX, e.clientY);
      pings.current.push({ x: p.x, y: p.y, r: 10, life: 1 });
      if (pings.current.length > 8) pings.current.shift();
      tone({ freq: 1400, toFreq: 620, duration: 0.5, type: "sine", gain: 0.1 });
    },
    [toCanvasSpace],
  );

  // ---- the animals -------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    canvas.width = W;
    canvas.height = H;

    creatures.current = Array.from({ length: 90 }, () => ({
      x: Math.random() * W,
      // Nothing above 900px: the top of the column is lit, and lit water is empty water.
      y: 900 + Math.random() * (H - 1000),
      vx: (Math.random() - 0.5) * 0.34,
      vy: (Math.random() - 0.5) * 0.22,
      r: 2 + Math.random() * 7,
      hue: [170, 186, 196, 280][(Math.random() * 4) | 0],
      phase: Math.random() * Math.PI * 2,
      kind: ((Math.random() * 3) | 0) as Creature["kind"],
    }));

    const frame = () => {
      ctx.clearRect(0, 0, W, H);
      const p = pointer.current;

      for (const c of creatures.current) {
        c.phase += 0.03;

        // Flee the light, drift in the dark. This is the page's one behavioural idea:
        // the thing you're using to see with is the thing driving everything away.
        const dx = c.x - p.x;
        const dy = c.y - p.y;
        const d = Math.hypot(dx, dy);
        if (d < 300 && d > 0.5) {
          const push = (1 - d / 300) * 0.5;
          c.vx += (dx / d) * push;
          c.vy += (dy / d) * push;
        }

        c.vx *= 0.97;
        c.vy *= 0.97;
        c.vx += (Math.random() - 0.5) * 0.03;
        c.vy += (Math.random() - 0.5) * 0.02;

        c.x += c.vx;
        c.y += c.vy;

        if (c.x < -40) c.x = W + 40;
        if (c.x > W + 40) c.x = -40;
        if (c.y < 900) c.y = 900;
        if (c.y > H - 60) c.y = H - 60;

        // Brighter when far from the light — they dim as you close in.
        const shy = Math.min(d / 340, 1);
        const pulse = 0.55 + Math.sin(c.phase) * 0.45;
        const alpha = (0.25 + shy * 0.75) * pulse;

        const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r * 5);
        g.addColorStop(0, `hsla(${c.hue}, 100%, 72%, ${alpha})`);
        g.addColorStop(0.3, `hsla(${c.hue}, 100%, 60%, ${alpha * 0.35})`);
        g.addColorStop(1, "transparent");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r * 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `hsla(${c.hue}, 100%, 88%, ${alpha})`;
        ctx.beginPath();
        if (c.kind === 0) {
          ctx.arc(c.x, c.y, c.r * 0.5, 0, Math.PI * 2);
        } else if (c.kind === 1) {
          // trailing filament
          ctx.ellipse(c.x, c.y, c.r * 0.35, c.r, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = `hsla(${c.hue}, 100%, 80%, ${alpha * 0.4})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(c.x, c.y + c.r);
          ctx.quadraticCurveTo(
            c.x + Math.sin(c.phase) * 12,
            c.y + c.r * 6,
            c.x + Math.sin(c.phase * 0.7) * 18,
            c.y + c.r * 11,
          );
          ctx.stroke();
          continue;
        } else {
          for (let i = 0; i < 5; i++) {
            const a = c.phase + (i / 5) * Math.PI * 2;
            ctx.moveTo(c.x, c.y);
            ctx.arc(c.x + Math.cos(a) * c.r, c.y + Math.sin(a) * c.r, c.r * 0.3, 0, Math.PI * 2);
          }
        }
        ctx.fill();
      }

      // sonar
      for (const s of pings.current) {
        s.r += 7;
        s.life -= 0.012;
        if (s.life <= 0) continue;
        ctx.strokeStyle = `rgba(127,233,216,${s.life * 0.5})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.stroke();
      }
      pings.current = pings.current.filter((s) => s.life > 0);

      rafRef.current = requestAnimationFrame(frame);
    };

    frame();
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // Which zones the light is near — cheap proximity test in canvas space.
  const litZone = (zoneY: number) => {
    const viewCentre = scrollY / scale + viewportH / scale / 2;
    return Math.abs(zoneY - viewCentre) < 420;
  };

  return (
    <div className={styles.root} onPointerMove={onPointerMove} onPointerDown={ping}>
      <div className={styles.column} />
      <div className={styles.sun} />
      <canvas ref={canvasRef} width={W} height={H} className={styles.particles} />

      {ZONES.map((z) => (
        <section
          key={z.depth}
          className={`${styles.zone} ${styles.hidden} ${litZone(z.y) ? styles.revealed : ""}`}
          style={{ top: z.y }}
        >
          <div className={styles.zoneDepth}>
            {z.depth === 0 ? "0" : z.depth.toLocaleString()} m
          </div>
          <div className={styles.zoneName}>{z.name}</div>
          <p className={styles.zoneBody}>{z.body}</p>
        </section>
      ))}

      {/* HUD is fixed to the viewport: it's the sub, and the sub doesn't scroll. */}
      <div className={styles.hud}>
        <div className={styles.porthole} />

        <div className={styles.gauge}>
          <div className={styles.gaugeLabel}>Depth</div>
          <div className={styles.gaugeValue}>{depth.toLocaleString()}</div>
          <div className={styles.gaugeUnit}>metres</div>
          <div className={styles.gaugeBar}>
            <div className={styles.gaugeFill} style={{ height: `${progress * 100}%` }} />
          </div>
        </div>

        <div className={styles.readouts}>
          <div className={styles.readout}>
            <span>PRESSURE</span>
            <b className={progress > 0.72 ? styles.alarm : progress > 0.45 ? styles.warn : ""}>
              {atm} atm
            </b>
          </div>
          <div className={styles.readout}>
            <span>HULL</span>
            <b className={progress > 0.86 ? styles.alarm : progress > 0.6 ? styles.warn : ""}>
              {progress > 0.86 ? "STRESSED" : progress > 0.6 ? "NOMINAL*" : "NOMINAL"}
            </b>
          </div>
          <div className={styles.readout}>
            <span>TEMP</span>
            <b>{temp} °C</b>
          </div>
          <div className={styles.readout}>
            <span>O₂</span>
            <b className={Number(o2) < 72 ? styles.warn : ""}>{o2}%</b>
          </div>
          <div className={styles.readout}>
            <span>LIGHT</span>
            <b>{progress < 0.04 ? "AMBIENT" : "LAMP ONLY"}</b>
          </div>
        </div>

        <div className={styles.hint}>scroll to descend · click to ping</div>

        {progress > 0.86 && !imploded && (
          <div className={`${styles.banner} ${styles.alarm}`}>
            ⚠ hull stress beyond rated depth — ascend
          </div>
        )}

        {imploded && (
          <div className={styles.banner} style={{ color: "#ff4d5a", fontSize: 14 }}>
            HULL BREACH · DSV-4 · NO SIGNAL
          </div>
        )}
      </div>

      <div ref={lightRef} className={styles.cursorLight} />
    </div>
  );
}
