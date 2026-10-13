"use client";

import { useMusic } from "@/lib/music";
import { construct } from "./music";
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useCanvas } from "@/components/CanvasStage";
import { Draggable } from "@/primitives/Draggable";
import { tone } from "@/lib/audio";
import { AESTHETICS } from "@/lib/registry";
import { useShell } from "@/lib/store";
import { DigitalRain } from "./DigitalRain";
import { Terminal } from "./Terminal";
import { BlackCat, Crack, Monitors, Phone, Pills, Programs, WakeUp } from "./Modules";
import { WireGlobe } from "./WireGlobe";
import styles from "./styles.module.css";

/**
 * Channel 08 — Matrix.
 *
 * Fiction: an unauthorised session. You are inside something, it noticed, and it has
 * started tracing you.
 *
 * The channel's whole premise is that you *type* to get around, so the terminal is a
 * real shell over a real (small) filesystem rather than three magic words. The trace
 * bar is the page's clock: it fills while you sit still and resets when you do
 * anything, which quietly pushes you to keep poking at it.
 *
 * Single viewport. The terminal scrolls internally — that's a widget, not the page.
 */

const W = 1600;
const H = 900;

/** Seconds of complete inactivity before the trace completes. */
const TRACE_SECONDS = 45;

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&@!?<>/\\";

/**
 * Scrambles text until hovered, then resolves it character by character.
 *
 * The initial scramble MUST be deterministic. Seeding it with Math.random() meant the
 * server and the client produced different ciphertext and React threw a hydration
 * mismatch on every node in the list. The flicker is started from an effect instead,
 * which only runs after hydration has already agreed on the markup.
 */
function scramble(s: string, seed: number): string {
  return s.replace(/\S/g, (_, i: number) => CHARS[(i * 7 + seed * 13 + s.length * 3) % CHARS.length]);
}

function Decrypt({ text }: { text: string }) {
  const [shown, setShown] = useState(() => scramble(text, 0));
  const raf = useRef(0);
  const revealed = useRef(false);

  // Idle flicker, client-side only.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (revealed.current) return;
      setShown(scramble(text, Math.floor(Math.random() * 997)));
    }, 110);
    return () => {
      window.clearInterval(id);
      cancelAnimationFrame(raf.current);
    };
  }, [text]);

  const resolveText = () => {
    if (revealed.current) return;
    revealed.current = true;
    let i = 0;
    const step = () => {
      i += 0.5;
      const n = Math.floor(i);
      setShown(text.slice(0, n) + scramble(text.slice(n), n));
      if (n < text.length) raf.current = requestAnimationFrame(step);
      else setShown(text);
    };
    step();
  };

  return (
    <span className={styles.decrypt} onPointerEnter={resolveText}>
      {shown}
    </span>
  );
}

