"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { img } from "@/lib/assets";
import { audioBus, tone, unlock } from "@/lib/audio";
import { playNoise, playNote, useMusic, type Score } from "@/lib/music";
import { sbGet, sbSet } from "@/lib/storage";
import g from "./rig.module.css";

/**
 * Channel — Neon. The battlestation, 2 a.m., lights off.
 *
 * Fourth build (2026-10). Mark: the wall of signs "is not an aesthetic" — his pick is
 * the RGB gamer setup. So this is one real photograph of one: a dark room, a monitor,
 * a tower with its fans lit, a keyboard glowing along the desk. Every bit of colour in
 * that photograph comes from an LED, which means the lighting software on the monitor
 * can genuinely drive it: change the effect and the real fans, the real keyboard and
 * the spill on the real wall all change with it.
 */

const A = "neon";

type Mode = "wave" | "static" | "breathe" | "music" | "reactive";
const MODES: { id: Mode; name: string; hint: string }[] = [
  { id: "wave", name: "Spectrum", hint: "the whole rig walks round the wheel" },
  { id: "static", name: "Static", hint: "one colour, everything" },
  { id: "breathe", name: "Breathe", hint: "one colour, in and out" },
  { id: "music", name: "Audio", hint: "kick drum on the fans" },
  { id: "reactive", name: "Reactive", hint: "type something" },
];

// the monitor's glass, in canvas px — the photo is shot from the left, so it is a
// quad, and the software is projected onto it with a real homography
const QUAD = { tl: [166, -44], tr: [1092, 74], br: [1088, 522], bl: [158, 538] };
const SW = 1000;
const SH = 640;

/** CSS matrix3d that maps a w×h rectangle onto four corners. */
function quadMatrix(w: number, h: number, q: typeof QUAD): string {
  const [x0, y0] = q.tl;
  const [x1, y1] = q.tr;
  const [x2, y2] = q.br;
  const [x3, y3] = q.bl;
  const dx1 = x1 - x2;
  const dx2 = x3 - x2;
  const dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2;
  const dy2 = y3 - y2;
  const dy3 = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1;
  const a13 = (dx3 * dy2 - dx2 * dy3) / den;
  const a23 = (dx1 * dy3 - dx3 * dy1) / den;
  const a11 = x1 - x0 + a13 * x1;
  const a21 = x3 - x0 + a23 * x3;
  const a12 = y1 - y0 + a13 * y1;
  const a22 = y3 - y0 + a23 * y3;
  return `matrix3d(${a11 / w},${a12 / w},0,${a13 / w},${a21 / h},${a22 / h},0,${a23 / h},0,0,1,0,${x0},${y0},0,1)`;
}

// Darksynth at 104: a kick you can hang a light on, a bass, and one cold arp.
const BASS = [33, 33, 36, 31];
const ARP = [57, 60, 64, 69, 64, 60, 72, 64];
const kick = { at: 0 };
const score: Score = (step, t, d) => {
  const bar = Math.floor(step / 16) % BASS.length;
  if (step % 4 === 0) {
    playNote({ freq: 120, from: 180, dur: 0.12, type: "sine", gain: 0.22, release: 0.12 }, t);
    const bus = audioBus();
    if (bus) kick.at = performance.now() + (t - bus.ctx.currentTime) * 1000;
  }
  if (step % 8 === 4) playNoise({ dur: 0.09, gain: 0.05, highpass: 1800 }, t);
  if (step % 2 === 1) playNoise({ dur: 0.02, gain: 0.014, highpass: 7000 }, t);
  if (step % 2 === 0) playNote({ freq: BASS[bar], midi: true, dur: d * 1.6, type: "sawtooth", gain: 0.07, filter: 420, release: 0.1 }, t);
  playNote({ freq: ARP[step % ARP.length] + (bar === 2 ? 3 : bar === 3 ? -2 : 0), midi: true, dur: d * 0.8, type: "square", gain: 0.014, filter: 2400, release: 0.2, wet: 0.5, pan: Math.sin(step) * 0.6 }, t);
};

