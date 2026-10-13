"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { img } from "@/lib/assets";
import { unlock } from "@/lib/audio";
import { useMusic } from "@/lib/music";
import { sbGet, sbSet } from "@/lib/storage";
import { useShell } from "@/lib/store";
import { footsteps, mallsoft, paChime } from "./mallsoft";
import { shutter as rattle, startAmbience } from "./sound";
import d from "./directory.module.css";

/**
 * Channel — Dead Mall. Randall Park, some weekday afternoon after it closed.
 *
 * Sixth build (2026-10). Mark: "I don't want us to be able to walk around like it's a
 * 3D game… it needs to be more restricted and polished… like seeing all the old
 * aspects of a dying mall with different places to view."
 *
 * So the thing you are standing at is the one object in a mall whose whole job is to
 * show you the rest of it: the backlit directory by the entrance. The floor plan is
 * still lit. Nine places on it still answer. Press one and you are looking at it —
 * a real photograph of a real mall that died — and in each there are a few things
 * worth leaning in to. That is all you can do here, which is the point: you are a
 * visitor to somewhere that has stopped.
 */

const A = "dead-mall";

interface Detail {
  /** where to look, as a fraction of the photograph */
  x: number;
  y: number;
  text: string;
}

interface Place {
  id: string;
  no: number;
  name: string;
  line: string;
  slot: string;
  n: number;
  at: string;
  /** pin on the floor plan (viewBox 0 0 400 520) */
  px: number;
  py: number;
  details: Detail[];
}

const PLACES: Place[] = [
  {
    id: "sign",
    no: 1,
    name: "The pylon sign",
    line: "You can read it from the highway. That was the idea.",
    slot: "dm_hall",
    n: 15,
    at: "50% 40%",
    px: 46,
    py: 486,
    details: [
      { x: 0.58, y: 0.46, text: "The letters are still up. The tubes behind them were switched off in 2009." },
      { x: 0.7, y: 0.66, text: "Hooks where the tenant panels hung. There were once forty names under this one." },
    ],
  },
  {
    id: "lot",
    no: 2,
    name: "Lot C",
    line: "Nine thousand spaces. You could park anywhere, and for years everybody has.",
    slot: "dm_hall",
    n: 16,
    at: "50% 50%",
    px: 330,
    py: 492,
    details: [
      { x: 0.66, y: 0.42, text: "The anchor's canopy: concrete tulips, poured in 1976 and never needed since." },
      { x: 0.36, y: 0.8, text: "Weeds come up along the old paint lines first, so the lot is still ruled off in green." },
    ],
  },
  {
    id: "entrance",
    no: 3,
    name: "Entrance 4 · the cinema",
    line: "Twelve screens. The last film it showed is still on the marquee inside.",
    slot: "dm_hall",
    n: 12,
    at: "50% 50%",
    px: 200,
    py: 452,
    details: [
      { x: 0.5, y: 0.64, text: "Plywood over every door, each sheet cut to fit its own frame. Somebody did that carefully." },
      { x: 0.74, y: 0.44, text: "THEATRES. Three letters have gone, and it has been decided not to replace them." },
    ],
  },
  {
    id: "concourse",
    no: 4,
    name: "The south concourse",
    line: "Every unit let, once. Every shutter down, now, as far as you can see.",
    slot: "dm_hall",
    n: 13,
    at: "50% 55%",
    px: 200,
    py: 350,
    details: [
      { x: 0.47, y: 0.62, text: "The planters are still watered. Nobody on the staff will say who does it." },
      { x: 0.86, y: 0.6, text: "Roll shutters, both sides, to the end. Behind one there is a calendar still on the month they left." },
      { x: 0.4, y: 0.14, text: "The lights are on. They are on all night, for nobody." },
    ],
  },
  {
    id: "court",
    no: 5,
    name: "Centre court",
    line: "The middle of everything. Santa sat here. So did the car they raffled every spring.",
    slot: "mall_atrium",
    n: 1,
    at: "50% 60%",
    px: 200,
    py: 250,
    details: [
      { x: 0.5, y: 0.14, text: "The skylight. It is the only part of the building that was never closed." },
      { x: 0.4, y: 0.84, text: "A bench, facing where the stage used to be put up." },
      { x: 0.34, y: 0.72, text: "A stepladder, left open mid-job. The job was taking a sign down." },
    ],
  },
  {
    id: "food",
    no: 6,
    name: "The food court",
    line: "Chairs for three hundred, every one pushed in. Somebody thought they would be back.",
    slot: "dm_hall",
    n: 18,
    at: "50% 60%",
    px: 56,
    py: 250,
    details: [
      { x: 0.48, y: 0.66, text: "The table tops were new in 1994. That teal was in every mall in the country that year." },
      { x: 0.28, y: 0.46, text: "The counters. Menus taken down, the hoods and the heat lamps left." },
      { x: 0.6, y: 0.2, text: "The ring lights still come on at four, on a timer nobody can find." },
    ],
  },
  {
    id: "escalator",
    no: 7,
    name: "East court · escalators",
    line: "Up was always the side that broke. Now it is both.",
    slot: "mall_escalator",
    n: 2,
    at: "50% 70%",
    px: 346,
    py: 250,
    details: [
      { x: 0.44, y: 0.86, text: "It stopped with people on it, one afternoon, and was never restarted." },
      { x: 0.56, y: 0.6, text: "A shutter, down. The tile pattern carries on underneath it into the dark." },
      { x: 0.9, y: 0.84, text: "A wet-floor sign, standing guard over a floor that has been dry for years." },
    ],
  },
  {
    id: "anchor",
    no: 8,
    name: "The anchor store",
    line: "Four floors of department store. You can hear the roof drip from any of them.",
    slot: "dm_hall",
    n: 4,
    at: "50% 50%",
    px: 200,
    py: 58,
    details: [
      { x: 0.46, y: 0.2, text: "The ceiling came down the second winter. The tiles that are left are the ones over nothing." },
      { x: 0.62, y: 0.62, text: "The escalators go down into the basement level. Nobody has a torch that reaches the bottom." },
      { x: 0.42, y: 0.84, text: "Standing water, with the skylight in it." },
    ],
  },
  {
    id: "service",
    no: 9,
    name: "Service corridor B",
    line: "Not on the public map. You are looking through a hole somebody made in a door.",
    slot: "mall_abandoned",
    n: 1,
    at: "50% 55%",
    px: 286,
    py: 150,
    details: [
      { x: 0.62, y: 0.6, text: "Daylight, at the far end, where a loading door has been left up." },
      { x: 0.26, y: 0.36, text: "Dust on the glass you are looking through. It has your breath on it now." },
    ],
  },
];