export default function Matrix() {
  useMusic(construct, 96);
  const { toCanvasSpace } = useCanvas();
  const begin = useShell((s) => s.beginTransition);

  const pointer = useRef({ x: -999, y: -999 });
  const [trace, setTrace] = useState(0);
  const [destroyed, setDestroyed] = useState(false);
  const idleSince = useRef(Date.now());

  const bump = useCallback(() => {
    idleSince.current = Date.now();
  }, []);

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const p = toCanvasSpace(e.clientX, e.clientY);
      pointer.current = p;
      bump();
    },
    [toCanvasSpace, bump],
  );

  // The trace. Ticks on a plain interval rather than rAF — it's a once-a-second
  // readout, and rAF would wake the main thread 60x more often for no visible gain
  // on a page already running two canvases.
  useEffect(() => {
    if (destroyed) return;
    const id = window.setInterval(() => {
      const idle = (Date.now() - idleSince.current) / 1000;
      setTrace(Math.min(idle / TRACE_SECONDS, 1));
    }, 500);
    return () => window.clearInterval(id);
  }, [destroyed]);

  const complete = trace >= 1;
  useEffect(() => {
    if (!complete) return;
    tone({ freq: 180, toFreq: 90, duration: 0.7, type: "sawtooth", gain: 0.14 });
  }, [complete]);

  useEffect(() => {
    const onKey = () => bump();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bump]);

  const selfDestruct = useCallback(() => {
    setDestroyed(true);
    tone({ freq: 90, toFreq: 40, duration: 1.4, type: "sawtooth", gain: 0.18 });
    // It restores itself. Wiping the page permanently would just be a dead end, and
    // the joke only lands if you can do it again.
    window.setTimeout(() => setDestroyed(false), 4200);
  }, []);

  const [pill, setPill] = useState<"red" | "blue" | null>(null);
  const [waking, setWaking] = useState(false);
  const [dejavu, setDejavu] = useState(0);
  const choose = (p: "red" | "blue") => {
    setPill(p);
    bump();
    if (p === "red") setWaking(true);
    else tone({ freq: 440, toFreq: 220, duration: 1.2, type: "sine", gain: 0.08 });
  };
  const endWake = useCallback(() => setWaking(false), []);
  const onDejaVu = useCallback(() => {
    setDejavu((d) => d + 1);
    tone({ freq: 60, toFreq: 40, duration: 0.8, type: "sawtooth", gain: 0.1 });
  }, []);
  const exitCall = () => {
    const live = AESTHETICS.filter((a) => a.status === "live" && a.slug !== "matrix");
    begin(live[Math.floor(Math.random() * live.length)].slug);
  };

  const panel = (key: string, x: number, y: number, w: number, h: number, title: string, right: string, body: React.ReactNode, bodyStyle?: React.CSSProperties) => (
    <Draggable x={x} y={y} bounds={{ left: 0, top: 70, right: W - w, bottom: H - h }} persistAs={{ aesthetic: "matrix", key: `v2:${key}` }}>
      <section className={styles.panel} style={{ width: w, height: h }}>
        <div className={styles.panelBar}>
          <span>
            <b>{title}</b>
          </span>
          <span className={styles.panelNote}>{right}</span>
        </div>
        <div className={styles.panelBody} style={bodyStyle}>
          {body}
        </div>
      </section>
    </Draggable>
  );

  return (
    <div className={`${styles.root} ${pill === "blue" ? styles.bluePill : ""} ${dejavu ? styles.dejavu : ""}`} key={`dv${dejavu}`} onPointerMove={onPointerMove} onPointerDown={bump}>
      <DigitalRain width={W} height={H} pointerRef={pointer} />
      <div className={styles.rainDim} />

      {/* ---- trace, now up top where you can see it ---- */}
      <div className={`${styles.trace} ${trace > 0.66 ? styles.traceHot : ""}`}>
        <div className={styles.traceHead}>
          <span>{complete ? "!! trace complete — agents dispatched !!" : "trace program running"}</span>
          <span>{Math.round(trace * 100)}%</span>
        </div>
        <div className={styles.traceTrack}>
          <div className={styles.traceFill} style={{ width: `${trace * 100}%` }} />
        </div>
      </div>

      <div className={destroyed ? styles.collapsing : undefined}>
        {panel("term", 28, 88, 600, 470, "tty0 — /bin/sh", "shell", <Terminal onSelfDestruct={selfDestruct} />)}
        {panel("progs", 28, 574, 600, 250, "construct — training programs", "click to load", <Programs />)}
        {panel("mon", 646, 88, 430, 205, "operator — raw feed", "3 screens", <Monitors />)}
        {panel("pill", 646, 308, 430, 290, "morpheus — the choice", pill ?? "undecided", <Pills chosen={pill} onChoose={choose} />)}
        {panel("crack", 646, 612, 430, 170, "zion — mainframe", "brute force", <Crack />)}
        {panel("geo", 1094, 88, 478, 300, "geo — origin unknown", "live", <WireGlobe size={240} />, { display: "grid", placeItems: "center" })}
        {panel(
          "nodes",
          1094,
          402,
          478,
          240,
          `nodes — ${AESTHETICS.length} found`,
          "hover to decrypt",
          <>
            {AESTHETICS.map((a) => (
              <button key={a.slug} type="button" className={styles.target} onClick={() => begin(a.slug)}>
                <span className={styles.targetId}>{String(a.channel).padStart(2, "0")}</span>
                <span className={styles.targetName}>{pill === "red" ? a.name : <Decrypt text={a.slug} />}</span>
                <span className={`${styles.targetState} ${a.status === "live" ? styles.targetLive : ""}`}>
                  {a.status === "live" ? "ONLINE" : "OFFLINE"}
                </span>
              </button>
            ))}
          </>,
          { overflowY: "auto" },
        )}
        {panel("phone", 1094, 656, 240, 170, "hardline", "exit", <Phone onExit={exitCall} />, { padding: 0 })}
      </div>

      <div className={styles.hint}>
        type `help` in the shell · drag any panel · take a pill
        <br />
        answer the phone to leave · `connect &lt;name&gt;` changes channel
      </div>

      <BlackCat onDejaVu={onDejaVu} />
      {dejavu > 0 && <div className={styles.dejavuText} key={dejavu}>déjà vu — they changed something</div>}

      {destroyed && (
        <div className={styles.wipe}>
          <div>
            <div className={styles.wipeText}>rm: removing everything</div>
            <div style={{ marginTop: 14, fontSize: 11, letterSpacing: ".2em", color: "#12b23a" }}>you were warned</div>
          </div>
        </div>
      )}
      {waking && <WakeUp onDone={endWake} />}

      <div className={styles.scanlines} />
      <div className={styles.vignette} />
    </div>
  );
}
