"use client";
/* eslint-disable @next/next/no-img-element --
   Deliberate. These are canvas-space cutouts sized in px against a fixed 1600x900
   stage, already optimised to WebP by the asset pipeline and served from one origin.
   next/image would re-encode them (killing alpha fidelity on matted edges), fight the
   explicit sizing, and add no benefit on a page where every image is above the fold. */

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useCanvas } from "@/components/CanvasStage";
import { chime, tick, tone } from "@/lib/audio";
import { cut, one } from "@/lib/assets";
import { sbGet, sbSet } from "@/lib/storage";
import styles from "./styles.module.css";

/**
 * Channel 05 — Tropical Night.
 *
 * Fiction: Kai's Tiki Lounge, tonight's menu. Somewhere warm, after dark.
 *
 * The FIRST channel composited from real photography rather than drawn, so it's the
 * test of whether the cutout pipeline actually holds up. A dozen photos taken by
 * different people in different light have to read as one place at one time — which
 * is done with a shared warm grade, a single low light source, and warm-tinted
 * shadows under every cutout.
 *
 * Single viewport, no scroll.
 */

const A = "tiki";
const W = 1600;
const H = 900;

const TORCHES = [
  { x: 60, scale: 1.05 },
  { x: 300, scale: 0.84 },
  { x: 1080, scale: 0.88 },
  { x: 1330, scale: 1.1 },
];

const LANTERNS = [
  { x: 250, drop: 40, scale: 0.7 },
  { x: 470, drop: 78, scale: 0.86 },
  { x: 700, drop: 34, scale: 0.64 },
  { x: 920, drop: 70, scale: 0.8 },
  { x: 1160, drop: 44, scale: 0.72 },
  { x: 1370, drop: 84, scale: 0.9 },
];

interface Drink {
  name: string;
  price: string;
}

const MENU: Drink[] = [
  { name: "Mai Tai", price: "9" },
  { name: "Zombie", price: "12" },
  { name: "Painkiller", price: "10" },
  { name: "Blue Hawaii", price: "9" },
  { name: "Fog Cutter", price: "11" },
  { name: "Navy Grog", price: "10" },
  { name: "Singapore Sling", price: "11" },
  { name: "Rum Runner", price: "9" },
];

/** Layer stacks, kept separate so the menu table stays readable. */
const RECIPES: Record<string, { colour: string; h: number }[]> = {
  "Mai Tai": [
    { colour: "#7d3f12", h: 26 },
    { colour: "#d4791f", h: 34 },
    { colour: "#f2b048", h: 22 },
  ],
  Zombie: [
    { colour: "#8c1f10", h: 30 },
    { colour: "#e0561c", h: 30 },
    { colour: "#ffc25c", h: 20 },
  ],
  Painkiller: [
    { colour: "#a5601f", h: 24 },
    { colour: "#e8b169", h: 40 },
    { colour: "#f7e0b8", h: 16 },
  ],
  "Blue Hawaii": [
    { colour: "#0f4f8c", h: 32 },
    { colour: "#1f9fd4", h: 30 },
    { colour: "#a9e7f7", h: 18 },
  ],
  "Fog Cutter": [
    { colour: "#6b3f1a", h: 28 },
    { colour: "#c98a3e", h: 32 },
    { colour: "#efd3a4", h: 20 },
  ],
  "Navy Grog": [
    { colour: "#3f2410", h: 34 },
    { colour: "#8a4f1c", h: 30 },
    { colour: "#d9a05a", h: 16 },
  ],
  "Singapore Sling": [
    { colour: "#8c1330", h: 30 },
    { colour: "#d94f6a", h: 32 },
    { colour: "#f6b7c4", h: 18 },
  ],
  "Rum Runner": [
    { colour: "#5c1220", h: 30 },
    { colour: "#b8302f", h: 32 },
    { colour: "#e88b5c", h: 18 },
  ],
};

