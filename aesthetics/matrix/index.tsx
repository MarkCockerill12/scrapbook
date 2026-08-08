"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useCanvas } from "@/components/CanvasStage";
import { Draggable } from "@/primitives/Draggable";
import { tone } from "@/lib/audio";
import { AESTHETICS } from "@/lib/registry";
import { useShell } from "@/lib/store";
import { DigitalRain } from "./DigitalRain";
import { Terminal } from "./Terminal";
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

  return (
    <div className={styles.root} onPointerMove={onPointerMove} onPointerDown={bump}>
      <DigitalRain width={W} height={H} pointerRef={pointer} />

      <header className={styles.header}>
        <div className={styles.headerTitle}>Unauthorised session</div>
        <div className={styles.headerSub}>
          no credentials presented · access granted anyway
        </div>
      </header>

      <div className={destroyed ? styles.collapsing : undefined}>
        {/* ---- terminal ---- */}
        <Draggable
          x={90}
          y={148}
          rotate={-0.4}
          bounds={{ left: 0, top: 60, right: 900, bottom: 420 }}
          persistAs={{ aesthetic: "matrix", key: "term" }}
        >
          <section className={styles.panel} style={{ width: 680, height: 560 }}>
            <div className={styles.panelBar}>
              <span>
                <b>tty0</b> — /bin/sh
              </span>
              <span>● ● ●</span>
            </div>
            <div className={styles.panelBody}>
              <Terminal onSelfDestruct={selfDestruct} />
            </div>
          </section>
        </Draggable>

        {/* ---- globe ---- */}
        <Draggable
          x={1060}
          y={128}
          rotate={0.5}
          bounds={{ left: 700, top: 60, right: 1220, bottom: 500 }}
          persistAs={{ aesthetic: "matrix", key: "globe" }}
        >
          <section className={styles.panel} style={{ width: 452, height: 366 }}>
            <div className={styles.panelBar}>
              <span>
                <b>geo</b> — origin unknown
              </span>
              <span>LIVE</span>
            </div>
            <div className={styles.panelBody} style={{ display: "grid", placeItems: "center" }}>
              <WireGlobe size={286} />
            </div>
          </section>
        </Draggable>

        {/* ---- target list ---- */}
        <Draggable
          x={1060}
          y={522}
          rotate={-0.6}
          bounds={{ left: 700, top: 300, right: 1220, bottom: 720 }}
          persistAs={{ aesthetic: "matrix", key: "targets" }}
        >
          <section className={styles.panel} style={{ width: 452, height: 250 }}>
            <div className={styles.panelBar}>
              <span>
                <b>nodes</b> — {AESTHETICS.length} found
              </span>
              <span>hover to decrypt</span>
            </div>
            <div className={styles.panelBody} style={{ overflowY: "auto" }}>
              {AESTHETICS.slice(0, 9).map((a) => (
                <button
                  key={a.slug}
                  type="button"
                  className={styles.target}
                  onClick={() => begin(a.slug)}
                >
                  <span className={styles.targetId}>
                    {String(a.channel).padStart(2, "0")}
                  </span>
                  <span className={styles.targetName}>
                    <Decrypt text={a.slug} />
                  </span>
                  <span
                    className={`${styles.targetState} ${
                      a.status === "live" ? styles.targetLive : ""
                    }`}
                  >
                    {a.status === "live" ? "ONLINE" : "OFFLINE"}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </Draggable>
      </div>

      {/* ---- trace ---- */}
      <div className={`${styles.trace} ${trace > 0.66 ? styles.traceHot : ""}`}>
        <div className={styles.traceHead}>
          <span>{complete ? "!! trace complete !!" : "trace in progress"}</span>
          <span>{Math.round(trace * 100)}%</span>
        </div>
        <div className={styles.traceTrack}>
          <div className={styles.traceFill} style={{ width: `${trace * 100}%` }} />
        </div>
      </div>

      <div className={styles.hint}>
        type `help` · drag the windows
        <br />
        `connect &lt;name&gt;` to change channel
      </div>

      {destroyed && (
        <div className={styles.wipe}>
          <div>
            <div className={styles.wipeText}>rm: removing everything</div>
            <div style={{ marginTop: 14, fontSize: 11, letterSpacing: ".2em", color: "#12b23a" }}>
              you were warned
            </div>
          </div>
        </div>
      )}

      <div className={styles.scanlines} />
      <div className={styles.vignette} />
    </div>
  );
}
