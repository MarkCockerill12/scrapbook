"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useCanvas } from "@/components/CanvasStage";
import { cutN, img } from "@/lib/assets";
import { droplet, noiseLoop, tone, unlock } from "@/lib/audio";
import { sbGet, sbSet } from "@/lib/storage";
import { useShell } from "@/lib/store";
import { Kitchen } from "./Kitchen";
import { bell, bird, kettle, purr, snip } from "./sound";
import w from "./wander.module.css";

/**
 * Channel — Cottagecore. A cottage, and the afternoon to wander round it.
 *
 * Third build (2026-10). The single kitchen was "on a better track" but too
 * restrictive — not a lot to see or do. So the kitchen is now one room of six: you
 * come in at the gate, up the garden path, through the kitchen to the hearth, upstairs
 * to the bed under the eaves, and out the back to the meadow. Every place is a real
 * photograph of a real cottage, and each has one or two small things in it that
 * answer you — flowers to cut, a kettle to put on, a candle, a window. The day goes
 * round while you are there, and the cat comes with you.
 */

const A = "cottagecore";

type PlaceId = "gate" | "garden" | "kitchen" | "hearth" | "bedroom" | "meadow";
type Hour = "morning" | "afternoon" | "dusk" | "night";
const HOURS: Hour[] = ["morning", "afternoon", "dusk", "night"];
const HOUR_NAME: Record<Hour, string> = { morning: "morning", afternoon: "afternoon", dusk: "dusk", night: "night" };

interface Way {
  to: PlaceId;
  label: string;
  x: number;
  y: number;
  dir?: "left" | "right" | "up" | "down";
}

interface Place {
  id: PlaceId;
  name: string;
  line: string;
  slot: string;
  n: number;
  at: string;
  indoors?: boolean;
  ways: Way[];
  /** where the cat has settled: cutout, x, y (feet), height, flip */
  cat?: { slot: string; n: number; x: number; y: number; h: number; flip?: boolean };
}

const PLACES: Place[] = [
  {
    id: "gate",
    name: "The gate",
    line: "It sticks. Lift it a little and push.",
    slot: "cw_garden",
    n: 3,
    at: "50% 62%",
    ways: [{ to: "garden", label: "up the path", x: 1010, y: 560, dir: "up" }],
    cat: { slot: "cottage_cat", n: 1, x: 760, y: 846, h: 250 },
  },
  {
    id: "garden",
    name: "The garden",
    line: "Nobody planted half of this. It came, and it was let stay.",
    slot: "cw_garden",
    n: 1,
    at: "50% 60%",
    ways: [
      { to: "gate", label: "back to the gate", x: 110, y: 650, dir: "down" },
      { to: "kitchen", label: "in at the kitchen door", x: 1180, y: 520, dir: "right" },
      { to: "meadow", label: "round the back, to the meadow", x: 420, y: 330, dir: "left" },
    ],
  },
  {
    id: "kitchen",
    name: "The kitchen",
    line: "",
    slot: "cc_kitchen",
    n: 1,
    at: "50% 50%",
    indoors: true,
    ways: [
      { to: "garden", label: "out to the garden", x: 110, y: 300, dir: "left" },
      { to: "hearth", label: "through to the hearth", x: 1390, y: 300, dir: "right" },
    ],
  },
  {
    id: "hearth",
    name: "The hearth",
    line: "The table is laid for whoever comes in from the garden.",
    slot: "cc_kitchen",
    n: 2,
    at: "50% 46%",
    indoors: true,
    ways: [
      { to: "kitchen", label: "back to the kitchen", x: 150, y: 420, dir: "left" },
      { to: "bedroom", label: "up the stairs", x: 1400, y: 250, dir: "up" },
    ],
    cat: { slot: "cottage_cat", n: 5, x: 1180, y: 830, h: 170, flip: true },
  },
  {
    id: "bedroom",
    name: "Under the eaves",
    line: "A box bed, a chair, and one window that gets the morning.",
    slot: "cw_bed",
    n: 1,
    at: "50% 50%",
    indoors: true,
    ways: [
      { to: "hearth", label: "back downstairs", x: 120, y: 620, dir: "down" },
      { to: "meadow", label: "look out at the meadow", x: 1320, y: 300, dir: "right" },
    ],
  },
  {
    id: "meadow",
    name: "The meadow",
    line: "Yarrow, vervain, and grass gone to seed. Take what you like.",
    slot: "cottage_meadow",
    n: 1,
    at: "50% 50%",
    ways: [
      { to: "garden", label: "back to the garden", x: 110, y: 640, dir: "down" },
      { to: "bedroom", label: "up to bed", x: 1330, y: 200, dir: "up" },
    ],
    cat: { slot: "cottage_cat", n: 1, x: 1240, y: 890, h: 280, flip: true },
  },
];

