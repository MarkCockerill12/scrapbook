"use client";

import { useMusic } from "@/lib/music";
import { abyss } from "./music";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useCanvas } from "@/components/CanvasStage";
import { cutN, img } from "@/lib/assets";
import { noiseLoop, tone, unlock } from "@/lib/audio";
import { sbGet, sbSet } from "@/lib/storage";
import { useShell } from "@/lib/store";
import s from "./sub.module.css";

/**
 * Channel — Deep Sea. DSV-4, one seat, one viewport.
 *
 * Fourth build (2026-10). Mark: "it doesn't feel like I'm exploring deep under the
 * water, or I'm in a sub… I can't see the mouse." So you are IN the sub now. The page
 * is the pilot's view: a steel-framed viewport with the ocean behind it, an instrument
 * shelf under it, and a searchlight on the hull that goes wherever you point. You fly
 * it — down, up, round — and the only way to see anything below two hundred metres is
 * to put the lamp on it. Every animal out there is a real photograph.
 */

const A = "deep-sea";
const MAX = 9000;
const RING = 5200; // px of water all the way round the sub
const PX = 3.2; // px per metre, vertically

interface Animal {
  id: string;
  slot: string;
  n: number;
  name: string;
  note: string;
  depth: number;
  bearing: number;
  w: number;
  /** "cut" = matted cutout in lit water; "glow" = ROV frame on black, screen-blended */
  kind: "cut" | "glow";
  drift: number;
  flip?: boolean;
}

const ANIMALS: Animal[] = [
  { id: "dolphin", slot: "ds_sun", n: 2, name: "Bottlenose dolphin", note: "Came to look at the sub. Stayed about a minute.", depth: 14, bearing: 600, w: 340, kind: "cut", drift: 60 },
  { id: "turtle", slot: "ds_sun", n: 1, name: "Green sea turtle", note: "Unbothered.", depth: 38, bearing: 2300, w: 300, kind: "cut", drift: -22, flip: true },
  { id: "manta", slot: "ds_sun", n: 3, name: "Manta ray", note: "Three metres across. It banks like an aircraft.", depth: 72, bearing: 3900, w: 460, kind: "cut", drift: 30 },
  { id: "whaleshark", slot: "ds_sun", n: 4, name: "Whale shark", note: "The biggest fish there is, and it eats plankton.", depth: 118, bearing: 1500, w: 760, kind: "cut", drift: -18, flip: true },
  { id: "hammerhead", slot: "ds_sun", n: 7, name: "Scalloped hammerhead", note: "They school by the hundred at the edge of the light.", depth: 160, bearing: 4600, w: 420, kind: "cut", drift: 40 },
  { id: "sunfish", slot: "ds_sun", n: 8, name: "Ocean sunfish", note: "A head with fins. Dives to feed on jellies.", depth: 215, bearing: 3000, w: 320, kind: "cut", drift: 12 },
  { id: "moon", slot: "ds_sun", n: 6, name: "Moon jellies", note: "The first things you need the light for.", depth: 320, bearing: 900, w: 520, kind: "glow", drift: 6 },
  { id: "atolla", slot: "ds_twi", n: 1, name: "Atolla jellyfish", note: "When attacked it flashes blue in rings — a burglar alarm.", depth: 520, bearing: 2600, w: 560, kind: "glow", drift: 9 },
  { id: "comb", slot: "ds_twi", n: 3, name: "Comb jelly", note: "The rainbow is not light it makes. It is your light, combed.", depth: 720, bearing: 4300, w: 380, kind: "glow", drift: 11 },
  { id: "hatchet", slot: "ds_twi", n: 2, name: "Hatchetfish", note: "Lit from underneath, so nothing below sees its shadow.", depth: 880, bearing: 1700, w: 340, kind: "cut", drift: -8 },
  { id: "fang", slot: "ds_mid", n: 1, name: "Fangtooth", note: "Largest teeth for its size of any fish. It is the size of your hand.", depth: 1400, bearing: 3400, w: 560, kind: "glow", drift: 8 },
  { id: "dragon", slot: "ds_mid", n: 4, name: "Dragonfish", note: "Makes red light, which almost nothing down here can see.", depth: 2100, bearing: 500, w: 560, kind: "glow", drift: -10 },
  { id: "bristle", slot: "ds_mid", n: 2, name: "Barracudina", note: "Hangs head-up in the dark, waiting.", depth: 2800, bearing: 2100, w: 640, kind: "glow", drift: 7 },
  { id: "dumbo", slot: "ds_mid", n: 3, name: "Dumbo octopus", note: "Flies with its ears. Deepest-living octopus known.", depth: 3900, bearing: 4000, w: 560, kind: "glow", drift: 12 },
  { id: "coral", slot: "ds_abyss", n: 4, name: "Gorgonian coral", note: "A fan the size of a door, older than any tree on your street.", depth: 5600, bearing: 1200, w: 700, kind: "glow", drift: 0 },
  { id: "smoker", slot: "ds_abyss", n: 1, name: "Black smoker", note: "Water at 350°C, kept liquid by the weight on top of it.", depth: 7400, bearing: 3000, w: 620, kind: "glow", drift: 0 },
  { id: "worms", slot: "ds_abyss", n: 3, name: "Giant tube worms", note: "No mouth, no gut. They farm bacteria on the vent's chemistry.", depth: 8700, bearing: 4500, w: 720, kind: "glow", drift: 0 },
  // The one thing down here that is not alive. A real photograph of the real bow.
  { id: "wreck", slot: "ds_wreck", n: 1, name: "RMS Titanic — the bow", note: "The rail is still on her. She really lies at 3,800 m off Newfoundland; in this ocean she went all the way down.", depth: 8950, bearing: 1620, w: 1500, kind: "glow", drift: 0 },
];

