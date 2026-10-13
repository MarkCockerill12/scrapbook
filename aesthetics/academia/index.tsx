"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useCanvas } from "@/components/CanvasStage";
import { img } from "@/lib/assets";
import { noiseLoop, tone, unlock } from "@/lib/audio";
import { playNoise, playNote, useMusic, type Score } from "@/lib/music";
import { sbGet, sbSet } from "@/lib/storage";
import { useShell } from "@/lib/store";
import a from "./library.module.css";

/**
 * Channel — Dark Academia. The library, a long time after closing.
 *
 * Rebuilt 2026-10 (Mark: "supposed to be a cosy library at night, not this"). The
 * open book on a desk is gone. The page is the room: a real library (Strahov's
 * Theological Hall) with the daylight taken out of it. What you can see, you can see
 * because something is burning — four reading lamps, a fire somewhere to your left,
 * and the candle you are carrying, which goes where your hand goes.
 *
 * It is raining. Nobody is coming to lock up. You may stay as long as you like.
 */

const A = "academia";

/** Reading lamps, as percentages of the frame, with the pool each one throws. */
const LAMPS = [
  { id: "lectern", x: 19, y: 58, r: 330 },
  { id: "aisle", x: 49, y: 60, r: 300 },
  { id: "globe", x: 84, y: 66, r: 340 },
  { id: "far", x: 47, y: 36, r: 230 },
];

const PAGES = [
  { head: "I.", text: "A room without books is like a body without a soul.", by: "attributed to Cicero" },
  { head: "II.", text: "I have always imagined that Paradise will be a kind of library.", by: "Jorge Luis Borges" },
  { head: "III.", text: "There is no friend as loyal as a book.", by: "Ernest Hemingway" },
  { head: "IV.", text: "Books are the quietest and most constant of friends; they are the most accessible and wisest of counsellors, and the most patient of teachers.", by: "Charles W. Eliot" },
  { head: "V.", text: "The night is long, the lamp is lit, and there is nowhere else you need to be.", by: "written in the margin, in pencil" },
];

// A slow nocturne for one piano: left hand rocking, right hand barely there.
const BARS = [
  { l: [38, 45, 50, 53], r: [69, 72, 77] },
  { l: [34, 41, 50, 53], r: [70, 74, 77] },
  { l: [36, 43, 48, 52], r: [67, 72, 76] },
  { l: [33, 40, 49, 52], r: [69, 73, 76] },
];
const score: Score = (step, t) => {
  const bar = BARS[Math.floor(step / 12) % BARS.length];
  const s = step % 12;
  const lh = [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1][s];
  playNote({ freq: bar.l[lh], midi: true, dur: 0.5, type: "triangle", gain: lh === 0 ? 0.06 : 0.032, attack: 0.012, release: 1.8, filter: 1400, wet: 0.6, pan: -0.25 }, t);
  if (s === 0 || s === 6 || (s === 9 && Math.floor(step / 12) % 2)) {
    const m = bar.r[(step / 3) % bar.r.length | 0];
    playNote({ freq: m, midi: true, dur: 0.9, type: "sine", gain: 0.055, attack: 0.02, release: 2.8, wet: 0.75, pan: 0.25 }, t);
  }
};

