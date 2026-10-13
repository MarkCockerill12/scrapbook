"use client";

import { useEffect, useRef, useState } from "react";
import { cutN, img } from "@/lib/assets";
import { noiseLoop, tone, unlock } from "@/lib/audio";
import { playNoise, playNote, useMusic, type Score } from "@/lib/music";
import { sbGet, sbSet } from "@/lib/storage";
import { useShell } from "@/lib/store";
import { bird } from "./sound";
import r from "./room.module.css";

/**
 * Channel — Cottagecore. The kitchen, with the fire in.
 *
 * Rebuilt 2026-10 (Mark: "cosy and nice — not sitting at a table clicking stuff").
 * There is no table of objects any more and nothing to operate. The page is one real
 * room — a lamplit cottage kitchen, washing on the line, herbs drying over the window,
 * bread on the table — and the only thing it asks is that you stay in it a while.
 *
 * What moves is what would move: the fire, the lantern, the light at the window as
 * the day goes round, the weather outside it, the steam off the bowl, the cat.
 * You can stoke the fire, trim the lantern and look out of the window. That is all.
 */

const A = "cottagecore";

type Sky = "morning" | "golden" | "rain" | "night" | "snow";
const SKIES: { id: Sky; label: string }[] = [
  { id: "morning", label: "a bright morning" },
  { id: "golden", label: "late afternoon" },
  { id: "rain", label: "rain coming on" },
  { id: "night", label: "a clear night" },
  { id: "snow", label: "snow, and nowhere to be" },
];

// A lullaby in three: plucked, with the left hand holding the room up.
const TUNE = [72, 76, 79, 81, 79, 76, 74, 77, 81, 79, 77, 74, 72, 76, 79, 84, 83, 79, 77, 74, 72, 71, 72, -1];
const ROOTS = [48, 53, 55, 48, 45, 50, 55, 48];
const score: Score = (step, t) => {
  const beat = step % 3;
  const bar = Math.floor(step / 3);
  if (beat === 0) {
    const root = ROOTS[bar % ROOTS.length];
    playNote({ freq: root, midi: true, dur: 1.2, type: "sine", gain: 0.075, attack: 0.02, release: 1.6, wet: 0.4 }, t);
  } else {
    const root = ROOTS[bar % ROOTS.length];
    for (const off of [12, 16, 19]) playNote({ freq: root + off, midi: true, dur: 0.3, type: "triangle", gain: 0.02, attack: 0.01, release: 0.9, filter: 1800, wet: 0.5 }, t);
  }
  const m = TUNE[step % TUNE.length];
  if (m > 0) playNote({ freq: m, midi: true, dur: 0.35, type: "triangle", gain: 0.05, attack: 0.005, release: 1.5, filter: 3200, wet: 0.6, pan: 0.2 }, t);
};