const ZONES = [
  { at: 0, name: "Sunlight zone" },
  { at: 200, name: "Twilight zone" },
  { at: 1000, name: "Midnight zone" },
  { at: 4000, name: "Abyssal zone" },
  { at: 6000, name: "Hadal zone" },
  { at: 8900, name: "The bottom" },
];

function lerp(a: number[], b: number[], t: number) {
  return a.map((v, i) => Math.round(v + (b[i] - v) * t));
}
/** Water colour by depth: blue, then less blue, then nothing. */
function water(d: number): [string, string] {
  const stops: [number, number[], number[]][] = [
    [0, [70, 190, 232], [14, 110, 178]],
    [150, [16, 98, 160], [6, 52, 104]],
    [500, [5, 34, 72], [2, 16, 40]],
    [1200, [2, 10, 24], [1, 4, 12]],
    [9000, [1, 3, 8], [0, 1, 4]],
  ];
  let i = 0;
  while (i < stops.length - 2 && d > stops[i + 1][0]) i++;
  const [d0, t0, b0] = stops[i];
  const [d1, t1, b1] = stops[i + 1];
  const t = Math.max(0, Math.min(1, (d - d0) / (d1 - d0)));
  return [`rgb(${lerp(t0, t1, t).join(",")})`, `rgb(${lerp(b0, b1, t).join(",")})`];
}

