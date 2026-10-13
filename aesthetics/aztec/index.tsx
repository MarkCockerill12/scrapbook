"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useCanvas } from "@/components/CanvasStage";
import { cutN, src } from "@/lib/assets";
import { tone } from "@/lib/audio";
import { playNote, useMusic, type Score } from "@/lib/music";
import { sbGet, sbSet } from "@/lib/storage";
import { useShell } from "@/lib/store";
import { CRACK_X, MESSAGES, RELICS, type Relic } from "./lore";
import { startDrums, startFire } from "./sound";
import s from "./page.module.css";

/**
 * Channel 11 — Aztec / Lost Izalith. The Descent.
 *
 * Redesigned 2026-09-28. Mark: "a complete rework — a collage of ideas of Dark Souls'
 * Lost Izalith and Aztec/Mayan structure. This is more like a puzzle wall." The glyph
 * puzzle is gone. It's now a panorama you pan by moving the torch: real Mesoamerican
 * pyramids (Chichén Itzá, Tikal, Uxmal, Palenque, Cobá — matted Wikipedia photos)
 * standing in a real lava field, relit from below; Izalith and the Demon Ruins in the
 * far dark; real relics (the Sun Stone, a chacmool, an Olmec head, the Tula warriors)
 * described like Souls items; a bonfire; orange soapstone messages; and the lava,
 * which kills you.
 *
 * Kept: fall through the floor → Deep Sea (Mark called that out as clever).
 */

const A = "aztec";
const W = 1600;
const PW = 3000; // panorama width at the relic layer
const PAN = PW - W;

const RUINS = [
  { n: 1, x: 20, w: 620, b: 650 },
  { n: 9, x: 640, w: 420, b: 650 },
  { n: 5, x: 1040, w: 520, b: 650 },
  { n: 6, x: 1520, w: 600, b: 650 },
  { n: 1, x: 2080, w: 520, b: 650, flip: true },
];

/* The choir: minor, low, slow — detuned saws under the reverb. */
const CHOIR = [
  [45, 52, 57, 60],
  [44, 51, 56, 60],
  [41, 48, 53, 56],
  [43, 50, 55, 58],
];
const choir: Score = (step, time, dur) => {
  if (step % 16 !== 0) return;
  const c = CHOIR[Math.floor(step / 16) % CHOIR.length];
  c.forEach((m, i) =>
    playNote({ freq: m, midi: true, dur: dur * 15, gain: 0.03, type: "sawtooth", filter: 700, attack: 1.5, release: 2.5, detune: 18, vibrato: 8, wet: 0.9, pan: (i - 1.5) * 0.4 }, time),
  );
};