/** The tenant list under the map. Most of it has been taped over. */
const TENANTS: [string, string, boolean][] = [
  ["101", "Sam's Records", false],
  ["104", "Photo Hut", false],
  ["110", "Orange Julep", false],
  ["117", "Walden Pages", false],
  ["122", "Hot Pretzel", true],
  ["128", "Toy Kingdom", false],
  ["133", "Things Remembered", false],
  ["140", "Aladdin's Arcade", false],
  ["146", "Watch Repair", true],
  ["152", "Suncoast Video", false],
  ["159", "Glamour Portraits", false],
  ["163", "Ears Pierced", false],
];

const TOTAL = PLACES.reduce((n2, p) => n2 + p.details.length, 0);

export default function DeadMall() {
  const muted = useShell((s) => s.muted);
  const [at, setAt] = useState(4);
  const [detail, setDetail] = useState<number | null>(null);
  const [found, setFound] = useState<string[]>([]);
  const [been, setBeen] = useState<string[]>([]);
  const still = useRef(0);

  useEffect(() => {
    setFound(sbGet<string[]>(A, "found", []));
    setBeen(sbGet<string[]>(A, "been", ["court"]));
    const id = window.setInterval(() => (still.current += 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  // The muzak only comes into focus when you stop and stand there.
  const score = useMemo(() => mallsoft(() => still.current > 5), []);
  useMusic(score, 58, true);
  useEffect(() => {
    if (muted) return;
    const stop = startAmbience();
    const id = window.setInterval(() => Math.random() < 0.5 && paChime(), 47000);
    return () => {
      stop();
      window.clearInterval(id);
    };
  }, [muted]);

  const place = PLACES[at];
  const photo = img(A, place.slot, place.n);
  const shown = detail !== null ? place.details[detail] : null;

  const go = (i: number) => {
    unlock();
    if (i === at) return;
    still.current = 0;
    [0, 260, 520].forEach((ms) => window.setTimeout(footsteps, ms));
    setAt(i);
    setDetail(null);
    const id = PLACES[i].id;
    if (!been.includes(id)) {
      const next = [...been, id];
      setBeen(next);
      sbSet(A, "been", next);
    }
  };

  const lean = (i: number) => {
    unlock();
    still.current = 0;
    if (detail === i) {
      setDetail(null);
      return;
    }
    setDetail(i);
    const key = `${place.id}:${i}`;
    if (!found.includes(key)) {
      const next = [...found, key];
      setFound(next);
      sbSet(A, "found", next);
    }
  };

  return (
    <div className={d.root} onPointerDown={() => unlock()}>
      <div className={d.room} />

      {/* ---------- the directory: the one thing here still doing its job ---------- */}
      <aside className={d.board}>
        <header>
          <h1>Randall Park</h1>
          <p>mall directory · 1976 – 2009</p>
        </header>

        <svg className={d.plan} viewBox="0 0 400 520" aria-hidden>
          {/* the car park, ruled off */}
          <g className={d.lot}>
            {Array.from({ length: 13 }, (_, i) => (
              <line key={i} x1={96 + i * 18} y1="478" x2={96 + i * 18} y2="510" />
            ))}
            <line x1="96" y1="494" x2="312" y2="494" />
          </g>
          {/* the building */}
          <g className={d.shell}>
            <rect x="112" y="24" width="176" height="70" rx="3" />
            <rect x="168" y="94" width="64" height="336" />
            <rect x="94" y="226" width="212" height="48" />
            <rect x="20" y="198" width="76" height="104" rx="3" />
            <rect x="304" y="210" width="80" height="80" rx="3" />
            <rect x="130" y="430" width="140" height="44" rx="3" />
            <rect x="232" y="128" width="96" height="40" />
            <polygon points="200,198 237,213 252,250 237,287 200,302 163,287 148,250 163,213" />
          </g>
          {/* units along the concourse: most of them dark */}
          <g className={d.units}>
            {Array.from({ length: 16 }, (_, i) => {
              const side = i % 2;
              const row = Math.floor(i / 2);
              const y = row < 4 ? 102 + row * 23 : 310 + (row - 4) * 28;
              return <rect key={i} x={side ? 236 : 138} y={y} width="26" height={row < 4 ? 19 : 23} data-lit={i === 4 || i === 13 || undefined} />;
            })}
          </g>
          <g className={d.names}>
            <text x="200" y="84">ANCHOR</text>
            <text x="58" y="290">FOOD</text>
            <text x="344" y="282">EAST</text>
            <text x="246" y="466">CINEMA</text>
          </g>
          {PLACES.map((p, i) => (
            <g
              key={p.id}
              className={d.pin}
              data-on={i === at || undefined}
              data-been={been.includes(p.id) || undefined}
              data-pin={p.id}
              transform={`translate(${p.px} ${p.py})`}
              onClick={() => go(i)}
              role="button"
              aria-label={p.name}
            >
              <circle r="15" />
              <text y="5">{p.no}</text>
            </g>
          ))}
          <g className={d.here} style={{ transform: `translate(${place.px}px, ${place.py}px)` }}>
            <circle r="22" />
          </g>
        </svg>

        <ul className={d.tenants}>
          {TENANTS.map(([no, name, open]) => (
            <li key={no} data-open={open || undefined} onClick={() => !open && rattle()}>
              <i>{no}</i>
              <span>{name}</span>
              <em>{open ? "open" : "vacant"}</em>
            </li>
          ))}
        </ul>
      </aside>

      {/* ---------- what that button shows you ---------- */}
      <figure className={d.view}>
        <div
          className={d.frame}
          key={place.id}
          data-near={shown ? true : undefined}
          style={{ "--fx": `${(shown?.x ?? 0.5) * 100}%`, "--fy": `${(shown?.y ?? 0.5) * 100}%` } as CSSProperties}
        >
          {photo && <img src={photo.src} alt={place.name} draggable={false} style={{ objectPosition: place.at }} />}
          <div className={d.dust} />
          {place.details.map((dt, i) => (
            <button
              key={i}
              type="button"
              className={d.mark}
              data-on={detail === i || undefined}
              data-found={found.includes(`${place.id}:${i}`) || undefined}
              style={{ left: `${dt.x * 100}%`, top: `${dt.y * 100}%` }}
              onClick={() => lean(i)}
              aria-label="Look closer"
            />
          ))}
          {shown && <button type="button" className={d.back} onClick={() => setDetail(null)} aria-label="Step back" />}
        </div>
        <div className={d.glass} />

        <figcaption key={`${place.id}${detail}`}>
          <small>
            {String(place.no).padStart(2, "0")} / {String(PLACES.length).padStart(2, "0")}
          </small>
          <h2>{place.name}</h2>
          <p>{shown ? shown.text : place.line}</p>
        </figcaption>

        <nav>
          <button type="button" onClick={() => go((at + PLACES.length - 1) % PLACES.length)} aria-label="Previous place">
            ‹
          </button>
          <button type="button" onClick={() => go((at + 1) % PLACES.length)} aria-label="Next place">
            ›
          </button>
        </nav>
      </figure>

      <div className={d.count}>
        <b>
          {found.length} / {TOTAL}
        </b>
        things noticed · {been.length} of {PLACES.length} places
      </div>
      <p className={d.hint}>press a number on the directory · the rings are things worth leaning in to</p>
      <div className={d.grade} />
    </div>
  );
}