export default function DeepSea() {
  useMusic(abyss, 30, true, 1);
  const { toCanvasSpace } = useCanvas();
  const muted = useShell((st) => st.muted);
  const [hud, setHud] = useState({ depth: 0, heading: 0, vs: 0 });
  const [logged, setLogged] = useState<string[]>([]);
  const [card, setCard] = useState<Animal | null>(null);
  const [lamp, setLamp] = useState(true);

  const sub = useRef({ depth: 6, vd: 0, x: 0, vx: 0 });
  const ptr = useRef({ x: 800, y: 380 });
  const keys = useRef(new Set<string>());
  const lampRef = useRef(true);
  lampRef.current = lamp;
  const rootRef = useRef<HTMLDivElement>(null);
  const seaRef = useRef<HTMLDivElement>(null);
  const snow = useRef<HTMLCanvasElement>(null);
  const els = useRef<(HTMLDivElement | null)[]>([]);
  const lit = useRef<number[]>([]);
  const beamRef = useRef<HTMLDivElement>(null);
  const reticle = useRef<HTMLDivElement>(null);
  const floorRef = useRef<HTMLDivElement>(null);
  const sonar = useRef<HTMLCanvasElement>(null);
  const pingT = useRef(-10);

  useEffect(() => {
    setLogged(sbGet<string[]>(A, "log", []));
    sub.current.depth = sbGet(A, "depth", 6);
  }, []);

  useEffect(() => {
    if (muted) return;
    const hull = noiseLoop({ gain: 0.05, lowpass: 160, attack: 2 });
    const fans = noiseLoop({ gain: 0.012, lowpass: 2600, highpass: 1200, attack: 2 });
    const creak = window.setInterval(() => {
      if (sub.current.depth > 800 && Math.random() < 0.5) tone({ freq: 70 + Math.random() * 40, toFreq: 50, duration: 0.7, gain: 0.07, type: "sawtooth" });
    }, 9000);
    return () => {
      hull();
      fans();
      window.clearInterval(creak);
    };
  }, [muted]);

  useEffect(() => {
    const root = rootRef.current;
    const cv = snow.current;
    const ctx = cv?.getContext("2d");
    const sc = sonar.current?.getContext("2d");
    if (!root || !cv || !ctx) return;

    const flakes = Array.from({ length: 170 }, (_, i) => ({ x: (i * 197) % 1600, y: (i * 113) % 760, z: 0.3 + ((i * 31) % 10) / 10, p: i * 1.9 }));
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      unlock();
      sub.current.vd += e.deltaY * 0.035;
    };
    const down = (e: KeyboardEvent) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (["w", "a", "s", "d", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Shift"].includes(k)) {
        e.preventDefault();
        e.stopPropagation();
        keys.current.add(k);
        unlock();
        if (k === " " && !e.repeat) ping();
      }
    };
    const up = (e: KeyboardEvent) => {
      // space on a focused button would press it on the way back up
      if (e.key === " ") e.preventDefault();
      keys.current.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    };
    const ping = () => {
      pingT.current = performance.now() / 1000;
      tone({ freq: 1500, toFreq: 1460, duration: 0.5, gain: 0.07, type: "sine" });
      tone({ freq: 1500, duration: 0.3, gain: 0.02, type: "sine", delay: 0.7 });
    };
    root.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", down, true);
    window.addEventListener("keyup", up, true);

    let raf = 0;
    let last = performance.now();
    let hudT = 0;
    let saveT = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      const t = now / 1000;
      const sb = sub.current;
      const k = keys.current;
      // shift opens the thrusters right up
      const run = k.has("Shift") ? 5 : 1;
      if (k.has("s") || k.has("ArrowDown")) sb.vd += 46 * run * dt;
      if (k.has("w") || k.has("ArrowUp")) sb.vd -= 46 * run * dt;
      if (k.has("d") || k.has("ArrowRight")) sb.vx += 520 * run * dt;
      if (k.has("a") || k.has("ArrowLeft")) sb.vx -= 520 * run * dt;
      sb.vd = Math.max(-60 * run, Math.min(60 * run, sb.vd)) * (1 - dt * 0.9);
      sb.vx = Math.max(-420 * run, Math.min(420 * run, sb.vx)) * (1 - dt * 1.6);
      sb.depth = Math.max(2, Math.min(MAX, sb.depth + sb.vd * dt));
      if (sb.depth <= 2 || sb.depth >= MAX) sb.vd = 0;
      sb.x = (((sb.x + sb.vx * dt) % RING) + RING) % RING;

      // water, and how much daylight is left in it
      const [top, bot] = water(sb.depth);
      const sea = seaRef.current;
      if (sea) {
        sea.style.background = `linear-gradient(180deg, ${top}, ${bot})`;
        sea.style.setProperty("--day", Math.max(0, 1 - sb.depth / 220).toFixed(3));
      }
      const dark = Math.max(0, Math.min(1, (sb.depth - 120) / 380));

      // the lamp
      const p = ptr.current;
      const on = lampRef.current;
      if (beamRef.current) {
        beamRef.current.style.transform = `translate(${p.x - 340}px, ${p.y - 340}px)`;
        beamRef.current.style.opacity = on ? String(0.25 + dark * 0.75) : "0";
      }
      if (reticle.current) reticle.current.style.transform = `translate(${p.x - 23}px, ${p.y - 23}px)`;

      // the bottom: silt, coming up to meet the skids
      if (floorRef.current) {
        const fy = 380 + (MAX + 70 - sb.depth) * PX;
        floorRef.current.style.display = fy > 800 ? "none" : "block";
        floorRef.current.style.transform = `translateY(${fy.toFixed(1)}px)`;
        floorRef.current.style.backgroundPositionX = `${(-sb.x).toFixed(1)}px`;
        floorRef.current.style.setProperty("--lx", `${p.x}px`);
      }

      // the animals
      for (let i = 0; i < ANIMALS.length; i++) {
        const a = ANIMALS[i];
        const el = els.current[i];
        if (!el) continue;
        const y = 380 + (a.depth - sb.depth) * PX + Math.sin(t * 0.5 + i) * 10;
        if (y < -500 || y > 1300) {
          el.style.display = "none";
          lit.current[i] = 0;
          continue;
        }
        let dx = (a.bearing + a.drift * t - sb.x) % RING;
        if (dx > RING / 2) dx -= RING;
        if (dx < -RING / 2) dx += RING;
        const x = 800 + dx;
        el.style.display = "block";
        el.style.transform = `translate(${(x - a.w / 2).toFixed(1)}px, ${(y - a.w * 0.34).toFixed(1)}px)`;
        // below the light, a thing exists only where the lamp is
        const dist = Math.hypot(x - p.x, y - p.y);
        const inBeam = on ? Math.max(0, 1 - dist / (240 + a.w * 0.3)) : 0;
        const vis = (1 - dark) * (a.kind === "cut" ? 1 : 0.5) + dark * Math.min(1, inBeam * 1.7);
        lit.current[i] = vis;
        el.style.opacity = vis.toFixed(3);
      }

      // marine snow: the only thing that tells you that you are moving
      ctx.clearRect(0, 0, 1600, 760);
      for (const f of flakes) {
        f.y -= sb.vd * PX * dt * f.z * 0.9 - 6 * dt * f.z;
        f.x -= sb.vx * dt * f.z + Math.sin(t * 0.6 + f.p) * 0.2;
        if (f.y < -10) f.y += 780;
        if (f.y > 770) f.y -= 780;
        if (f.x < -10) f.x += 1620;
        if (f.x > 1610) f.x -= 1620;
        const d = Math.hypot(f.x - p.x, f.y - p.y);
        const glow = on ? Math.max(0, 1 - d / 300) : 0;
        const a = (1 - dark) * 0.28 * f.z + dark * (0.05 + glow * 0.85) * f.z;
        if (a < 0.02) continue;
        ctx.fillStyle = `rgba(214, 236, 255, ${a.toFixed(3)})`;
        const len = Math.min(14, Math.abs(sb.vd) * 0.22 * f.z);
        ctx.fillRect(f.x, f.y, 1.2 + f.z * 1.6, 1.2 + f.z * 1.6 + len);
      }

      // sonar: a sweep, and whatever is within four hundred metres
      if (sc) {
        sc.clearRect(0, 0, 150, 150);
        // rAF time can sit a hair behind performance.now(): never a negative radius
        const since = Math.max(0, t - pingT.current);
        sc.strokeStyle = "rgba(60, 255, 190, 0.28)";
        sc.lineWidth = 1;
        for (const r of [24, 48, 70]) {
          sc.beginPath();
          sc.arc(75, 75, r, 0, Math.PI * 2);
          sc.stroke();
        }
        const ang = t * 1.6;
        sc.strokeStyle = "rgba(60, 255, 190, 0.8)";
        sc.beginPath();
        sc.moveTo(75, 75);
        sc.lineTo(75 + Math.cos(ang) * 70, 75 + Math.sin(ang) * 70);
        sc.stroke();
        if (since < 1.4) {
          sc.strokeStyle = `rgba(60, 255, 190, ${1 - since / 1.4})`;
          sc.beginPath();
          sc.arc(75, 75, since * 50, 0, Math.PI * 2);
          sc.stroke();
        }
        for (const a of ANIMALS) {
          const dz = a.depth - sb.depth;
          if (Math.abs(dz) > 420) continue;
          let dx = (a.bearing + a.drift * t - sb.x) % RING;
          if (dx > RING / 2) dx -= RING;
          if (dx < -RING / 2) dx += RING;
          const bx = 75 + (dx / (RING / 2)) * 66;
          const by = 75 + (dz / 420) * 66;
          const fresh = since < 4 ? 1 - since / 4 : 0.25;
          sc.fillStyle = `rgba(160, 255, 220, ${0.25 + fresh * 0.75})`;
          sc.fillRect(bx - 2, by - 2, 4, 4);
        }
      }

      hudT += dt;
      if (hudT > 0.12) {
        hudT = 0;
        setHud({ depth: sb.depth, heading: (sb.x / RING) * 360, vs: sb.vd });
      }
      saveT += dt;
      if (saveT > 4) {
        saveT = 0;
        sbSet(A, "depth", Math.round(sb.depth));
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      root.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", down, true);
      window.removeEventListener("keyup", up, true);
    };
  }, []);

  const shoot = () => {
    unlock();
    // the shutter takes whatever the lamp is most squarely on
    let best = -1;
    let score = 0.45;
    lit.current.forEach((v, i) => {
      if (v > score) {
        score = v;
        best = i;
      }
    });
    tone({ freq: 2400, toFreq: 900, duration: 0.05, gain: 0.08, type: "square" });
    if (best < 0) return;
    const a = ANIMALS[best];
    setCard(a);
    if (!logged.includes(a.id)) {
      const next = [...logged, a.id];
      setLogged(next);
      sbSet(A, "log", next);
      tone({ freq: 880, duration: 0.12, gain: 0.06, delay: 0.1 });
      tone({ freq: 1320, duration: 0.2, gain: 0.06, delay: 0.22 });
    }
  };

  const zone = [...ZONES].reverse().find((z) => hud.depth >= z.at) ?? ZONES[0];
  const bar = 1 + hud.depth / 10;
  const temp = hud.depth < 200 ? 24 - hud.depth * 0.05 : Math.max(1.6, 14 - Math.log10(hud.depth / 200 + 1) * 12);

  return (
    <div
      ref={rootRef}
      className={s.root}
      onPointerMove={(e) => {
        const p = toCanvasSpace(e.clientX, e.clientY);
        ptr.current = { x: p.x, y: Math.min(p.y, 730) };
      }}
      onPointerDown={() => unlock()}
    >
      {/* ---------- outside ---------- */}
      <div ref={seaRef} className={s.sea} onClick={shoot}>
        <div className={s.rays} />
        <div ref={floorRef} className={s.floor} style={{ display: "none" }} />
        {ANIMALS.map((a, i) => {
          const art = a.kind === "cut" ? cutN(A, a.slot, a.n) : img(A, a.slot, a.n);
          return (
            <div
              key={a.id}
              ref={(el) => {
                els.current[i] = el;
              }}
              className={s.animal}
              data-kind={a.kind}
              style={{ width: a.w } as CSSProperties}
            >
              {art && <img src={art.src} alt={a.name} draggable={false} style={a.flip ? { transform: "scaleX(-1)" } : undefined} />}
            </div>
          );
        })}
        <canvas ref={snow} className={s.snow} width={1600} height={760} />
        <div ref={beamRef} className={s.beam} />
        <div className={s.glass} />
      </div>

      {/* ---------- the sub ---------- */}
      <div className={s.frame} />
      <div ref={reticle} className={s.reticle} />

      <div className={s.console}>
        <div className={s.depth}>
          <small>depth</small>
          <b>{hud.depth.toFixed(0).padStart(4, "0")}</b>
          <i>m</i>
          <span>{zone.name}</span>
        </div>

        <div className={s.dials}>
          <div>
            <small>pressure</small>
            <b>{bar.toFixed(0)}</b>
            <i>bar</i>
          </div>
          <div>
            <small>water</small>
            <b>{temp.toFixed(1)}</b>
            <i>°C</i>
          </div>
          <div>
            <small>heading</small>
            <b>{String(Math.round(hud.heading) % 360).padStart(3, "0")}</b>
            <i>°</i>
          </div>
          <div data-warn={Math.abs(hud.vs) > 40 || undefined}>
            <small>{hud.vs >= 0 ? "descending" : "ascending"}</small>
            <b>{Math.abs(hud.vs).toFixed(0)}</b>
            <i>m/s</i>
          </div>
        </div>

        <div className={s.sonar}>
          <canvas ref={sonar} width={150} height={150} />
          <small>sonar · space to ping</small>
        </div>

        <div className={s.switches}>
          <button type="button" data-on={lamp || undefined} onClick={() => setLamp((l) => !l)}>
            <i />
            light
          </button>
          <div className={s.log}>
            <small>logged</small>
            <b>
              {logged.length}
              <em> / {ANIMALS.length}</em>
            </b>
          </div>
        </div>

        {/* the ladder: how far down this actually is */}
        <div className={s.ladder}>
          <i style={{ top: `${(hud.depth / MAX) * 100}%` }} />
          {ANIMALS.map((a) => (
            <span key={a.id} data-got={logged.includes(a.id) || undefined} style={{ top: `${(a.depth / MAX) * 100}%` }} />
          ))}
        </div>
      </div>

      <p className={s.hint}>W / S or scroll to dive and rise · A / D to come about · hold shift to move faster · the light goes where you point · click to photograph what it finds</p>

      {card && (
        <button type="button" className={s.card} onClick={() => setCard(null)}>
          <img src={(card.kind === "cut" ? cutN(A, card.slot, card.n) : img(A, card.slot, card.n))?.src ?? ""} alt="" data-kind={card.kind} />
          <div>
            <small>
              frame {String(logged.indexOf(card.id) + 1).padStart(2, "0")} · {card.depth} m
            </small>
            <b>{card.name}</b>
            <span>{card.note}</span>
          </div>
        </button>
      )}
    </div>
  );
}
