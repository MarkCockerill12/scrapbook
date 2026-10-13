"use client";

import { useEffect, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { cutN, img } from "@/lib/assets";
import { noiseLoop, tone, unlock } from "@/lib/audio";
import { playNote, useMusic, type Score } from "@/lib/music";
import { sbGet, sbSet } from "@/lib/storage";
import { useShell } from "@/lib/store";
import { Decal, STICKERS } from "./Decal";
import { eurobeat, peel, rev } from "./eurobeat";
import m from "./meet.module.css";

/**
 * Channel — JDM. The parking area, some time after one.
 *
 * Rebuilt 2026-10. The polaroid board is gone (Mark: "isn't at all what I wanted");
 * he picked two directions and this is both: a night parking-area meet, and the
 * cute-but-edgy itasha / sticker side of it. So the page is the forecourt itself — a
 * real car park at night, wet, lit teal and red by its own signs — with four real
 * cars lined up on it: three itasha and the panda Trueno everyone parks next to.
 *
 * You walk the line. Point at a car and it wakes up; click and it flashes its
 * headlights — the lamps and nothing else. Peel a sticker off the sheet and it goes wherever you put it, on any car,
 * and stays there.
 */

const A = "jdm";
const BASE = 792;

interface Car {
  id: string;
  slot: string;
  n: number;
  /** the matted subject's box inside its photograph, as fractions */
  box: { x: number; y: number; w: number; h: number; ratio: number };
  x: number;
  w: number;
  plate: string;
  name: string;
  note: string;
  glow: string;
  /** its front lamps, as fractions of the box, and how big each one burns */
  lamps: [number, number, number][];
}

const CARS: Car[] = [
  { id: "hachi-go", slot: "jdm_itasha", n: 1, box: { x: 0.0208, y: 0.196, w: 0.958, h: 0.673, ratio: 1920 / 1272 }, x: 36, w: 430, plate: "品川 86-39", name: "the loud one", note: "wrapped it herself. three weekends and a hairdryer.", glow: "255 60 160", lamps: [[0.108, 0.586, 54], [0.03, 0.495, 40]] },
  { id: "trueno", slot: "jdm_meet", n: 6, box: { x: 0.071, y: 0.3, w: 0.748, h: 0.652, ratio: 1024 / 683 }, x: 502, w: 340, plate: "群馬 13-954", name: "panda trueno", note: "no stickers. doesn't need them. don't touch it.", glow: "120 230 255", lamps: [[0.06, 0.489, 46], [0.524, 0.547, 58]] },
  { id: "march", slot: "jdm_itasha", n: 2, box: { x: 0.009, y: 0.186, w: 0.974, h: 0.747, ratio: 1920 / 1440 }, x: 878, w: 360, plate: "横浜 39-01", name: "strawberry march", note: "1.2 litres. gets more photos than the GT-Rs.", glow: "255 130 200", lamps: [[0.6375, 0.466, 64], [0.922, 0.447, 40]] },
  { id: "az1", slot: "jdm_itasha", n: 4, box: { x: 0.02, y: 0.011, w: 0.943, h: 0.948, ratio: 1920 / 1499 }, x: 1274, w: 290, plate: "千葉 66-00", name: "the kei with doors", note: "gullwings up so everyone can see the dash figures.", glow: "140 120 255", lamps: [[0.759, 0.712, 52], [0.96, 0.618, 38]] },
];

/** A roll of 35mm from the night. Mark: "the girl in front of the car from the 3DS is a
 *  perfect example" — so those three lead it. No captions: the pictures do the talking.
 *  `a` is the channel the file lives in. */
const SHOTS: { a?: string; slot: string; n: number }[] = [
  { a: "nintendo-3ds", slot: "n3ds_car", n: 1 },
  { a: "nintendo-3ds", slot: "n3ds_car", n: 2 },
  { a: "nintendo-3ds", slot: "n3ds_car", n: 3 },
  { a: "nintendo-3ds", slot: "n3ds_anime", n: 1 },
  { slot: "jdm_meet", n: 1 },
  { a: "nintendo-3ds", slot: "n3ds_street", n: 2 },
  { slot: "tk_ov2", n: 10 },
  { a: "nintendo-3ds", slot: "n3ds_wires", n: 1 },
  { slot: "jdm_detail", n: 8 },
  { slot: "jdm_streetnight", n: 1 },
  { slot: "jdm_detail", n: 5 },
  { slot: "jdm_parking", n: 1 },
];

interface Stuck {
  car: string;
  s: string;
  x: number;
  y: number;
  r: number;
}

// Parked music: a slow purple pad and one distant lead. The eurobeat is for when
// somebody turns a key.
const PAD = [
  [45, 52, 57, 60, 64],
  [41, 48, 53, 57, 60],
  [43, 50, 55, 59, 62],
  [40, 47, 52, 55, 59],
];
const idle: Score = (step, t, d) => {
  const c = PAD[Math.floor(step / 32) % PAD.length];
  if (step % 32 === 0) for (const [i, n] of c.entries()) playNote({ freq: n, midi: true, dur: d * 30, type: "sawtooth", gain: 0.02, attack: 1.4, release: 2.4, filter: 620, detune: 10, wet: 0.7, pan: (i - 2) / 3 }, t);
  if (step % 16 === 10) playNote({ freq: c[(step / 16) % c.length | 0] + 24, midi: true, dur: 0.8, type: "triangle", gain: 0.03, attack: 0.05, release: 2.2, wet: 0.9 }, t);
};

export default function JDM() {
  const muted = useShell((s) => s.muted);
  const [awake, setAwake] = useState<string | null>(null);
  const [flash, setFlash] = useState<Record<string, number>>({});
  const [hand, setHand] = useState<string | null>(null);
  const [stuck, setStuck] = useState<Stuck[]>([]);
  const [running, setRunning] = useState(false);
  const [shot, setShot] = useState<number | null>(null);


  useEffect(() => {
    setStuck(sbGet<Stuck[]>(A, "stuck", []));

  }, []);

  useMusic(running ? eurobeat : idle, running ? 155 : 76);

  useEffect(() => {
    if (muted) return;
    // drizzle on the tarmac, and somebody's straight-six idling three rows over
    const rain = noiseLoop({ gain: 0.035, lowpass: 5200, highpass: 1600, attack: 2 });
    const idleEng = noiseLoop({ gain: 0.05, lowpass: 110, attack: 2 });
    return () => {
      rain();
      idleEng();
    };
  }, [muted]);

  const wake = (car: Car) => {
    unlock();
    setFlash((f) => ({ ...f, [car.id]: (f[car.id] ?? 0) + 1 }));
    tone({ freq: 880, duration: 0.07, type: "square", gain: 0.06 });
    tone({ freq: 880, duration: 0.07, type: "square", gain: 0.06, delay: 0.16 });
  };

  const place = (car: Car, e: ReactPointerEvent<HTMLDivElement>) => {
    if (!hand) {
      wake(car);
      return;
    }
    unlock();
    const r = e.currentTarget.getBoundingClientRect();
    const next = [...stuck, { car: car.id, s: hand, x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100, r: Math.round(Math.random() * 16 - 8) }].slice(-40);
    setStuck(next);
    sbSet(A, "stuck", next);
    peel();
    setHand(null);
  };

  const key = () => {
    unlock();
    // a switch, not a timer: it stays on until you turn it off
    if (!running) rev();
    else tone({ freq: 300, toFreq: 90, duration: 0.25, type: "sawtooth", gain: 0.06 });
    setRunning((r) => !r);
  };

  const place0 = img(A, "tk_purple", 1);

  return (
    <div className={m.root} data-running={running || undefined} data-hand={hand || undefined} onPointerDown={() => unlock()}>
      {place0 && <img className={m.place} src={place0.src} alt="" draggable={false} />}
      <div className={m.haze} />

      {CARS.map((car) => {
        const cut = cutN(A, car.slot, car.n);
        if (!cut) return null;
        const h = car.w / ((car.box.w / car.box.h) * car.box.ratio);
        const iw = car.w / car.box.w;
        const ih = iw / car.box.ratio;
        const inner: CSSProperties = { width: iw, height: ih, left: -car.box.x * iw, top: -car.box.y * ih };
        return (
          <div
            key={car.id}
            className={m.car}
            data-awake={awake === car.id || undefined}
            style={{ left: car.x, top: BASE - h, width: car.w, height: h, "--glow": car.glow } as CSSProperties}
            onPointerEnter={() => setAwake(car.id)}
            onPointerLeave={() => setAwake((a) => (a === car.id ? null : a))}
          >
            <span className={m.under} />
            {/* the same car again, upside down in the wet */}
            <div className={m.mirror} style={{ height: h }}>
              <img src={cut.src} alt="" draggable={false} style={inner} />
            </div>
            <div className={m.body} key={flash[car.id] ?? 0} data-flash={(flash[car.id] ?? 0) > 0 || undefined} onPointerDown={(e) => place(car, e)}>
              <img src={cut.src} alt={car.name} draggable={false} style={inner} />
              {car.lamps.map(([lx, ly, size], i) => (
                <i key={`l${i}`} className={m.lamp} style={{ left: `${lx * 100}%`, top: `${ly * 100}%`, "--s": `${size}px` } as CSSProperties} />
              ))}
              {stuck
                .filter((s) => s.car === car.id)
                .map((s, i) => {
                  const st = STICKERS.find((x) => x.id === s.s);
                  return st ? (
                    <i key={i} className={m.sticker} style={{ left: `${s.x}%`, top: `${s.y}%`, rotate: `${s.r}deg` }}>
                      <Decal s={st} />
                    </i>
                  ) : null;
                })}
            </div>
            <div className={m.card}>
              <small>{car.plate}</small>
              <b>{car.name}</b>
              <span>{car.note}</span>
            </div>
          </div>
        );
      })}

      <div className={m.rain} />
      <div className={m.grade} />

      <header className={m.title}>
        <h1>歌舞伎町</h1>
        <p>midnight-run · kabukicho roll call · 01:14</p>
      </header>

      {/* the sticker sheet, on its backing paper */}
      <div className={m.sheet}>
        <small>peel one · stick it on a car</small>
        <div>
          {STICKERS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={m.sticker}
              data-held={hand === s.id || undefined}
              title={s.name}
              aria-label={s.name}
              onClick={() => {
                unlock();
                setHand((h) => (h === s.id ? null : s.id));
                peel();
              }}
            >
              <Decal s={s} />
            </button>
          ))}
        </div>
        {stuck.length > 0 && (
          <button
            type="button"
            className={m.clean}
            onClick={() => {
              setStuck([]);
              sbSet(A, "stuck", []);
              peel();
            }}
          >
            peel them all off
          </button>
        )}
      </div>

      {/* the roll from tonight, still uncut */}
      <nav className={m.roll} aria-label="Photographs from tonight">
        {SHOTS.map((sh, i) => {
          const th = img(sh.a ?? A, sh.slot, sh.n);
          return th ? (
            <button key={i} type="button" onClick={() => { unlock(); peel(); setShot(i); }} aria-label={`Photograph ${i + 1}`}>
              <img src={th.thumb} alt="" draggable={false} />
              <small>{String(i + 1).padStart(2, "0")}A</small>
            </button>
          ) : null;
        })}
      </nav>

      {shot !== null && (
        <div className={m.print} onClick={() => setShot(null)}>
          <figure onClick={(e) => e.stopPropagation()}>
            <img src={img(SHOTS[shot].a ?? A, SHOTS[shot].slot, SHOTS[shot].n)?.src ?? ""} alt="" draggable={false} />
            <button type="button" data-side="prev" onClick={() => setShot((shot + SHOTS.length - 1) % SHOTS.length)} aria-label="Previous">‹</button>
            <button type="button" data-side="next" onClick={() => setShot((shot + 1) % SHOTS.length)} aria-label="Next">›</button>
          </figure>
        </div>
      )}

      <button type="button" className={m.key} onClick={key}>
        {running ? "♪ eurobeat: on" : "eurobeat: off"}
      </button>

    </div>
  );
}
