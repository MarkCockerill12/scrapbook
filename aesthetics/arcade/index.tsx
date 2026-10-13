"use client";

import { useMusic } from "@/lib/music";
import { attract } from "./music";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { img } from "@/lib/assets";
import { noiseLoop, unlock } from "@/lib/audio";
import { sbGet } from "@/lib/storage";
import { useShell } from "@/lib/store";
import { Game } from "./Game";
import { bleep, clack } from "./sound";
import h from "./hall.module.css";

/**
 * Channel — Arcade. The row, from the door.
 *
 * Fourth build (2026-10). Mark: "a further-out shot of the arcade, and one of the
 * arcade machines is the fleshed-out main one we can interact with — get rid of the
 * prize counter and ball and grabber". So: one real photograph of a real arcade, taken
 * from far enough back to see the whole row and the fairy lights, and exactly one
 * cabinet in it that is switched on for you. Walk up to it and the room falls away
 * round the tube; step back and you are in the doorway again.
 */

const A = "arcade";

// the dark tube of the second cabinet, in canvas px (photo is 1600x1200, shown at y -200)
const QUAD = { tl: [300, 362], tr: [498, 345], br: [521, 472], bl: [336, 500] };
const GW = 512;
const GH = 448;

function quadMatrix(w: number, hh: number, q: typeof QUAD): string {
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
  return `matrix3d(${(x1 - x0 + a13 * x1) / w},${(y1 - y0 + a13 * y1) / w},0,${a13 / w},${(x3 - x0 + a23 * x3) / hh},${(y3 - y0 + a23 * y3) / hh},0,${a23 / hh},0,0,1,0,${x0},${y0},0,1)`;
}

export default function Arcade() {
  useMusic(attract, 126);
  const muted = useShell((s) => s.muted);
  const [close, setClose] = useState(false);
  const [best, setBest] = useState(0);
  const matrix = useMemo(() => quadMatrix(GW, GH, QUAD), []);

  useEffect(() => setBest(sbGet(A, "hi", 12000)), []);

  // the room: transformers, fans, and every other machine in attract mode
  useEffect(() => {
    if (muted) return;
    const hum = noiseLoop({ gain: 0.03, lowpass: 260, attack: 2 });
    let n = 0;
    const id = window.setInterval(() => {
      if (!close && Math.random() < 0.7) bleep(n++ + Math.floor(Math.random() * 4));
    }, 620);
    return () => {
      hum();
      window.clearInterval(id);
    };
  }, [muted, close]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && close) {
        e.preventDefault();
        e.stopPropagation();
        setClose(false);
        clack();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [close]);

  const photo = img(A, "ar_wide", 2);

  return (
    <div className={h.root} data-close={close || undefined} onPointerDown={() => unlock()}>
      <div className={h.cam}>
        {photo && <img className={h.room} src={photo.src} alt="" draggable={false} />}

        {/* the one tube that is live */}
        <div className={h.tube} style={{ width: GW, height: GH, transform: matrix } as CSSProperties}>
          <Game live={close} onScore={(n) => setBest((b) => Math.max(b, n))} />
          <i className={h.glass} />
        </div>
        <div className={h.throw} />

        {!close && (
          <button
            type="button"
            className={h.walk}
            onClick={() => {
              unlock();
              clack();
              setClose(true);
            }}
            aria-label="Walk up to the cabinet"
          >
            <span>walk up to it</span>
          </button>
        )}
        <div className={h.twinkle} />
      </div>

      <div className={h.grade} />

      <header className={h.title}>
        <h1>TILT!</h1>
        <p>open till late · hi-score {best.toLocaleString()}</p>
      </header>

      {close ? (
        <>
          <p className={h.keys}>
            <b>ENTER</b> coin &amp; start <b>← →</b> move <b>SPACE</b> fire
          </p>
          <button type="button" className={h.back} onClick={() => setClose(false)}>
            step back ⎋
          </button>
        </>
      ) : null}
    </div>
  );
}
