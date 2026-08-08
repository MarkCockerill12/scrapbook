"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCanvas } from "@/components/CanvasStage";
import { cut, pic } from "@/lib/assets";
import { sbGet, sbSet } from "@/lib/storage";
import { useShell } from "@/lib/store";
import { bell, bird, kettle, purr, snip, startRain, startWind } from "./sound";
import styles from "./styles.module.css";

/**
 * Channel 03 — Cottagecore.
 *
 * Fiction: *A window seat, a cup of tea, and no urgency.*
 *
 * The demo argument: this aesthetic is almost always attempted as "beige page,
 * serif font". What actually makes it is **paper grain over everything including the
 * photographs** — one multiply layer is what fuses cut-out photos and drawn shapes
 * into a single painted image — plus the rule that nothing is still and nothing is
 * fast. Grass, laundry and curtains all move, on different periods, none of them
 * quickly.
 *
 * Assets: `raw/cottagecore/` — a real wildflower meadow, a real cat, real laundry
 * and sill objects, all matted and then painted over with grain.
 */

const SLUG = "cottagecore";

type Season = "spring" | "summer" | "autumn" | "winter";

const SEASONS: Record<
  Season,
  { grade: string; sky: string; sunTop: number; sunColour: string; wash: string }
> = {
  spring: {
    grade: "saturate(1.3) contrast(1.02) brightness(1.0) hue-rotate(-6deg)",
    sky: "linear-gradient(180deg, #cfe2f2 0%, rgba(207,226,242,0) 100%)",
    sunTop: 90,
    sunColour: "radial-gradient(circle, rgba(255,248,214,0.95), rgba(255,236,170,0) 70%)",
    wash: "radial-gradient(ellipse 60% 50% at 22% 16%, rgba(255,240,200,0.4), transparent 70%)",
  },
  summer: {
    grade: "saturate(1.45) contrast(1.04) brightness(1.02)",
    sky: "linear-gradient(180deg, #a9d6f2 0%, rgba(169,214,242,0) 100%)",
    sunTop: 40,
    sunColour: "radial-gradient(circle, rgba(255,252,228,1), rgba(255,240,180,0) 70%)",
    wash: "radial-gradient(ellipse 60% 50% at 26% 12%, rgba(255,232,160,0.5), transparent 70%)",
  },
  autumn: {
    grade: "saturate(1.15) contrast(1.02) brightness(0.98) sepia(0.34) hue-rotate(-16deg)",
    sky: "linear-gradient(180deg, #e6c9a0 0%, rgba(230,201,160,0) 100%)",
    sunTop: 150,
    sunColour: "radial-gradient(circle, rgba(255,214,140,0.95), rgba(255,190,110,0) 70%)",
    wash: "radial-gradient(ellipse 62% 52% at 18% 22%, rgba(255,190,110,0.42), transparent 70%)",
  },
  winter: {
    grade: "saturate(0.42) contrast(0.98) brightness(1.08) hue-rotate(165deg)",
    sky: "linear-gradient(180deg, #dfe8ef 0%, rgba(223,232,239,0) 100%)",
    sunTop: 200,
    sunColour: "radial-gradient(circle, rgba(245,248,255,0.9), rgba(220,230,245,0) 70%)",
    wash: "radial-gradient(ellipse 60% 50% at 50% 10%, rgba(210,225,245,0.5), transparent 70%)",
  },
};

const IDLE_RAIN_MS = 180_000;

