"use client";

import { useEffect, useState } from "react";
import { unlock } from "@/lib/audio";
import { useMusic } from "@/lib/music";
import { sbGet, sbSet } from "@/lib/storage";
import { punk } from "./punk";
import { Run, type Hud } from "./Run";
import v from "./tape.module.css";

/**
 * Channel — City Escape. (Slug kept: skate-zine.)
 *
 * Third build (2026-10). Mark: "an actual skating minigame where you skate and grind
 * on rails and move around". So that is what the tape is of now: a two-minute street
 * line, side-on, filmed off a VHS camcorder. You push, pop, flip, grab, and lock onto
 * every rail and ledge the street throws at you; a line only counts when you ride
 * away from it.
 */

const A = "skate-zine";

type Phase = "title" | "run" | "over";

const EMPTY: Hud = { score: 0, combo: [], pot: 0, mult: 0, time: 120, banked: null, special: 0 };

export default function CityEscape() {
  const [phase, setPhase] = useState<Phase>("title");
  const [run, setRun] = useState(0);
  const [hud, setHud] = useState<Hud>(EMPTY);
  const [best, setBest] = useState(0);
  const [final, setFinal] = useState(0);

  useEffect(() => setBest(sbGet(A, "best", 0)), []);
  useMusic(punk, 168, phase === "run");

  const start = () => {
    unlock();
    setHud(EMPTY);
    setRun((r) => r + 1);
    setPhase("run");
  };

  useEffect(() => {
    if (phase === "run") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        start();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  const t = Math.ceil(hud.time);
  const clock = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;

  return (
    <div className={v.root} data-phase={phase} onPointerDown={() => unlock()}>
      <div className={v.film}>
        <Run
          key={run}
          live={phase === "run"}
          onHud={setHud}
          onOver={(score) => {
            setFinal(score);
            if (score > best) {
              setBest(score);
              sbSet(A, "best", score);
            }
            window.setTimeout(() => setPhase("over"), 900);
          }}
        />
      </div>
      <div className={v.lens} />
      <div className={v.lines} />
      <div className={v.track} />

      <div className={v.osd}>
        <span className={v.play}>PLAY ▶</span>
        <span>SP</span>
        <span>AUG. 14 2001</span>
      </div>

      {phase === "run" && (
        <>
          <div className={v.score}>
            <small>score</small>
            <b>{hud.score.toLocaleString()}</b>
          </div>
          <div className={v.clock} data-low={t <= 15 || undefined}>
            {clock}
          </div>
          <div className={v.special} data-full={hud.special >= 1 || undefined}>
            <i style={{ width: `${hud.special * 100}%` }} />
            <span>SPECIAL</span>
          </div>

          {hud.combo.length > 0 && (
            <div className={v.combo}>
              <p>{hud.combo.slice(-5).join("  +  ")}</p>
              <b>
                {hud.pot.toLocaleString()} <em>× {hud.mult}</em>
              </b>
            </div>
          )}
          {hud.banked && (
            <div className={v.banked} key={hud.banked.k} data-bail={hud.banked.text === "BAIL" || undefined}>
              {hud.banked.text === "BAIL" ? "BAIL" : `+${hud.banked.text}`}
            </div>
          )}

          <p className={v.keys}>
            <b>→</b> push <b>←</b> brake <b>SPACE</b> hold &amp; release to ollie · in the air: <b>←</b> kickflip <b>→</b> heelflip <b>↓</b> shove-it <b>↑</b> grab · land on a rail to
            grind · hold <b>↓</b> landing to manual
          </p>
        </>
      )}

      {phase === "title" && (
        <div className={v.title}>
          <h1>
            CITY ESCAPE <em>&apos;01</em>
          </h1>
          <button type="button" onClick={start}>
            DROP IN
          </button>
          <small>{best > 0 ? `best run on this tape: ${best.toLocaleString()}` : "space or enter"}</small>
        </div>
      )}

      {phase === "over" && (
        <div className={v.title}>
          <h1>{final >= best && final > 0 ? "NEW BEST" : "TAPE ENDS"}</h1>
          <p>
            {final.toLocaleString()} points{best > final ? ` · best ${best.toLocaleString()}` : ""}
          </p>
          <button type="button" onClick={start}>
            RUN IT BACK
          </button>
        </div>
      )}
    </div>
  );
}