const REPLIES = ["gg", "one more?", "it's 2am", "your mic is hot", "lights look sick ngl", "queue up", "brb water", "that was NOT my fault"];

export default function Neon() {
  const [mode, setMode] = useState<Mode>("wave");
  const [hue, setHue] = useState(280);
  const [speed, setSpeed] = useState(0.5);
  const [level, setLevel] = useState(1);
  const [power, setPower] = useState(true);
  const [chat, setChat] = useState<{ who: string; text: string }[]>([{ who: "vex", text: "you on?" }]);
  const [draft, setDraft] = useState("");

  const cfg = useRef({ mode, hue, speed, level, power });
  cfg.current = { mode, hue, speed, level, power };
  const rootRef = useRef<HTMLDivElement>(null);
  const bars = useRef<HTMLCanvasElement>(null);
  const hit = useRef({ at: -9999, hue: 0 });
  const typed = useRef("");
  const matrix = useMemo(() => quadMatrix(SW, SH, QUAD), []);

  useEffect(() => {
    setMode(sbGet<Mode>(A, "mode", "wave"));
    setHue(sbGet(A, "hue", 280));
  }, []);

  useMusic(score, 104, power);

  // ---- the lighting engine: one loop, writing three numbers
  useEffect(() => {
    const root = rootRef.current;
    const ctx = bars.current?.getContext("2d");
    if (!root) return;
    let analyser: AnalyserNode | null = null;
    let data = new Uint8Array(64);
    let raf = 0;
    const frame = (now: number) => {
      const c = cfg.current;
      const t = now / 1000;
      let h = c.hue;
      let lum = 1;
      let mono = 1;
      const sinceKick = (now - kick.at) / 1000;
      const sinceHit = (now - hit.current.at) / 1000;
      if (c.mode === "wave") {
        h = (t * (20 + c.speed * 140)) % 360;
        mono = 0;
      } else if (c.mode === "breathe") {
        lum = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * (0.6 + c.speed * 3)));
      } else if (c.mode === "music") {
        const k = sinceKick >= 0 && sinceKick < 0.4 ? 1 - sinceKick / 0.4 : 0;
        lum = 0.45 + k * 0.75;
        h = (c.hue + Math.floor(t / 2.3) * 47) % 360;
      } else if (c.mode === "reactive") {
        const k = sinceHit < 0.7 ? 1 - sinceHit / 0.7 : 0;
        lum = 0.22 + k * 1.0;
        h = hit.current.hue;
      }
      lum *= c.power ? c.level : 0.04;
      root.style.setProperty("--h", `${h.toFixed(1)}deg`);
      root.style.setProperty("--lum", lum.toFixed(3));
      root.style.setProperty("--mono", String(mono));

      if (ctx) {
        if (!analyser) {
          const bus = audioBus();
          if (bus) {
            analyser = bus.ctx.createAnalyser();
            analyser.fftSize = 128;
            bus.master.connect(analyser);
            data = new Uint8Array(analyser.frequencyBinCount);
          }
        }
        analyser?.getByteFrequencyData(data);
        ctx.clearRect(0, 0, 420, 150);
        for (let i = 0; i < 28; i++) {
          const v = analyser ? data[i + 1] / 255 : 0.08 + 0.06 * Math.sin(t * 2 + i);
          const bh = 6 + v * 138;
          ctx.fillStyle = `hsl(${(h + i * 7) % 360} 95% ${52 + v * 20}%)`;
          ctx.fillRect(i * 15, 150 - bh, 11, bh);
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      analyser?.disconnect();
    };
  }, []);

  // ---- the keyboard is your keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.length === 1 || e.key === "Enter" || e.key === "Backspace") {
        unlock();
        hit.current = { at: performance.now(), hue: (hit.current.hue + 37) % 360 };
        // a linear switch, bottoming out
        tone({ freq: 1900 + Math.random() * 500, toFreq: 700, duration: 0.025, gain: 0.05, type: "square" });
        playNoise({ dur: 0.02, gain: 0.03, highpass: 3000 });
        // the line being typed lives in a ref: sending from inside a state updater runs twice
        if (e.key === "Enter") {
          const text = typed.current.trim();
          typed.current = "";
          if (text && !e.repeat) {
            setChat((c) => [...c.slice(-5), { who: "you", text }]);
            window.setTimeout(() => setChat((c) => [...c.slice(-5), { who: "vex", text: REPLIES[Math.floor(Math.random() * REPLIES.length)] }]), 1400);
          }
        } else if (e.key === "Backspace") typed.current = typed.current.slice(0, -1);
        else typed.current = (typed.current + e.key).slice(-42);
        setDraft(typed.current);
        if (e.key === " ") e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pick = (m: Mode) => {
    unlock();
    setMode(m);
    sbSet(A, "mode", m);
    tone({ freq: 880, duration: 0.05, gain: 0.05, type: "square" });
  };

  const photo = img(A, "rgb_desk", 4);

  return (
    <div ref={rootRef} className={g.root} data-off={!power || undefined} onPointerDown={() => unlock()}>
      {/* the room: every colour in this photograph is an LED, so it can be turned */}
      {photo && <img className={g.room} src={photo.src} alt="" draggable={false} />}
      <div className={g.spill} />
      <div className={g.keys} />

      {/* the lighting software, on the actual monitor */}
      <div className={g.screen} style={{ width: SW, height: SH, transform: matrix } as CSSProperties}>
        <div className={g.app}>
          <header>
            <b>PRISM</b>
            <span>lighting engine 4.2 · 3 devices synced</span>
            <button type="button" data-on={power || undefined} onClick={() => setPower((p) => !p)} aria-label="Lighting power">
              ⏻
            </button>
          </header>

          <div className={g.cols}>
            <section className={g.fx}>
              <small>effect</small>
              {MODES.map((m) => (
                <button key={m.id} type="button" data-on={mode === m.id || undefined} onClick={() => pick(m.id)}>
                  <i />
                  <b>{m.name}</b>
                  <span>{m.hint}</span>
                </button>
              ))}
            </section>

            <section className={g.tune}>
              <small>colour</small>
              <input
                className={g.hue}
                type="range"
                min={0}
                max={359}
                value={hue}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setHue(v);
                  sbSet(A, "hue", v);
                  if (mode === "wave") pick("static");
                }}
                aria-label="Hue"
              />
              <div className={g.swatches}>
                {[0, 30, 120, 180, 220, 280, 320].map((h) => (
                  <button
                    key={h}
                    type="button"
                    style={{ background: `hsl(${h} 100% 55%)` }}
                    data-on={hue === h || undefined}
                    onClick={() => {
                      setHue(h);
                      sbSet(A, "hue", h);
                      if (mode === "wave") pick("static");
                    }}
                    aria-label={`Hue ${h}`}
                  />
                ))}
              </div>
              <small>speed</small>
              <input type="range" min={0} max={100} value={speed * 100} onChange={(e) => setSpeed(Number(e.target.value) / 100)} aria-label="Speed" />
              <small>brightness</small>
              <input type="range" min={20} max={130} value={level * 100} onChange={(e) => setLevel(Number(e.target.value) / 100)} aria-label="Brightness" />

              <div className={g.devices}>
                <span>K70 keyboard</span>
                <span>3× 120mm fans</span>
                <span>desk strip</span>
              </div>
            </section>

            <section className={g.side}>
              <small>now playing · night drive.flac</small>
              <canvas ref={bars} width={420} height={150} />
              <small>party chat</small>
              <div className={g.chat}>
                {chat.map((c, i) => (
                  <p key={i} data-me={c.who === "you" || undefined}>
                    <b>{c.who}</b> {c.text}
                  </p>
                ))}
                <p className={g.draft}>
                  &gt; {draft}
                  <i />
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>

      <div className={g.vignette} />
      <header className={g.title}>
        <h1>2:14 AM</h1>
        <p>lights off · rig on</p>
      </header>
    </div>
  );
}