export default function Cottagecore() {
  const { toCanvasSpace } = useCanvas();
  const muted = useShell((s) => s.muted);

  const [season, setSeason] = useState<Season>("summer");
  const [wind, setWind] = useState(0.4);
  const [picked, setPicked] = useState<number[]>([]);
  const [raining, setRaining] = useState(false);
  const [cat, setCat] = useState({ x: 980, y: 806 });
  const [asleep, setAsleep] = useState(false);

  const windRef = useRef(wind);
  windRef.current = wind;
  const idleSince = useRef(performance.now());
  const catTarget = useRef({ x: 980, y: 806 });
  const purring = useRef<null | (() => void)>(null);

  // pic(), not one(): the slot also holds matted versions after the cutout stage,
  // and a transparent "meadow" renders as a hole where the view should be.
  const meadow = pic(SLUG, "cottage_meadow", 0);
  const catImg = cut(SLUG, "cottage_cat", 0);
  const s = SEASONS[season];

  useEffect(() => {
    setPicked(sbGet<number[]>(SLUG, "vase", []));
  }, []);

  // --- sound ------------------------------------------------------------
  useEffect(() => {
    if (muted) return;
    const stopWind = startWind(() => windRef.current);
    const birds = window.setInterval(() => Math.random() < 0.55 && bird(), 5200);
    const kettles = window.setInterval(() => Math.random() < 0.3 && kettle(), 41000);
    const bells = window.setInterval(() => Math.random() < 0.25 && bell(), 67000);
    return () => {
      stopWind();
      window.clearInterval(birds);
      window.clearInterval(kettles);
      window.clearInterval(bells);
    };
  }, [muted]);

  useEffect(() => {
    if (!raining || muted) return;
    return startRain();
  }, [raining, muted]);

  // --- the cat ----------------------------------------------------------
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      idleSince.current = performance.now();
      setRaining(false);
      const p = toCanvasSpace(e.clientX, e.clientY);
      // It follows, but only along the sill, and only roughly.
      catTarget.current = { x: Math.max(280, Math.min(1280, p.x)), y: 806 };
      setAsleep(false);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [toCanvasSpace]);

  useEffect(() => {
    let raf = 0;
    const step = () => {
      const idle = performance.now() - idleSince.current;
      // 0.012 is deliberately far too slow to keep up. A cat that tracks the cursor
      // is a cursor effect; a cat that ambles over eventually is a cat.
      setCat((c) => {
        const nx = c.x + (catTarget.current.x - c.x) * (idle > 6000 ? 0.002 : 0.012);
        // Bail out once it has settled, otherwise this re-renders the whole page
        // sixty times a second forever.
        return Math.abs(nx - c.x) < 0.15 ? c : { x: nx, y: c.y };
      });
      if (idle > 14000) setAsleep(true);
      if (idle > IDLE_RAIN_MS) setRaining(true);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  const pet = () => {
    if (purring.current) return;
    setAsleep(false);
    purring.current = purr();
    window.setTimeout(() => {
      purring.current?.();
      purring.current = null;
    }, 4000);
  };

  // --- meadow flowers you can pick --------------------------------------
  const flowers = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => ({
        id: i,
        x: 120 + ((i * 137) % 940),
        y: 430 + ((i * 71) % 150),
        tilt: ((i * 53) % 30) - 15,
      })),
    [],
  );

  const pick = useCallback(
    (id: number) => {
      snip();
      setPicked((p) => {
        if (p.includes(id)) return p;
        const next = [...p, id].slice(-7);
        sbSet(SLUG, "vase", next);
        return next;
      });
    },
    [],
  );

  const blades = useMemo(
    () =>
      Array.from({ length: 90 }, (_, i) => ({
        x: (i * 19) % 1260,
        h: 60 + ((i * 37) % 110),
        phase: (i % 11) * 0.6,
      })),
    [],
  );

  return (
    <div className={styles.root} style={{ "--wind": wind } as React.CSSProperties}>
      {/* ------------------------------------------------ the view */}
      <div className={styles.view}>
        {meadow && (
          <Image
            src={meadow.src}
            alt=""
            width={1260}
            height={700}
            priority
            className={styles.meadow}
            style={{ filter: s.grade }}
          />
        )}
        <div className={styles.sky} style={{ background: s.sky }} />
        <div
          className={styles.sun}
          style={{ left: 840, top: s.sunTop, background: s.sunColour }}
        />

        {/* laundry, on a line, swinging with the wind */}
        <div className={styles.line}>
          <span className={styles.rope} />
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={styles.washing}
              style={{
                left: 150 + i * 250,
                animationDuration: `${4 + i * 0.7}s`,
                animationDelay: `${i * 0.4}s`,
              }}
            >
              <Garment kind={i} />
            </span>
          ))}
        </div>

        {/* pickable flowers */}
        {flowers.map((f) =>
          picked.includes(f.id) ? null : (
            <button
              key={f.id}
              type="button"
              aria-label="Pick this flower"
              onClick={() => pick(f.id)}
              style={{
                position: "absolute",
                left: f.x,
                top: f.y,
                width: 34,
                height: 46,
                transform: `rotate(${f.tilt}deg)`,
              }}
            >
              <Flower seed={f.id} />
            </button>
          ),
        )}

        {/* near grass, blown */}
        <div className={styles.grass}>
          {blades.map((b, i) => (
            <span
              key={i}
              className={styles.blade}
              style={{
                left: b.x,
                height: b.h,
                animationDelay: `${b.phase}s`,
                animationDuration: `${2.8 + (i % 5) * 0.4}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* ------------------------------------------------ window */}
      <div className={styles.frame} />
      <span
        className={styles.mullion}
        style={{ left: 790, top: 100, width: 18, height: 610 }}
      />
      <span
        className={styles.mullion}
        style={{ left: 210, top: 396, width: 1180, height: 16 }}
      />

      <div
        className={styles.curtain}
        style={{
          left: 96,
          transform: `rotate(${wind * 3}deg) translateX(${wind * -14}px)`,
        }}
      />
      <div
        className={styles.curtain}
        style={{
          right: 96,
          transform: `rotate(${wind * -3}deg) translateX(${wind * 14}px)`,
        }}
      />

      {/* ------------------------------------------------ sill */}
      <div className={styles.sill} />

      {[0, 1, 2].map((i) => {
        const o = cut(SLUG, "cottage_object", i + 1);
        if (!o) return null;
        return (
          <Image
            key={i}
            src={o.src}
            alt=""
            width={120}
            height={Math.round((120 * o.height) / o.width)}
            className={styles.sillItem}
            style={{ left: 560 + i * 150 }}
          />
        );
      })}

      <Teacup wind={wind} />
      <Vase picked={picked} />

      {catImg && (
        <button
          type="button"
          aria-label="The cat"
          onClick={pet}
          style={{
            position: "absolute",
            left: cat.x,
            top: cat.y,
            width: 210,
            transform: `translate(-50%, -100%) scaleX(-1) ${asleep ? "scaleY(0.78)" : ""}`,
            transformOrigin: "50% 100%",
            transition: "transform 900ms ease",
            zIndex: 30,
            filter: "drop-shadow(18px 12px 10px rgba(80,60,34,0.35)) saturate(0.92) contrast(0.94)",
          }}
        >
          <Image
            src={catImg.src}
            alt=""
            width={210}
            height={Math.round((210 * catImg.height) / catImg.width)}
            style={{ display: "block" }}
          />
        </button>
      )}

      {/* ------------------------------------------------ paint layers */}
      <div className={styles.paper} />
      <div className={styles.wash} style={{ background: s.wash }} />
      {raining && <div className={styles.rain} />}
      {raining && (
        <div className={styles.rainNote}>
          It has started raining. The page is better for it.
        </div>
      )}

      {/* ------------------------------------------------ controls */}
      <aside className={styles.panel}>
        <div className={styles.panelTitle}>Season</div>
        {(Object.keys(SEASONS) as Season[]).map((k) => (
          <button
            key={k}
            type="button"
            className={`${styles.season} ${k === season ? styles.seasonOn : ""}`}
            onClick={() => setSeason(k)}
          >
            {k}
          </button>
        ))}

        <div className={styles.panelTitle} style={{ marginTop: 16 }}>
          Wind
        </div>
        <input
          type="range"
          className={styles.slider}
          min={0}
          max={100}
          value={Math.round(wind * 100)}
          aria-label="Wind"
          onChange={(e) => setWind(Number(e.target.value) / 100)}
          onKeyDown={(e) => e.stopPropagation()}
        />
        <div className={styles.note}>
          {picked.length} flower{picked.length === 1 ? "" : "s"} in the vase.
          They stay there.
        </div>
      </aside>

      <div className={styles.hint}>
        pick the flowers · the cat will come over eventually
        <br />
        sit still for three minutes and see what happens
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- drawings */

function Flower({ seed }: { seed: number }) {
  const petal = ["#e8a0c0", "#f2e08a", "#c9a8e0", "#f0b48a", "#ffffff"][seed % 5];
  return (
    <svg viewBox="0 0 34 46" width="34" height="46">
      <path d="M17 46V18" stroke="#6d8a49" strokeWidth="2.5" fill="none" />
      <path d="M17 32c-7-2-10-7-10-7s7-1 10 4z" fill="#7f9c52" />
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <ellipse
          key={a}
          cx="17"
          cy="8"
          rx="4.6"
          ry="7.4"
          fill={petal}
          transform={`rotate(${a} 17 14)`}
          opacity="0.94"
        />
      ))}
      <circle cx="17" cy="14" r="3.6" fill="#f2c53d" />
    </svg>
  );
}

function Teacup({ wind }: { wind: number }) {
  return (
    <>
      <svg className={styles.teacup} viewBox="0 0 96 74" width="96" height="74">
        <ellipse cx="46" cy="70" rx="40" ry="5" fill="rgba(80,60,34,0.22)" />
        <path
          d="M12 22h62v22a26 26 0 0 1-26 26H38a26 26 0 0 1-26-26z"
          fill="#fbf7ee"
          stroke="#c9b799"
          strokeWidth="2"
        />
        <path d="M74 28h6a10 10 0 0 1 0 20h-6" fill="none" stroke="#c9b799" strokeWidth="3" />
        <ellipse cx="43" cy="22" rx="31" ry="7" fill="#8a5a34" />
        <ellipse cx="43" cy="21" rx="31" ry="6" fill="#a9723f" />
      </svg>
      <svg className={styles.steam} viewBox="0 0 96 150" width="96" height="150">
        {[0, 1, 2].map((i) => (
          <path
            key={i}
            d={`M${34 + i * 12} 148 C ${20 + i * 14 + wind * 40} 110, ${
              54 + i * 8 + wind * 60
            } 82, ${30 + i * 12 + wind * 70} 34`}
            stroke="rgba(255,255,255,0.55)"
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
            style={{
              filter: "blur(3px)",
              animation: `steam ${5 + i}s ease-in-out ${i * 0.8}s infinite alternate`,
            }}
          />
        ))}
      </svg>
    </>
  );
}

function Vase({ picked }: { picked: number[] }) {
  return (
    <>
      <svg className={styles.vase} viewBox="0 0 118 130" width="118" height="130">
        <ellipse cx="59" cy="126" rx="44" ry="5" fill="rgba(80,60,34,0.22)" />
        <path
          d="M40 34h38l10 48a30 30 0 0 1-30 40h2a30 30 0 0 1-30-40z"
          fill="#cfd9e6"
          stroke="#a8b6c8"
          strokeWidth="2"
          opacity="0.92"
        />
        <path d="M40 34h38" stroke="#a8b6c8" strokeWidth="3" />
      </svg>
      {picked.map((id, i) => (
        <span
          key={id}
          className={styles.pickedFlower}
          style={{
            right: 320 + 34 + (i - picked.length / 2) * 20,
            transform: `rotate(${(i - picked.length / 2) * 13}deg)`,
          }}
        >
          <Flower seed={id} />
        </span>
      ))}
    </>
  );
}

/**
 * Drawn washing.
 *
 * The harvested `cottage_laundry` grabs are, almost entirely, photographs of euro
 * notes pegged to a line — a search for "laundry" doing exactly what you would
 * expect. Four SVG garments are both more reliable and more consistent with the
 * rest of the scene.
 */
function Garment({ kind }: { kind: number }) {
  const colour = ["#e8dcc4", "#cfd9e6", "#e8c6cf", "#d6e0c2"][kind % 4];
  if (kind % 4 === 1) {
    // a sheet
    return (
      <svg viewBox="0 0 150 190" width="150" height="190">
        <path d="M8 6h134v150l-22 22-22-18-23 18-23-18-22 18-22-22z" fill={colour} />
        <path d="M8 6h134" stroke="#a89878" strokeWidth="3" />
      </svg>
    );
  }
  if (kind % 4 === 2) {
    // trousers
    return (
      <svg viewBox="0 0 110 190" width="110" height="190">
        <path d="M16 6h78l10 178H62l-7-96-7 96H6z" fill={colour} />
        <path d="M16 6h78" stroke="#a89878" strokeWidth="3" />
      </svg>
    );
  }
  // a shirt
  return (
    <svg viewBox="0 0 140 160" width="140" height="160">
      <path d="M44 8L18 22 6 62l26 10 6-16v92h64V56l6 16 26-10-12-40L96 8 70 22z" fill={colour} />
      <path d="M44 8L70 22 96 8" stroke="#a89878" strokeWidth="3" fill="none" />
    </svg>
  );
}