export default function Academia() {
  const { toCanvasSpace } = useCanvas();
  const muted = useShell((s) => s.muted);
  const root = useRef<HTMLDivElement>(null);
  const [lit, setLit] = useState<string[]>(["lectern", "globe"]);
  const [book, setBook] = useState(false);
  const [page, setPage] = useState(0);
  const [flash, setFlash] = useState(0);
  const [view, setView] = useState<"hall" | "alcove">("hall");
  const [sconce, setSconce] = useState(true);

  useEffect(() => {
    setLit(sbGet<string[]>(A, "lamps", ["lectern", "globe"]));
  }, []);

  useMusic(score, 46, true, 2);

  // Rain on tall windows, a fire, and the building settling.
  useEffect(() => {
    if (muted) return;
    const rain = noiseLoop({ gain: 0.05, lowpass: 3600, highpass: 900, attack: 3 });
    const roof = noiseLoop({ gain: 0.06, lowpass: 260, attack: 3 });
    const fire = window.setInterval(() => {
      if (Math.random() < 0.7) playNoise({ dur: 0.02 + Math.random() * 0.05, gain: 0.03 + Math.random() * 0.05, highpass: 900, lowpass: 5200, pan: -0.8 });
    }, 170);
    const clock = window.setInterval(() => tone({ freq: 1900, duration: 0.012, type: "square", gain: 0.012 }), 1000);
    return () => {
      rain();
      roof();
      window.clearInterval(fire);
      window.clearInterval(clock);
    };
  }, [muted]);

  // Far-off lightning, rarely: the windows remember what daylight was.
  useEffect(() => {
    let id = 0;
    const next = () => {
      id = window.setTimeout(() => {
        setFlash((f) => f + 1);
        window.setTimeout(() => {
          playNoise({ dur: 3.2, gain: 0.16, lowpass: 140, wet: 0.6 });
        }, 1400);
        next();
      }, 38000 + Math.random() * 50000);
    };
    next();
    return () => window.clearTimeout(id);
  }, []);

  const toggle = (id: string) => {
    unlock();
    const next = lit.includes(id) ? lit.filter((x) => x !== id) : [...lit, id];
    setLit(next);
    sbSet(A, "lamps", next);
    tone({ freq: 2400, toFreq: 900, duration: 0.03, type: "square", gain: 0.08 });
  };

  // Everything lit is a hole in one mask: the lamps that are on, plus your candle.
  const mask = useMemo(() => {
    if (view === "alcove") {
      // the alcove has one sconce between the windows, and whatever you are carrying
      const one = sconce ? ["radial-gradient(circle 620px at 46% 66%, #000 0%, rgba(0,0,0,0.7) 40%, transparent 100%)"] : [];
      return [...one, "radial-gradient(circle var(--cr) at var(--cx) var(--cy), #000 0%, rgba(0,0,0,0.6) 34%, transparent 100%)"].join(", ");
    }
    const pools = LAMPS.filter((l) => lit.includes(l.id)).map((l) => `radial-gradient(circle ${l.r}px at ${l.x}% ${l.y}%, #000 0%, rgba(0,0,0,0.55) 38%, transparent 100%)`);
    pools.push("radial-gradient(circle var(--cr) at var(--cx) var(--cy), #000 0%, rgba(0,0,0,0.6) 34%, transparent 100%)");
    return pools.join(", ");
  }, [lit, view, sconce]);

  const photo = img(A, view === "hall" ? "ac_cosy" : "ac_window", view === "hall" ? 2 : 1);
  const at = view === "hall" ? "50% 62%" : "50% 40%";
  const flame = img(A, "ac_candle", 2);

  return (
    <div
      ref={root}
      className={a.root}
      data-view={view}
      onPointerDown={() => unlock()}
      onPointerMove={(e) => {
        const p = toCanvasSpace(e.clientX, e.clientY);
        root.current?.style.setProperty("--cx", `${p.x}px`);
        root.current?.style.setProperty("--cy", `${p.y}px`);
      }}
    >
      {photo && (
        <>
          {/* the room with the lights out */}
          <img className={a.dark} key={`d${view}`} src={photo.src} alt="" draggable={false} style={{ objectPosition: at }} />
          {/* the same room, lit — shown only where something is burning */}
          <img className={a.lit} key={`l${view}`} src={photo.src} alt="" draggable={false} style={{ objectPosition: at, maskImage: mask, WebkitMaskImage: mask } as CSSProperties} />
        </>
      )}

      {/* the fire, off to the left, breathing on everything nearest it */}
      <div className={a.fire} />
      <div className={a.window} key={flash} data-flash={flash > 0 || undefined} />
      <div className={a.motes} />

      {view === "hall" ? (
        <>
      {LAMPS.map((l) => (
        <button
          key={l.id}
          type="button"
          className={a.lamp}
          data-on={lit.includes(l.id) || undefined}
          style={{ left: `${l.x}%`, top: `${l.y}%` }}
          onClick={() => toggle(l.id)}
          aria-label={lit.includes(l.id) ? "Put the lamp out" : "Light the lamp"}
        >
          <i />
        </button>
      ))}

      {/* the book left open on the lectern */}
      <button
        type="button"
        className={a.open}
        onClick={() => {
          unlock();
          setBook(true);
          playNoise({ dur: 0.22, gain: 0.05, highpass: 1800, lowpass: 6000 });
        }}
      >
        someone left a book open
      </button>

          <button
            type="button"
            className={a.way}
            data-to="alcove"
            onClick={() => {
              unlock();
              setView("alcove");
              playNoise({ dur: 0.3, gain: 0.04, lowpass: 500 });
            }}
          >
            the window alcove <i>→</i>
          </button>
        </>
      ) : (
        <>
          {/* rain on the leaded glass, and whatever the storm does behind it */}
          <div className={a.pane} data-n="1" key={`p1${flash}`} data-flash={flash > 0 || undefined} />
          <div className={a.pane} data-n="2" key={`p2${flash}`} data-flash={flash > 0 || undefined} />
          <div className={a.fairy} />
          <button
            type="button"
            className={a.sconce}
            data-on={sconce || undefined}
            onClick={() => {
              unlock();
              setSconce((v) => !v);
              tone({ freq: 2400, toFreq: 900, duration: 0.03, type: "square", gain: 0.08 });
            }}
            aria-label={sconce ? "Put the lamp out" : "Light the lamp"}
          />
          <button
            type="button"
            className={a.way}
            data-to="hall"
            onClick={() => {
              unlock();
              setView("hall");
              playNoise({ dur: 0.3, gain: 0.04, lowpass: 500 });
            }}
          >
            <i>←</i> back to the hall
          </button>
        </>
      )}

      {/* your candle */}
      <div className={a.candle}>{flame && <img src={flame.src} alt="" draggable={false} />}</div>

      <div className={a.vignette} />

      <header className={a.title}>
        <h1>The Library</h1>
        <p>{view === "hall" ? "after hours · it is raining" : "the window alcove · the storm is on the glass"}</p>
      </header>

      {book && (
        <div className={a.reading} onClick={() => setBook(false)}>
          <article
            onClick={(e) => {
              e.stopPropagation();
              setPage((p) => (p + 1) % PAGES.length);
              playNoise({ dur: 0.2, gain: 0.05, highpass: 2000, lowpass: 6500 });
            }}
          >
            <small>{PAGES[page].head}</small>
            <p key={page}>{PAGES[page].text}</p>
            <cite>— {PAGES[page].by}</cite>
            <em>turn the page · click away to close it</em>
          </article>
        </div>
      )}
    </div>
  );
}
