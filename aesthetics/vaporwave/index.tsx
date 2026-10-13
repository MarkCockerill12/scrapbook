"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cutN } from "@/lib/assets";
import { chime, tick, unlock } from "@/lib/audio";
import { useMusic } from "@/lib/music";
import { sbGet, sbSet } from "@/lib/storage";
import { useShell } from "@/lib/store";
import { DEFAULT_PATTERN, PATCHES, drum, junoNote, makeScore, type Inst, type Pattern } from "./engine";
import { GridFloor } from "./GridFloor";
import { Juno, KEYMAP, TR808 } from "./Instruments";
import { Mountains, type Terrain } from "./Mountains";
import { Win95Window, type WindowState } from "./Win95Window";
import p from "./page.module.css";

/**
 * Channel 10 — Vaporwave. PLAZA 95.
 *
 * Redesigned 2026-09-28. Mark: "get rid of the statue and do more interesting things
 * with it — more synth stuff, cool mountains, an overall redesign."
 *
 * A sunset synth studio on the edge of a wireframe mountain range. The two machines
 * that made the sound the genre later slowed down — a real Roland Juno-60 and a real
 * TR-808, photographed — are playable: keys, arpeggiator, chorus, eight patches, a
 * sixteen-step drum sequencer. The SLOWED + REVERB fader does the genre's one trick
 * live: it drags the pitch and tempo down and floods the reverb. Real Mount Fuji,
 * real palms and real dolphins, all graded into the same sunset.
 */

const A = "vaporwave";
const TEMPOS = [84, 96, 108, 120, 132];
const MAJ7 = [60, 64, 67, 71];

type Win = "plaza" | "slowed";
const WINS: Record<Win, WindowState> = {
  plaza: { x: 40, y: 36, w: 400, h: 330, z: 5, closed: false },
  slowed: { x: 1170, y: 36, w: 390, h: 250, z: 6, closed: false },
};

/** Skies. Five stops, top to horizon, and the two ends of the sun. */
const SKIES = [
  { id: "sunset", name: "Sunset", sky: ["#0c0126", "#2b0a5a", "#7a1d8c", "#ff5f9e", "#ffb36b"], sun: ["#fff27a", "#ff4fa3"], fill: "#12021f", ridge: 312, cross: 184 },
  { id: "midnight", name: "Midnight", sky: ["#01010c", "#07082a", "#141a5c", "#3a2f9e", "#7a5cff"], sun: ["#e9f1ff", "#7a8cff"], fill: "#03041a", ridge: 250, cross: 190 },
  { id: "miami", name: "Miami", sky: ["#04202c", "#0b4a5a", "#18a39a", "#7df2c8", "#ffe9a8"], sun: ["#ffffff", "#ff8fb8"], fill: "#031a22", ridge: 168, cross: 322 },
  { id: "peach", name: "Peach", sky: ["#3a1036", "#8a2a5c", "#e0627a", "#ffa987", "#ffe3b0"], sun: ["#fffbe0", "#ff7a59"], fill: "#2a0a26", ridge: 20, cross: 300 },
  { id: "tape", name: "VHS blue", sky: ["#000418", "#001a5c", "#0a3fd0", "#3f8cff", "#b8e0ff"], sun: ["#ffffff", "#ff3fd8"], fill: "#000a2a", ridge: 200, cross: 320 },
] as const;

interface Look {
  sky: number;
  amp: number;
  speed: number;
  rough: number;
  ridge: number;
  cross: number;
  hue: number;
  sun: number;
  stripes: boolean;
  fuji: boolean;
  palms: boolean;
  stars: boolean;
  lines: boolean;
  flash: boolean;
}

const LOOK: Look = { sky: 0, amp: 1, speed: 1, rough: 1, ridge: 312, cross: 184, hue: 0, sun: 1, stripes: true, fuji: true, palms: true, stars: true, lines: true, flash: true };
type Tab = "waves" | "sky" | "colour";

