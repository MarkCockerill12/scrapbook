"use client";

import { useEffect, useRef, useState } from "react";
import { useCanvas } from "@/components/CanvasStage";
import { img } from "@/lib/assets";
import { noiseLoop, tone, unlock } from "@/lib/audio";
import { playNoise, playNote, useMusic, type Score } from "@/lib/music";
import { sbGet, sbSet } from "@/lib/storage";
import { useShell } from "@/lib/store";
import { CARDS } from "./data";
import { Postcard } from "./Postcard";
import b from "./beach.module.css";
import styles from "./styles.module.css";

/**
 * Channel — Game Beach.
 *
 * Rebuilt 2026-10 (Mark: "the postcards are cute, but all of this is just a bunch of
 * PNGs over the screen… focus more on the beach theme, and change the music to be a
 * beach theme"). The mascots, the coins, the counters and FLUDD are gone. What is
 * left is the beach — one real one, the impossible turquoise every game of that era
 * was trying to render — with the sea actually coming in, and six postcards from the
 * levels lying on the sand where somebody left them. Pick one up to read it.
 */

const A = "game-beach";

type Hour = "noon" | "sunset" | "night";
const HOURS: Hour[] = ["noon", "sunset", "night"];

/** Six cards, fanned along the dry sand. */
const SPREAD = [
  { x: 70, y: 610, r: -9 },
  { x: 300, y: 650, r: 5 },
  { x: 534, y: 618, r: -4 },
  { x: 770, y: 656, r: 7 },
  { x: 1006, y: 616, r: -6 },
  { x: 1240, y: 560, r: 4 },
];
const DECK = ["delfino", "emerald", "windfall", "seaslide", "treasure", "animal"].map((id) => CARDS.find((c) => c.id === id)).filter((c): c is (typeof CARDS)[number] => !!c);

/** A ukulele: a short bright pluck with a soft body under it. */
function uke(mid: number, t: number, g = 0.05, pan = 0) {
  playNote({ freq: mid, midi: true, dur: 0.06, type: "triangle", gain: g, attack: 0.002, release: 0.55, filter: 3600, wet: 0.25, pan }, t);
  playNote({ freq: mid + 12, midi: true, dur: 0.03, type: "sine", gain: g * 0.25, release: 0.2, pan }, t);
}

// Island time: C – Am – F – G7, strummed on the off-beats, a lazy tune on top.
const CH = [
  [60, 64, 67, 72],
  [57, 60, 64, 69],
  [53, 57, 60, 65],
  [55, 59, 62, 65],
];
const TUNE = [76, -1, 79, 76, -1, 72, 74, -1, 72, -1, 69, 72, -1, 67, -1, -1, 77, -1, 76, 72, -1, 69, 72, -1, 74, -1, 71, 67, -1, 74, -1, -1];
const score: Score = (step, t) => {
  const bar = Math.floor(step / 8) % CH.length;
  const s = step % 8;
  const c = CH[bar];
  if (s === 0 || s === 5) playNote({ freq: c[0] - 24, midi: true, dur: 0.3, type: "sine", gain: 0.1, release: 0.4 }, t);
  // down-up strum on the off-beats, strings a few ms apart
  if (s === 2 || s === 6) c.forEach((n, i) => uke(n, t + i * 0.014, 0.03, -0.3));
  if (s === 3 || s === 7) [...c].reverse().forEach((n, i) => uke(n, t + i * 0.011, 0.02, -0.3));
  const n = TUNE[step % TUNE.length];
  if (n > 0) uke(n, t, 0.055, 0.3);
  if (s % 2 === 1) playNoise({ dur: 0.03, gain: 0.012, highpass: 7000 }, t);
};