export default function Tiki() {
  const { toCanvasSpace } = useCanvas();

  const [sun, setSun] = useState(0.55);
  const [wind, setWind] = useState(0.35);
  const [lit, setLit] = useState<boolean[]>(() => TORCHES.map(() => true));
  const [drink, setDrink] = useState("Mai Tai");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ripples = useRef<{ x: number; y: number; r: number; life: number }[]>([]);
  const rafRef = useRef(0);

  const litCount = lit.filter(Boolean).length;
  const allOut = litCount === 0;

  useEffect(() => {
    setDrink(sbGet<string>(A, "drink", "Mai Tai"));
  }, []);

  // Ripples on the water, and the plankton that appear once every torch is out.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    canvas.width = W;
    canvas.height = H;

    const motes = Array.from({ length: 140 }, () => ({
      x: Math.random() * W,
      y: 540 + Math.random() * 340,
      p: Math.random() * Math.PI * 2,
      r: 1 + Math.random() * 2.4,
    }));

    const frame = () => {
      ctx.clearRect(0, 0, W, H);

      if (allOut) {
        for (const m of motes) {
          m.p += 0.02;
          m.x += Math.sin(m.p) * 0.22;
          const a = 0.28 + Math.sin(m.p * 1.7) * 0.28;
          const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 7);
          g.addColorStop(0, `rgba(150,255,225,${a})`);
          g.addColorStop(1, "transparent");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(m.x, m.y, m.r * 7, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      for (const r of ripples.current) {
        r.r += 3.2;
        r.life -= 0.016;
        if (r.life <= 0) continue;
        ctx.strokeStyle = allOut
          ? `rgba(150,255,225,${r.life * 0.6})`
          : `rgba(255,196,130,${r.life * 0.5})`;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.ellipse(r.x, r.y, r.r, r.r * 0.3, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ripples.current = ripples.current.filter((r) => r.life > 0);

      rafRef.current = requestAnimationFrame(frame);
    };
    frame();
    return () => cancelAnimationFrame(rafRef.current);
  }, [allOut]);

  const onSea = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const p = toCanvasSpace(e.clientX, e.clientY);
      ripples.current.push({ x: p.x, y: p.y, r: 6, life: 1 });
      tone({ freq: 300, toFreq: 140, duration: 0.22, type: "sine", gain: 0.06 });
    },
    [toCanvasSpace],
  );

  const toggleTorch = (i: number) => {
    setLit((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
    if (lit[i]) {
      tone({ freq: 220, toFreq: 80, duration: 0.3, type: "sawtooth", gain: 0.06 });
    } else {
      tone({ freq: 90, toFreq: 260, duration: 0.34, type: "sawtooth", gain: 0.07 });
    }
  };

  const sky = one(A, "tiki_sunset", 3);
  const sea = one(A, "tiki_ocean", 0);
  const recipe = RECIPES[drink] ?? RECIPES["Mai Tai"];

  // Every lit torch adds light; with all of them out the scene falls to the plankton.
  const litFactor = litCount / TORCHES.length;

  return (
    <div
      className={styles.root}
      style={{ "--tk-sun": sun } as React.CSSProperties}
    >
      {/* sky */}
      <div className={styles.sky}>
        {sky && <img className={styles.skyPhoto} src={sky.src} alt="" />}
        <div className={styles.skyWash} />
      </div>

      {/* sea */}
      <div className={styles.sea} onPointerDown={onSea} style={{ cursor: "pointer" }}>
        {sea && <img className={styles.seaPhoto} src={sea.src} alt="" />}
        <div className={styles.seaWash} />
      </div>

      <canvas ref={canvasRef} width={W} height={H} className={styles.plankton} />

      {/* palms at the edges */}
      {[0, 1, 2, 3].map((i) => {
        const p = cut(A, "tiki_palm", i);
        if (!p) return null;
        const left = i < 2;
        return (
          <img
            key={i}
            src={p.src}
            alt=""
            className={styles.palm}
            style={{
              [left ? "left" : "right"]: i % 2 === 0 ? -60 : 40,
              height: 420 + (i % 2) * 130,
              transform: `rotate(${(left ? 1 : -1) * (2 + wind * 5)}deg) scaleX(${left ? 1 : -1})`,
              transition: "transform 900ms ease-in-out",
            }}
          />
        );
      })}

      {/* lanterns strung across the top */}
      {LANTERNS.map((l, i) => {
        const img = cut(A, "tiki_lantern", i);
        if (!img) return null;
        return (
          <div
            key={i}
            className={styles.lantern}
            style={{
              left: l.x,
              transform: `rotate(${Math.sin(i * 1.7) * (1 + wind * 7)}deg)`,
              transition: "transform 1200ms ease-in-out",
            }}
          >
            <div style={{ height: l.drop, width: 2, background: "rgba(255,220,180,.3)", margin: "0 auto" }} />
            <div style={{ position: "relative" }}>
              <div className={styles.lanternGlow} style={{ opacity: 0.4 + sun * 0.3 }} />
              <img
                src={img.src}
                alt=""
                style={{
                  display: "block",
                  height: 130 * l.scale,
                  filter: `brightness(${0.6 + litFactor * 0.5}) drop-shadow(0 0 18px rgba(255,170,80,.5))`,
                }}
              />
            </div>
          </div>
        );
      })}

      {/* the board */}
      <section className={styles.board}>
        <h1 className={styles.boardTitle}>Kai&apos;s Tiki Lounge</h1>
        <div className={styles.boardSub}>Tonight&apos;s menu · open till late</div>
        <div className={styles.rule} />
        <div className={styles.menuGrid}>
          {MENU.map((d) => (
            <button
              key={d.name}
              type="button"
              className={`${styles.item} ${drink === d.name ? styles.itemActive : ""}`}
              onClick={() => {
                setDrink(d.name);
                sbSet(A, "drink", d.name);
                chime(true);
              }}
            >
              <span>{d.name}</span>
              <span className={styles.itemPrice}>{d.price}</span>
            </button>
          ))}
        </div>
      </section>

      {/* carvings and mugs on a shelf */}
      <div className={styles.shelf}>
        {[0, 1, 2].map((i) => {
          const c = cut(A, i === 1 ? "tiki_mug" : "tiki_carving", i);
          if (!c) return null;
          return (
            <img
              key={i}
              src={c.src}
              alt=""
              style={{
                display: "block",
                height: i === 1 ? 170 : 200,
                filter: `brightness(${0.42 + litFactor * 0.5}) drop-shadow(0 10px 14px rgba(30,8,0,.75))`,
                transition: "filter 320ms linear",
              }}
            />
          );
        })}
      </div>

      {/* the glass */}
      <div className={styles.bar}>
        <div className={styles.glass}>
          {recipe.map((l, i) => (
            <div
              key={i}
              className={styles.layer}
              style={{ background: l.colour, height: `${l.h}%` }}
            />
          ))}
        </div>
        <div className={styles.glassLabel}>{drink}</div>
      </div>

      {/* torches */}
      {TORCHES.map((t, i) => {
        const img = cut(A, "tiki_torch", i);
        if (!img) return null;
        return (
          <button
            key={i}
            type="button"
            aria-label={`Torch ${i + 1}`}
            aria-pressed={lit[i]}
            className={`${styles.torch} ${lit[i] ? "" : styles.torchOut}`}
            style={{ left: t.x, width: 210 * t.scale }}
            onClick={() => toggleTorch(i)}
          >
            {lit[i] && <span className={styles.flame} style={{ animationDelay: `${i * 0.31}s` }} />}
            <img className={styles.torchImg} src={img.src} alt="" />
          </button>
        );
      })}

      <div className={styles.grade} />
      <div className={styles.vignette} />

      <div className={styles.controls}>
        <label className={styles.ctl}>
          Sun
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(sun * 100)}
            onChange={(e) => {
              setSun(Number(e.target.value) / 100);
              tick();
            }}
            onKeyDown={(e) => e.stopPropagation()}
          />
        </label>
        <label className={styles.ctl}>
          Wind
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(wind * 100)}
            onChange={(e) => {
              setWind(Number(e.target.value) / 100);
              tick();
            }}
            onKeyDown={(e) => e.stopPropagation()}
          />
        </label>
        <span className={styles.ctl} style={{ color: allOut ? "#8ff2d8" : undefined }}>
          {allOut ? "the water is glowing" : `${litCount} of ${TORCHES.length} lit`}
        </span>
      </div>

      <div className={styles.hint}>
        click the torches · tap the water
        <br />
        put every torch out
      </div>
    </div>
  );
}