/** What grows here, cut out of real photographs, and what it gets carried in. */
const FLOWERS = [cutN(A, "cc_cornflower", 1), cutN(A, "cc_daisy", 1), cutN(A, "cc_poppy", 1), cutN(A, "cc_rose", 1), cutN(A, "cc_foxglove", 1), cutN(A, "cc_lavender", 1)];
const BASKET = cutN(A, "cc_basket", 2);
const JUG = cutN(A, "cc_bouquet", 3);

interface Mote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  p: number;
}

export default function Cottagecore() {
  const { toCanvasSpace } = useCanvas();
  const muted = useShell((s) => s.muted);
  const [at, setAt] = useState<PlaceId>("gate");
  const [hour, setHour] = useState<Hour>("afternoon");
  const [posy, setPosy] = useState(0);
  const [cuts, setCuts] = useState<{ x: number; y: number; k: number; f: number }[]>([]);
  const [jug, setJug] = useState(0);
  const [told, setTold] = useState("");
  const [kettleOn, setKettleOn] = useState<"cold" | "on" | "sung">("cold");
  const [candle, setCandle] = useState(false);
  const [rain, setRain] = useState(false);
  const [petting, setPetting] = useState(false);
  const air = useRef<HTMLCanvasElement>(null);
  const view = useRef<HTMLDivElement>(null);
  const state = useRef({ at, hour, rain });
  state.current = { at, hour, rain };
  const k = useRef(0);

  useEffect(() => {
    setAt(sbGet<PlaceId>(A, "place", "gate"));
    setHour(sbGet<Hour>(A, "hour", "afternoon"));
    setPosy(sbGet(A, "posy", 0));
    setJug(sbGet(A, "jug", 0));
  }, []);

  // The day goes round on its own, slowly.
  useEffect(() => {
    const id = window.setInterval(() => setHour((h) => HOURS[(HOURS.indexOf(h) + 1) % HOURS.length]), 95_000);
    return () => window.clearInterval(id);
  }, []);

  const place = PLACES.find((p) => p.id === at) ?? PLACES[0];

  // ---- sound: the outdoors, the indoors, the weather
  useEffect(() => {
    if (muted || at === "kitchen") return;
    const stops: (() => void)[] = [];
    if (!place.indoors) {
      stops.push(noiseLoop({ gain: hour === "night" ? 0.012 : 0.024, lowpass: 1600, highpass: 300, attack: 2 }));
      const id = window.setInterval(() => {
        if (hour === "night") tone({ freq: 4200, duration: 0.05, gain: 0.012, type: "sine" });
        else if (Math.random() < 0.6) bird();
      }, hour === "night" ? 700 : 4200);
      stops.push(() => window.clearInterval(id));
    } else {
      stops.push(noiseLoop({ gain: 0.016, lowpass: 400, attack: 2 }));
      if (at === "hearth") {
        const id = window.setInterval(() => tone({ freq: 900 + Math.random() * 2400, duration: 0.02, gain: 0.03, type: "square" }), 260);
        stops.push(() => window.clearInterval(id));
      }
    }
    if (rain && at === "bedroom") stops.push(noiseLoop({ gain: 0.06, lowpass: 3600, highpass: 700, attack: 1.5 }));
    return () => stops.forEach((s) => s());
  }, [muted, at, hour, rain, place.indoors]);

  // ---- the air: pollen and bees by day, fireflies after dark, dust indoors
  useEffect(() => {
    const cv = air.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const motes: Mote[] = Array.from({ length: 70 }, (_, i) => ({
      x: (i * 263) % 1600,
      y: (i * 149) % 900,
      vx: 0,
      vy: 0,
      r: 1 + (i % 4) * 0.6,
      p: i * 1.37,
    }));
    let raf = 0;
    const frame = (now: number) => {
      const t = now / 1000;
      const s = state.current;
      const p = PLACES.find((x) => x.id === s.at);
      ctx.clearRect(0, 0, 1600, 900);
      if (s.at !== "kitchen" && p) {
        const night = s.hour === "night";
        for (let i = 0; i < motes.length; i++) {
          const m = motes[i];
          if (p.indoors) {
            // dust, turning over in whatever light there is
            if (i > 34) continue;
            m.x += Math.sin(t * 0.3 + m.p) * 0.12;
            m.y += Math.cos(t * 0.24 + m.p) * 0.1 - 0.03;
            ctx.fillStyle = `rgba(255, 236, 200, ${0.1 + 0.16 * Math.abs(Math.sin(t * 0.6 + m.p))})`;
            ctx.beginPath();
            ctx.arc(m.x, m.y, m.r * 0.9, 0, Math.PI * 2);
            ctx.fill();
          } else if (night) {
            if (i > 26) continue;
            m.x += Math.sin(t * 0.5 + m.p) * 0.5;
            m.y += Math.cos(t * 0.37 + m.p * 2) * 0.4;
            const glow = Math.max(0, Math.sin(t * 1.4 + m.p * 3));
            const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, 16);
            g.addColorStop(0, `rgba(226, 255, 150, ${0.9 * glow})`);
            g.addColorStop(1, "rgba(226, 255, 150, 0)");
            ctx.fillStyle = g;
            ctx.fillRect(m.x - 16, m.y - 16, 32, 32);
          } else if (i % 9 === 0) {
            // a bee: goes somewhere, hovers, goes somewhere else
            m.x += Math.sin(t * 1.1 + m.p) * 1.6 + Math.sin(t * 9 + m.p) * 0.5;
            m.y += Math.cos(t * 0.8 + m.p * 1.7) * 1.1 + Math.cos(t * 11 + m.p) * 0.4;
            ctx.fillStyle = "rgba(40, 28, 8, 0.85)";
            ctx.beginPath();
            ctx.ellipse(m.x, m.y, 3.4, 2.4, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
            ctx.beginPath();
            ctx.ellipse(m.x, m.y - 3, 3.4, 1.6, Math.sin(t * 60) * 0.5, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // pollen and seed, going over on the wind
            m.x += 0.35 + Math.sin(t * 0.4 + m.p) * 0.3;
            m.y += Math.sin(t * 0.7 + m.p) * 0.25 - 0.05;
            ctx.fillStyle = `rgba(255, 250, 225, ${0.35 + 0.3 * Math.sin(t + m.p)})`;
            ctx.beginPath();
            ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
            ctx.fill();
          }
          if (m.x > 1620) m.x = -20;
          if (m.x < -20) m.x = 1620;
          if (m.y < -20) m.y = 920;
          if (m.y > 920) m.y = -20;
        }
        if (s.rain && s.at === "bedroom") {
          ctx.strokeStyle = "rgba(200, 220, 235, 0.35)";
          ctx.lineWidth = 1;
          for (let i = 0; i < 40; i++) {
            const x = 1180 + ((i * 53 + t * 240) % 300);
            const y = 150 + ((i * 97 + t * 900) % 300);
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - 3, y + 14);
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const go = (to: PlaceId) => {
    unlock();
    if (to === at) return;
    if (to === "gate" || at === "gate") bell();
    // two footsteps: gravel outside, boards inside
    const inside = PLACES.find((p) => p.id === to)?.indoors;
    [0, 0.32].forEach((d) => tone({ freq: inside ? 120 : 600, toFreq: inside ? 70 : 300, duration: 0.07, gain: inside ? 0.12 : 0.05, type: inside ? "sine" : "square", delay: d }));
    // the flowers already in the basket do not fly there again in the next place
    setCuts([]);
    setAt(to);
    sbSet(A, "place", to);
  };

  const cut = (e: React.PointerEvent) => {
    if (at !== "garden" && at !== "meadow") return;
    if ((e.target as HTMLElement).closest("button")) return;
    const p = toCanvasSpace(e.clientX, e.clientY);
    if (p.y < 380) return;
    unlock();
    k.current += 1;
    if (posy >= 12) {
      setTold("the basket is full — take it in to the kitchen");
      return;
    }
    setTold("");
    snip();
    setCuts((c) => [...c.slice(-8), { x: p.x, y: p.y, k: k.current, f: posy % FLOWERS.length }]);
    const n = posy + 1;
    setPosy(n);
    sbSet(A, "posy", n);
  };

  const photo = img(A, place.slot, place.n);
  const cat = place.cat ? cutN(A, place.cat.slot, place.cat.n) : null;

  return (
    <div
      className={w.root}
      data-hour={hour}
      data-indoors={place.indoors || undefined}
      data-candle={candle || undefined}
      onPointerDown={cut}
      onPointerMove={(e) => {
        const p = toCanvasSpace(e.clientX, e.clientY);
        view.current?.style.setProperty("--px", `${((p.x - 800) / 800) * -14}px`);
        view.current?.style.setProperty("--py", `${((p.y - 450) / 450) * -8}px`);
      }}
    >
      {at === "kitchen" ? (
        <Kitchen />
      ) : (
        <div ref={view} className={w.view} key={at}>
          {photo && <img className={w.photo} src={photo.src} alt="" draggable={false} style={{ objectPosition: place.at }} />}
          <div className={w.light} />

          {at === "hearth" && (
            <button
              type="button"
              className={w.fire}
              data-on={kettleOn !== "cold" || undefined}
              style={{ left: 300, top: 250, width: 300, height: 300 }}
              onClick={() => {
                unlock();
                if (kettleOn !== "cold") return setKettleOn("cold");
                setKettleOn("on");
                window.setTimeout(() => {
                  kettle();
                  setKettleOn("sung");
                }, 5200);
              }}
              aria-label="Put the kettle on"
            >
              <i />
              <span>{kettleOn === "cold" ? "put the kettle on" : kettleOn === "on" ? "it's coming up…" : "that's the kettle"}</span>
            </button>
          )}

          {at === "bedroom" && (
            <>
              <button type="button" className={w.window} style={{ left: 1180, top: 150, width: 300, height: 300 }} onClick={() => setRain((r) => !r)} aria-label="The window">
                <span>{rain ? "rain on the glass" : "open to the weather"}</span>
              </button>
              <button
                type="button"
                className={w.candle}
                data-on={candle || undefined}
                style={{ left: 1010, top: 520 }}
                onClick={() => {
                  unlock();
                  setCandle((c) => !c);
                  tone({ freq: candle ? 300 : 1800, toFreq: candle ? 120 : 900, duration: 0.12, gain: 0.05 });
                }}
                aria-label={candle ? "Blow the candle out" : "Light the candle"}
              >
                <i />
                <span>{candle ? "blow it out" : "light the candle"}</span>
              </button>
            </>
          )}

          {cat && place.cat && (
            <button
              type="button"
              className={w.cat}
              style={{ left: place.cat.x, top: place.cat.y - place.cat.h, height: place.cat.h, "--flip": place.cat.flip ? -1 : 1 } as CSSProperties}
              onPointerEnter={() => {
                if (petting) return;
                setPetting(true);
                const stop = muted ? () => {} : purr();
                window.setTimeout(() => {
                  stop();
                  setPetting(false);
                }, 2600);
              }}
              aria-label="The cat"
            >
              <img src={cat.src} alt="" draggable={false} />
              {petting && <em>prrrrr</em>}
            </button>
          )}

          {cuts.map((c) => {
            const f = FLOWERS[c.f];
            return f ? (
              <img key={c.k} className={w.stem} src={f.thumb} alt="" draggable={false} style={{ left: c.x, top: c.y, "--dx": `${805 - c.x}px`, "--dy": `${790 - c.y}px` } as CSSProperties} />
            ) : null;
          })}

          <header className={w.caption}>
            <h1>{place.name}</h1>
            <p>{place.line}</p>
          </header>
        </div>
      )}

      <canvas ref={air} className={w.air} width={1600} height={900} />
      <div className={w.grade} />

      {/* the ways on */}
      {place.ways.map((way) => (
        <button key={way.to} type="button" className={w.way} data-dir={way.dir} style={{ left: way.x, top: way.y }} onClick={() => go(way.to)}>
          <i />
          {way.label}
        </button>
      ))}

      {/* where you are, and what time it has got to */}
      <nav className={w.rooms} aria-label="The cottage">
        {PLACES.map((p) => {
          const th = img(A, p.slot, p.n);
          return (
            <button key={p.id} type="button" data-on={p.id === at || undefined} onClick={() => go(p.id)} aria-label={p.name} title={p.name}>
              {th && <img src={th.thumb} alt="" draggable={false} />}
            </button>
          );
        })}
        <button
          type="button"
          className={w.hour}
          onClick={() => {
            const next = HOURS[(HOURS.indexOf(hour) + 1) % HOURS.length];
            setHour(next);
            sbSet(A, "hour", next);
          }}
        >
          <i />
          {HOUR_NAME[hour]}
        </button>
      </nav>

      {/* the jug on the kitchen table, once there is something to put in it */}
      {at === "kitchen" && jug > 0 && JUG && <img className={w.jug} src={JUG.src} alt="" draggable={false} />}

      {/* the basket you are carrying: everything you cut is in it */}
      {posy > 0 && BASKET && (
        <button
          type="button"
          className={w.basket}
          key={`b${posy}`}
          data-bump
          onClick={() => {
            unlock();
            if (at !== "kitchen") {
              setTold("carry it in to the kitchen — there's a jug on the table");
              return;
            }
            const n = jug + posy;
            setJug(n);
            sbSet(A, "jug", n);
            setPosy(0);
            sbSet(A, "posy", 0);
            setCuts([]);
            setTold("");
            droplet(0.7);
          }}
          aria-label="Your basket"
        >
          <img src={BASKET.src} alt="" draggable={false} />
          <b>
            {Array.from({ length: posy }, (_, i) => {
              const f = FLOWERS[i % FLOWERS.length];
              return f ? <img key={i} src={f.thumb} alt="" draggable={false} style={{ left: 48 + ((i * 53) % 136), top: 62 + ((i * 29) % 44), rotate: `${((i * 47) % 50) - 25}deg`, animation: i === posy - 1 ? undefined : "none" }} /> : null;
            })}
          </b>
          <img src={BASKET.src} alt="" draggable={false} />
          <span>{told || (at === "kitchen" ? "put them in the jug" : `${posy} stem${posy === 1 ? "" : "s"} in the basket`)}</span>
        </button>
      )}
    </div>
  );
}