export function Kitchen() {
  const muted = useShell((s) => s.muted);
  const [sky, setSky] = useState<Sky>("golden");
  const [fire, setFire] = useState(1);
  const [lantern, setLantern] = useState(true);
  const [purr, setPurr] = useState(false);
  const weather = useRef<HTMLCanvasElement>(null);
  const skyRef = useRef<Sky>("golden");
  skyRef.current = sky;

  useEffect(() => {
    setSky(sbGet<Sky>(A, "sky", "golden"));
  }, []);

  useMusic(score, 84, true, 1);

  // The fire settles if you leave it; it never goes out.
  useEffect(() => {
    const id = window.setInterval(() => setFire((f) => Math.max(0.45, f - 0.02)), 3000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (muted) return;
    const stops: (() => void)[] = [];
    if (sky === "rain") stops.push(noiseLoop({ gain: 0.06, lowpass: 3800, highpass: 800, attack: 2 }));
    if (sky === "snow" || sky === "night") stops.push(noiseLoop({ gain: 0.025, lowpass: 300, attack: 3 }));
    const crackle = window.setInterval(() => {
      if (Math.random() < 0.75) playNoise({ dur: 0.02 + Math.random() * 0.05, gain: (0.03 + Math.random() * 0.05) * fire, highpass: 800, lowpass: 5000, pan: 0.6 });
    }, 160);
    const clock = window.setInterval(() => tone({ freq: 1500, duration: 0.014, type: "square", gain: 0.014 }), 1000);
    const birds = window.setInterval(() => {
      if ((skyRef.current === "morning" || skyRef.current === "golden") && Math.random() < 0.6) bird();
    }, 4200);
    return () => {
      stops.forEach((s) => s());
      window.clearInterval(crackle);
      window.clearInterval(clock);
      window.clearInterval(birds);
    };
  }, [muted, sky, fire]);

  // Rain running down the panes, or snow going past them.
  useEffect(() => {
    const c = weather.current;
    const g = c?.getContext("2d");
    if (!c || !g) return;
    const bits = Array.from({ length: 70 }, (_, i) => ({ x: (i * 53) % 240, y: (i * 97) % 360, v: 1 + (i % 5) * 0.5, s: 1 + (i % 3) }));
    let raf = 0;
    const frame = () => {
      g.clearRect(0, 0, 240, 360);
      const mode = skyRef.current;
      if (mode === "rain") {
        g.strokeStyle = "rgba(225,235,245,0.55)";
        g.lineWidth = 1.2;
        g.beginPath();
        for (const b of bits) {
          b.y += b.v * 5;
          if (b.y > 370) b.y = -20;
          g.moveTo(b.x, b.y);
          g.lineTo(b.x - 2, b.y + 14 + b.s * 4);
        }
        g.stroke();
      } else if (mode === "snow") {
        g.fillStyle = "rgba(255,255,255,0.9)";
        for (const b of bits) {
          b.y += b.v * 0.7;
          b.x += Math.sin(b.y / 26 + b.s) * 0.5;
          if (b.y > 370) b.y = -10;
          g.beginPath();
          g.arc(b.x, b.y, b.s * 0.55, 0, 6.3);
          g.fill();
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const nextSky = () => {
    unlock();
    const i = SKIES.findIndex((s) => s.id === sky);
    const next = SKIES[(i + 1) % SKIES.length].id;
    setSky(next);
    sbSet(A, "sky", next);
    playNote({ freq: 79, midi: true, dur: 0.4, type: "sine", gain: 0.05, release: 1.4, wet: 0.7 });
  };

  const room = img(A, "cc_kitchen", 1);
  const cat = cutN(A, "cottage_cat", 1);

  return (
    <div className={r.root} data-sky={sky} data-lantern={lantern || undefined} style={{ "--fire": fire } as React.CSSProperties} onPointerDown={() => unlock()}>
      {room && <img className={r.room} src={room.src} alt="A lamplit cottage kitchen" draggable={false} />}

      {/* the window: the only daylight in the room, and all of its weather */}
      <button type="button" className={r.window} onClick={nextSky} aria-label="Look out of the window">
        <span className={r.pane} />
        <canvas ref={weather} width={240} height={360} />
      </button>
      <div className={r.daylight} />

      {/* the lantern on the mantel */}
      <button
        type="button"
        className={r.lantern}
        onClick={() => {
          unlock();
          setLantern((l) => !l);
          tone({ freq: 1800, toFreq: 700, duration: 0.04, type: "square", gain: 0.06 });
        }}
        aria-label={lantern ? "Turn the lantern down" : "Light the lantern"}
      />
      <div className={r.lanternGlow} />

      {/* the hearth */}
      <button
        type="button"
        className={r.hearth}
        onClick={() => {
          unlock();
          setFire(1.5);
          for (let i = 0; i < 9; i++) playNoise({ dur: 0.04 + Math.random() * 0.06, gain: 0.09, highpass: 700, lowpass: 5200, pan: 0.6 }, undefined);
        }}
        aria-label="Stoke the fire"
      >
        <i />
        <i />
        <i />
      </button>
      <div className={r.fireGlow} />

      {/* steam off the bowl */}
      <div className={r.steam}>
        <i />
        <i />
        <i />
      </div>

      {/* her */}
      {cat && (
        <button
          type="button"
          className={r.cat}
          data-purr={purr || undefined}
          onPointerEnter={() => {
            setPurr(true);
            for (let i = 0; i < 14; i++) tone({ freq: 26 + (i % 2) * 3, duration: 0.09, type: "sawtooth", gain: 0.07, delay: i * 0.11 });
          }}
          onPointerLeave={() => setPurr(false)}
          aria-label="The cat"
        >
          <img src={cat.src} alt="" draggable={false} />
        </button>
      )}

      <div className={r.shade} />

      <header className={r.title}>
        <h1>the kitchen</h1>
      </header>

      <p className={r.hint}>the fire wants stoking now and then · look out of the window · mind the cat</p>
    </div>
  );
}