export default function Vaporwave() {
  const muted = useShell((s) => s.muted);
  const setMuted = useShell((s) => s.setMuted);

  const [pattern, setPattern] = useState<Pattern>(DEFAULT_PATTERN);
  const [inst, setInst] = useState<Inst>("BD");
  const [playing, setPlaying] = useState(false);
  const [tempoI, setTempoI] = useState(1);
  const [step, setStep] = useState(0);
  const [held, setHeld] = useState<number[]>([]);
  const [arp, setArp] = useState(false);
  const [hold, setHold] = useState(false);
  const [chorus, setChorus] = useState(1);
  const [patch, setPatch] = useState(1);
  const [slow, setSlow] = useState(0.85);
  const [wins, setWins] = useState(WINS);
  const [dolphin, setDolphin] = useState(0);
  const [secret, setSecret] = useState(false);
  const pulse = useRef(0);
  const speed = useRef(1);
  const sun = useRef<HTMLDivElement>(null);
  const [look, setLook] = useState<Look>(LOOK);
  const [tab, setTab] = useState<Tab>("waves");
  const terrain = useRef<Terrain>({ amp: 1, speed: 1, rough: 1, ridge: 312, cross: 184, fill: "#12021f", flash: true });
  terrain.current = { amp: look.amp, speed: look.speed, rough: look.rough, ridge: look.ridge, cross: look.cross, fill: SKIES[look.sky].fill, flash: look.flash };

  useEffect(() => {
    // "groove", not "pattern": the old default had a cowbell and two toms in it that
    // read as stray bloops, and saved copies of it should not come back
    setPattern(sbGet(A, "groove", DEFAULT_PATTERN));
    setSlow(sbGet(A, "slow", 0.85));
    setLook({ ...LOOK, ...sbGet<Partial<Look>>(A, "look", {}) });
  }, []);

  const turn = (part: Partial<Look>) => {
    setLook((l) => {
      const next = { ...l, ...part };
      sbSet(A, "look", next);
      return next;
    });
  };
  const sky = SKIES[look.sky];

  // live refs so the score reads current state without restarting the clock
  const live = useRef({ pattern, playing, arp, held, patch, chorus, slow });
  live.current = { pattern, playing, arp, held, patch, chorus, slow };

  const score = useMemo(
    () =>
      makeScore({
        pattern: () => live.current.pattern,
        playing: () => live.current.playing,
        arp: () => live.current.arp,
        held: () => live.current.held,
        patch: () => PATCHES[live.current.patch],
        chorus: () => live.current.chorus,
        slow: () => live.current.slow,
        onStep: (s, kick) => {
          setStep(s);
          if (kick) pulse.current = 1;
        },
      }),
    [],
  );
  const bpm = Math.round(TEMPOS[tempoI] * slow);
  useMusic(playing || arp ? score : null, bpm, playing || arp);
  useEffect(() => {
    speed.current = playing ? bpm / 90 : 0.35;
  }, [playing, bpm]);

  // the sun breathes on the kick
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      if (sun.current) sun.current.style.setProperty("--kick", pulse.current.toFixed(3));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const wake = useCallback(() => {
    if (muted) {
      unlock();
      setMuted(false);
    }
  }, [muted, setMuted]);

  const down = useCallback(
    (m: number) => {
      wake();
      setHeld((h) => (h.includes(m) ? (hold ? h.filter((x) => x !== m) : h) : [...h, m]));
      if (!live.current.arp) junoNote(m, PATCHES[live.current.patch], live.current.chorus, live.current.slow, 0.5);
      pulse.current = Math.max(pulse.current, 0.5);
    },
    [hold, wake],
  );
  const up = useCallback(
    (m: number) => {
      if (hold) return;
      setHeld((h) => h.filter((x) => x !== m));
    },
    [hold],
  );

  // Computer keyboard plays the Juno (A W S E D F T G Y H U J K …).
  useEffect(() => {
    const isField = (e: KeyboardEvent) => (e.target as HTMLElement)?.closest?.("input, textarea");
    const kd = (e: KeyboardEvent) => {
      if (e.repeat || isField(e)) return;
      const m = KEYMAP[e.key.toLowerCase()];
      if (m) down(m);
      if (e.key === " ") {
        e.preventDefault();
        setPlaying((x) => !x);
      }
    };
    const ku = (e: KeyboardEvent) => {
      const m = KEYMAP[e.key.toLowerCase()];
      if (m) up(m);
    };
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => {
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }, [down, up]);

  // Hold a Cmaj7 and the tape plays its secret.
  useEffect(() => {
    const pcs = new Set(held.map((m) => m % 12));
    if (MAJ7.every((m) => pcs.has(m % 12)) && !secret) {
      setSecret(true);
      setDolphin((d) => d + 1);
      chime(true);
      window.setTimeout(() => setSecret(false), 5000);
    }
  }, [held, secret]);

  const toggleStep = (s: number) => {
    wake();
    tick();
    setPattern((pt) => {
      const next = { ...pt, [inst]: pt[inst].map((v, i) => (i === s ? !v : v)) };
      sbSet(A, "groove", next);
      return next;
    });
  };

  const setSlowed = (v: number) => {
    setSlow(v);
    sbSet(A, "slow", v);
  };

  const focus = (w: Win) => setWins((all) => ({ ...all, [w]: { ...all[w], z: Math.max(...Object.values(all).map((x) => x.z)) + 1 } }));

  const slowPct = Math.round(((1 - slow) / 0.3) * 100);

  return (
    <div className={p.root} style={{ ["--slow" as string]: 1 - slow }}>
      {/* everything out of the window: one layer, so one dial can turn all of it */}
      <div
        className={p.scene}
        style={
          {
            "--s1": sky.sky[0],
            "--s2": sky.sky[1],
            "--s3": sky.sky[2],
            "--s4": sky.sky[3],
            "--s5": sky.sky[4],
            "--sunA": sky.sun[0],
            "--sunB": sky.sun[1],
            "--sunSize": look.sun,
            "--ground": sky.fill,
            filter: look.hue ? `hue-rotate(${look.hue}deg)` : undefined,
          } as React.CSSProperties
        }
      >
        <div className={p.sky} />
        {look.stars && <div className={p.stars} />}
        <div ref={sun} className={p.sun} data-plain={!look.stripes || undefined} />
        {look.fuji && <img className={p.fuji} src={cutN(A, "vw_fuji", 1)?.src ?? ""} alt="" />}
        <Mountains width={1600} height={900} horizon={470} speed={speed} pulse={pulse} terrain={terrain} />
        <div className={p.floor} style={{ filter: `hue-rotate(${look.cross - 184}deg)` }}>
          <GridFloor speed={(playing ? bpm / 60 : 0.4) * look.speed} chroma={1 - slow + 0.2} width={1600} height={430} />
        </div>

        {/* palms and dolphins, graded into the sunset */}
        {look.palms && (
          <>
            <img className={`${p.palm} ${p.palmL}`} src={cutN(A, "vapor_palm", 2)?.src ?? ""} alt="" />
            <img className={`${p.palm} ${p.palmR}`} src={cutN(A, "vapor_palm", 1)?.src ?? ""} alt="" />
          </>
        )}
        {dolphin > 0 && <img key={dolphin} className={p.dolphin} src={cutN(A, "vapor_dolphin", 4)?.src ?? ""} alt="" />}
      </div>

      <h1 className={p.title}>
        P L A Z A &nbsp;9 5<span>プラザ ・ 夕焼けスタジオ</span>
      </h1>

      {/* the machines */}
      <div className={p.desk} />
      <div className={p.junoWrap}>
        <Juno
          width={880}
          held={held}
          arp={arp}
          hold={hold}
          chorus={chorus}
          patch={patch}
          onDown={down}
          onUp={up}
          onArp={() => {
            wake();
            setArp((a) => !a);
          }}
          onHold={() => {
            setHold((h) => !h);
            setHeld([]);
          }}
          onChorus={setChorus}
          onPatch={(i) => {
            setPatch(i);
            junoNote(60, PATCHES[i], chorus, slow, 0.3);
          }}
        />
      </div>
      <div className={p.trWrap}>
        <TR808
          width={540}
          pattern={pattern}
          inst={inst}
          step={step}
          playing={playing}
          tempo={TEMPOS[tempoI]}
          onInst={(i) => {
            wake();
            setInst(i);
            // picking a voice plays it, so you know what you picked
            drum(i, undefined as unknown as number, slow, 1);
          }}
          onToggle={toggleStep}
          onStartStop={() => {
            wake();
            setPlaying((x) => !x);
          }}
          onTempo={() => setTempoI((t) => (t + 1) % TEMPOS.length)}
        />
      </div>

      {/* 1995 windows */}
      {!wins.plaza.closed && (
        <Win95Window
          title="AESTHETIC.CPL"
          state={wins.plaza}
          tilt={0}
          onMove={(x, y) => setWins((w) => ({ ...w, plaza: { ...w.plaza, x, y } }))}
          onFocus={() => focus("plaza")}
          onClose={() => setWins((w) => ({ ...w, plaza: { ...w.plaza, closed: true } }))}
        >
          <div className={p.cpl}>
            <nav>
              {(["waves", "sky", "colour"] as const).map((t) => (
                <button key={t} type="button" data-on={tab === t || undefined} onClick={() => { setTab(t); tick(); }}>
                  {t}
                </button>
              ))}
            </nav>
            {tab === "waves" && (
              <div className={p.rows}>
                <label>
                  <span>height</span>
                  <input type="range" min={0} max={2} step={0.02} value={look.amp} onChange={(e) => turn({ amp: Number(e.target.value) })} />
                </label>
                <label>
                  <span>speed</span>
                  <input type="range" min={0} max={3} step={0.02} value={look.speed} onChange={(e) => turn({ speed: Number(e.target.value) })} />
                </label>
                <label>
                  <span>rough</span>
                  <input type="range" min={0.3} max={2.4} step={0.02} value={look.rough} onChange={(e) => turn({ rough: Number(e.target.value) })} />
                </label>
                <label className={p.check}>
                  <input type="checkbox" checked={look.flash} onChange={(e) => turn({ flash: e.target.checked })} /> the kick drum lights the ridges
                </label>
              </div>
            )}
            {tab === "sky" && (
              <div className={p.rows}>
                <div className={p.skies}>
                  {SKIES.map((s, i) => (
                    <button
                      key={s.id}
                      type="button"
                      data-on={look.sky === i || undefined}
                      style={{ background: `linear-gradient(180deg, ${s.sky[1]}, ${s.sky[3]}, ${s.sky[4]})` }}
                      onClick={() => { turn({ sky: i, ridge: s.ridge, cross: s.cross, hue: 0 }); tick(); }}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
                <label>
                  <span>sun</span>
                  <input type="range" min={0.4} max={1.6} step={0.02} value={look.sun} onChange={(e) => turn({ sun: Number(e.target.value) })} />
                </label>
                <div className={p.checks}>
                  {(
                    [
                      ["stripes", "sliced sun"],
                      ["fuji", "Mt. Fuji"],
                      ["palms", "palms"],
                      ["stars", "stars"],
                      ["lines", "scanlines"],
                    ] as const
                  ).map(([k, name]) => (
                    <label key={k} className={p.check}>
                      <input type="checkbox" checked={look[k]} onChange={(e) => turn({ [k]: e.target.checked })} /> {name}
                    </label>
                  ))}
                </div>
              </div>
            )}
            {tab === "colour" && (
              <div className={p.rows}>
                <label>
                  <span>ridges</span>
                  <input className={p.hue} type="range" min={0} max={359} value={look.ridge} onChange={(e) => turn({ ridge: Number(e.target.value) })} />
                </label>
                <label>
                  <span>grid</span>
                  <input className={p.hue} type="range" min={0} max={359} value={look.cross} onChange={(e) => turn({ cross: Number(e.target.value) })} />
                </label>
                <label>
                  <span>all of it</span>
                  <input className={p.hue} type="range" min={0} max={359} value={look.hue} onChange={(e) => turn({ hue: Number(e.target.value) })} />
                </label>
                <button type="button" className={p.reset} onClick={() => { setLook(LOOK); sbSet(A, "look", LOOK); tick(); }}>
                  Defaults
                </button>
              </div>
            )}
          </div>
        </Win95Window>
      )}
      {!wins.slowed.closed && (
        <Win95Window
          title="slowed_reverb.dll"
          state={wins.slowed}
          tilt={0}
          onMove={(x, y) => setWins((w) => ({ ...w, slowed: { ...w.slowed, x, y } }))}
          onFocus={() => focus("slowed")}
          onClose={() => setWins((w) => ({ ...w, slowed: { ...w.slowed, closed: true } }))}
        >
          <div className={p.slowed}>
            <p>
              S L O W E D &nbsp;+&nbsp; R E V E R B <b>{slowPct}%</b>
            </p>
            <input type="range" min={0.7} max={1} step={0.005} value={1.7 - slow} onChange={(e) => setSlowed(1.7 - Number(e.target.value))} />
            <div className={p.scale}>
              <span>as recorded</span>
              <span>a e s t h e t i c</span>
            </div>
            <p className={p.stat}>
              pitch ×{slow.toFixed(2)} · {bpm} BPM · reverb {Math.round((1 - slow) * 160 + 25)}%
            </p>
            <p className={p.keys}>keys A W S E D F T G… · space starts the 808 · hold a Cmaj7</p>
          </div>
        </Win95Window>
      )}

      {secret && <div className={p.secret}>リサフランク420 / 現代のコンピュー</div>}
      {look.lines && <div className={p.vhs} />}
    </div>
  );
}