export default function GameBeach() {
  const { toCanvasSpace } = useCanvas();
  const muted = useShell((s) => s.muted);
  const [hour, setHour] = useState<Hour>("noon");
  const [open, setOpen] = useState<string | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [rings, setRings] = useState<{ x: number; y: number; k: number }[]>([]);
  const k = useRef(0);

  useEffect(() => {
    setHour(sbGet<Hour>(A, "hour", "noon"));
  }, []);

  useMusic(score, 104, true, 2);

  // The sea: a low wash that never stops, and a wave that arrives every few seconds.
  useEffect(() => {
    if (muted) return;
    const wash = noiseLoop({ gain: 0.03, lowpass: 900, highpass: 120, attack: 2 });
    const wave = () => {
      playNoise({ dur: 2.6, gain: 0.09, lowpass: 2600, highpass: 300, wet: 0.2 });
    };
    wave();
    const w = window.setInterval(wave, 6000);
    const gull = window.setInterval(() => {
      if (Math.random() < 0.45) {
        const f = 1500 + Math.random() * 500;
        for (let i = 0; i < 3; i++) tone({ freq: f, toFreq: f * 0.72, duration: 0.2, type: "sawtooth", gain: 0.012, delay: i * 0.27 });
      }
    }, 9000);
    return () => {
      wash();
      window.clearInterval(w);
      window.clearInterval(gull);
    };
  }, [muted]);

  const card = DECK.find((c) => c.id === open);

  return (
    <div
      className={b.root}
      data-hour={hour}
      onPointerDown={(e) => {
        unlock();
        const p = toCanvasSpace(e.clientX, e.clientY);
        // a pebble, if you throw it at the water
        if (p.y > 240 && p.y < 640 && !(e.target as HTMLElement).closest("button")) {
          k.current += 1;
          setRings((r) => [...r.slice(-5), { x: p.x, y: p.y, k: k.current }]);
          tone({ freq: 500, toFreq: 1300, duration: 0.11, gain: 0.1 });
          playNoise({ dur: 0.25, gain: 0.06, highpass: 1500, lowpass: 6000 });
        }
      }}
    >
      <img className={b.beach} src={img(A, "gb_scene", 2)?.src ?? ""} alt="" draggable={false} />
      <div className={b.glitter} />

      {/* the tide: foam running up the sand and sliding back */}
      <div className={b.tide}>
        <i />
        <i />
      </div>

      {rings.map((r) => (
        <span key={r.k} className={b.ring} style={{ left: r.x, top: r.y }} />
      ))}

      <div className={b.light} />

      {/* postcards on the sand */}
      <div className={b.cards}>
        {DECK.map((c, i) => (
          <Postcard
            key={c.id}
            card={{ ...c, goop: false }}
            x={SPREAD[i].x}
            y={SPREAD[i].y}
            rot={SPREAD[i].r}
            fludd={false}
            onOpen={() => {
              setOpen(c.id);
              setFlipped(false);
              playNoise({ dur: 0.18, gain: 0.05, highpass: 2000, lowpass: 7000 });
            }}
            onClean={() => {}}
            onSpray={() => {}}
          />
        ))}
      </div>

      <header className={b.title}>
        <small>greetings from the</small>
        <h1>Game Beach</h1>
        <p>1996 – 2008 · wish you were here</p>
      </header>

<div className={b.road} />
      <div className={b.sky}>
            <button
        type="button"
        className={b.sun}
        onClick={() => {
          const next = HOURS[(HOURS.indexOf(hour) + 1) % HOURS.length];
          setHour(next);
          sbSet(A, "hour", next);
          uke(next === "night" ? 64 : 72, 0, 0.07);
        }}
        aria-label="Change the time of day"
      />
      </div>


      {card && (
        <div className={styles.lightbox} onClick={() => setOpen(null)}>
          <div
            className={`${styles.big3d} ${flipped ? styles.flipped : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              setFlipped((f) => !f);
              playNoise({ dur: 0.18, gain: 0.05, highpass: 2000, lowpass: 7000 });
            }}
          >
            <div className={styles.front}>
              <img src={img(A, card.slot, card.n)?.src ?? ""} alt={card.place} />
              <span className={styles.frontCap}>{card.place}</span>
            </div>
            <div className={styles.back}>
              <div className={styles.msg}>
                {card.msg}
                <div className={styles.sign}>— {card.from}</div>
              </div>
              <div className={styles.addr}>
                {card.cover ? <img className={styles.stamp} src={img(A, card.cover.slot, card.cover.n)?.src ?? ""} alt="" /> : <span className={styles.stampBlank}>GAME BEACH POST</span>}
                <p>{card.game}</p>
                <p>{card.year}</p>
                <p>The Scrapbook</p>
              </div>
            </div>
          </div>
          <p className={b.turn}>click the card to turn it over · click the sand to put it down</p>
        </div>
      )}
    </div>
  );
}