export default function Aztec() {
  const { toCanvasSpace } = useCanvas();
  const begin = useShell((st) => st.beginTransition);
  const muted = useShell((st) => st.muted);

  const cam = useRef(0);
  const target = useRef(0);
  const [camX, setCamX] = useState(0);
  const torch = useRef({ x: 800, y: 450 });
  const [pt, setPt] = useState({ x: 800, y: 450 });
  const [relic, setRelic] = useState<Relic | null>(null);
  const [lit, setLit] = useState(false);
  const [bonfireFlash, setBonfireFlash] = useState(false);
  const [died, setDied] = useState(false);
  const [deaths, setDeaths] = useState(0);
  const [msg, setMsg] = useState<number | null>(null);
  const [cracks, setCracks] = useState(0);
  const [falling, setFalling] = useState(false);
  const [found, setFound] = useState<string[]>([]);
  const burn = useRef(0);

  useEffect(() => {
    setLit(sbGet(A, "bonfire", false));
    setDeaths(sbGet(A, "deaths", 0));
    setFound(sbGet(A, "relics", []));
  }, []);

  useMusic(choir, 50, true);
  useEffect(() => {
    if (muted) return;
    const a = startFire();
    const b = startDrums();
    return () => {
      a();
      b();
    };
  }, [muted]);

  // Camera eases toward where the torch points; the lava-death timer runs here too.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = now - last;
      last = now;
      cam.current += (target.current - cam.current) * 0.06;
      setCamX(cam.current);
      if (!died && torch.current.y > 812) {
        burn.current += dt;
        if (burn.current > 2200) {
          burn.current = 0;
          setDied(true);
          tone({ freq: 110, toFreq: 55, duration: 2.4, type: "sawtooth", gain: 0.12 });
        }
      } else burn.current = Math.max(0, burn.current - dt * 2);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [died]);

  const onMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const p = toCanvasSpace(e.clientX, e.clientY);
      torch.current = p;
      setPt(p);
      // edges of the screen pan the panorama
      const edge = (p.x - W / 2) / (W / 2);
      target.current = Math.min(PAN, Math.max(0, target.current + edge * Math.abs(edge) * 22));
    },
    [toCanvasSpace],
  );

  const respawn = () => {
    setDied(false);
    target.current = 0;
    const d = deaths + 1;
    setDeaths(d);
    sbSet(A, "deaths", d);
  };

  const rest = () => {
    setLit(true);
    sbSet(A, "bonfire", true);
    setBonfireFlash(true);
    tone({ freq: 220, toFreq: 330, duration: 1.4, type: "sine", gain: 0.08 });
    tone({ freq: 440, duration: 1.8, type: "triangle", gain: 0.04, delay: 0.3 });
    window.setTimeout(() => setBonfireFlash(false), 3200);
  };

  const openRelic = (r: Relic) => {
    setRelic(r);
    tone({ freq: 523, duration: 0.5, type: "sine", gain: 0.06 });
    if (!found.includes(r.id)) {
      const next = [...found, r.id];
      setFound(next);
      sbSet(A, "relics", next);
    }
  };

  const hitCrack = () => {
    const n = cracks + 1;
    setCracks(n);
    tone({ freq: 90, toFreq: 50, duration: 0.3, type: "sawtooth", gain: 0.1 });
    if (n >= 3) {
      setFalling(true);
      tone({ freq: 300, toFreq: 40, duration: 2.2, type: "sawtooth", gain: 0.12 });
      window.setTimeout(() => begin("deep-sea"), 2600);
    }
  };

  const layer = (f: number) => ({ transform: `translateX(${-camX * f}px)` });
  const heat = useMemo(() => (pt.y > 700 ? (pt.y - 700) / 200 : 0), [pt.y]);

  return (
    <div className={`${s.root} ${falling ? s.falling : ""}`} onPointerMove={onMove}>
      {/* the far dark: Izalith and the Demon Ruins */}
      <div className={s.far} style={layer(0.25)}>
        <img src={src(A, "az_ds", 1)} alt="" style={{ left: 0 }} />
        <img src={src(A, "az_ds2", 4)} alt="" style={{ left: 1000 }} />
        <img src={src(A, "az_ds2", 2)} alt="" style={{ left: 1700 }} />
      </div>
      <div className={s.smoke} />

      {/* the ground: real paving stone, lit orange from the lava */}
      <div className={s.ground} style={{ backgroundImage: `url(${src(A, "az_floor", 1)})`, backgroundPositionX: `${-camX * 0.9}px` }} />

      {/* the pyramids, relit from below */}
      <div className={s.ruins} style={layer(0.6)}>
        {RUINS.map((r) => (
          <div key={r.x} className={s.ruin} style={{ left: r.x, width: r.w, bottom: 900 - r.b, transform: "flip" in r ? "scaleX(-1)" : undefined }}>
            <img src={cutN(A, "az_ruin", r.n)?.src ?? ""} alt="" />
          </div>
        ))}
      </div>

      {/* relics, the soapstone messages, the bonfire, the crack */}
      <div className={s.near} style={layer(1)}>
        {RELICS.map((r) => (
          <button key={r.id} type="button" className={s.relic} style={{ left: r.x, width: 250 }} onClick={() => openRelic(r)} aria-label={r.name}>
            <img src={cutN(A, r.slot, r.n)?.src ?? ""} alt="" />
          </button>
        ))}

        <button type="button" className={`${s.bonfire} ${lit ? s.bonfireLit : ""}`} onClick={rest} aria-label="Rest at bonfire">
          <img className={s.embers} src={src(A, "az_fire", 1)} alt="" />
          <img className={s.sword} src={cutN(A, "az_fire2", 1)?.src ?? ""} alt="" />
          <span className={s.flame} />
          <span className={s.prompt}>{lit ? "Rest at bonfire" : "Light bonfire"}</span>
        </button>

        {MESSAGES.map((m, i) => (
          <button key={i} type="button" className={s.soap} style={{ left: m.x }} onClick={() => setMsg(i)}>
            <span>{m.text}</span>
          </button>
        ))}

        <button type="button" className={`${s.crack} ${cracks ? s.cracked : ""}`} style={{ left: CRACK_X }} onClick={hitCrack} aria-label="A crack in the floor" />
      </div>

      {/* the lava river */}
      <div className={s.lava} style={{ backgroundImage: `url(${src(A, "az_lava", 2)})`, backgroundPositionX: `${-camX * 1.2}px` }} />
      <div className={s.lavaGlow} style={{ opacity: 0.55 + heat * 0.4 }} />

      {/* the torch — everything outside it falls to near-black */}
      <div className={s.dark} style={{ background: `radial-gradient(circle at ${pt.x}px ${pt.y}px, transparent 0, rgba(8,3,0,.15) 150px, rgba(8,3,0,.72) 380px, rgba(4,1,0,.9) 620px)` }} />
      <div className={s.torchGlow} style={{ left: pt.x, top: pt.y }} />

      {/* HUD */}
      <div className={s.place}>
        <b>IZALITH</b>
        <span>the buried city</span>
      </div>
      <div className={s.hud}>
        <span className={s.bar}>
          <i style={{ width: `${Math.max(0, 100 - heat * 60)}%` }} />
        </span>
        <span className={s.souls}>
          RELICS {found.length}/{RELICS.length} · DEATHS {deaths}
        </span>
      </div>

      {msg !== null && (
        <div className={s.msgCard} onClick={() => setMsg(null)}>
          <p>&ldquo;{MESSAGES[msg].text}&rdquo;</p>
          <small>{MESSAGES[msg].note}</small>
        </div>
      )}

      {relic && (
        <div className={s.item} onClick={() => setRelic(null)}>
          <div className={s.itemCard}>
            <img src={cutN(A, relic.slot, relic.n)?.src ?? ""} alt="" />
            <div>
              <h3>{relic.name}</h3>
              <em>{relic.kind}</em>
              <p>{relic.lore}</p>
            </div>
          </div>
        </div>
      )}

      {bonfireFlash && <div className={s.banner}>BONFIRE LIT</div>}
      {died && (
        <div className={s.died} onClick={respawn}>
          <b>YOU DIED</b>
          <small>click to return to the bonfire</small>
        </div>
      )}
      {falling && (
        <div className={s.fall}>
          <b>The floor was an illusion.</b>
          <small>something far below is full of water</small>
        </div>
      )}
    </div>
  );
}
