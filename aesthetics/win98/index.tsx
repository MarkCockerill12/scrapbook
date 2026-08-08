"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useCanvas } from "@/components/CanvasStage";
import { tone } from "@/lib/audio";
import { AESTHETICS } from "@/lib/registry";
import { useShell } from "@/lib/store";
import styles from "./styles.module.css";

/**
 * Channel 18 — Windows 98.
 *
 * Fiction: SYNERGYCORP INTRANET v2.1. Nobody has updated it since 1999 and the
 * assistant has opinions.
 *
 * Drawn, not screenshotted. This interface is pure geometry — four colours and a bevel
 * rule — so CSS reproduces it exactly AND it stays interactive, which a pasted
 * screenshot could never be. That's the whole argument for rebuilding rather than
 * compositing on the UI-heavy channels.
 *
 * The window manager is real: drag, focus, z-order, minimise, maximise, close, taskbar
 * buttons. Building it properly is what makes the joke land — the error cascade is only
 * funny if the windows genuinely behave.
 *
 * No assets.
 */

const W = 1600;
const H = 900;

let seq = 0;

interface Win {
  id: number;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  kind: "portal" | "readme" | "error" | "channels" | "solitaire";
  minimised: boolean;
  maximised: boolean;
  payload?: string;
}

const ERRORS = [
  "An unexpected error has occurred.",
  "This program has performed an illegal operation.",
  "Cannot find SYNERGY.DLL. Reinstall the application.",
  "The instruction at 0x00401A2F referenced memory at 0x00000000.",
  "Your changes could not be saved. They were not important.",
  "A required resource is in use by another required resource.",
];

const CLIPPY_LINES = [
  "It looks like you're browsing an intranet. Would you like help?",
  "I noticed you closed a window. Was that intentional?",
  "Did you know SYNERGYCORP has been 'transitioning to a new platform' since 1997?",
  "You seem to be having a hard time. So am I.",
  "Would you like me to open more windows? I can open more windows.",
  "I have been running since 1998. Nobody has ever clicked Yes.",
  "There is no dismiss button. There is a way out. It is not a button.",
];

export default function Win98() {
  const { toCanvasSpace } = useCanvas();
  const begin = useShell((s) => s.beginTransition);

  const [wins, setWins] = useState<Win[]>([]);
  const [top, setTop] = useState(10);
  const [focus, setFocus] = useState<number | null>(null);
  const [startOpen, setStartOpen] = useState(false);
  const [clipLine, setClipLine] = useState(0);
  const [clipGone, setClipGone] = useState(false);
  const [clock, setClock] = useState("--:--");

  const drag = useRef<{ id: number; dx: number; dy: number } | null>(null);
  // React StrictMode runs mount effects twice in dev, which opened the portal twice
  // and left two identical taskbar buttons.
  const booted = useRef(false);

  const open = useCallback(
    (kind: Win["kind"], title: string, box: Partial<Win> = {}) => {
      seq += 1;
      const id = seq;
      setTop((z) => z + 1);
      setWins((prev) => [
        ...prev,
        {
          id,
          title,
          kind,
          x: box.x ?? 180 + ((prev.length * 26) % 260),
          y: box.y ?? 90 + ((prev.length * 24) % 200),
          w: box.w ?? 520,
          h: box.h ?? 340,
          z: top + 1,
          minimised: false,
          maximised: false,
          payload: box.payload,
        },
      ]);
      setFocus(id);
      tone({ freq: 660, toFreq: 880, duration: 0.08, gain: 0.05 });
      return id;
    },
    [top],
  );

  // Boot state: the portal, and the assistant that will not leave.
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    open("portal", "SYNERGYCORP Intranet — Home", { x: 300, y: 84, w: 700, h: 430 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setClock(`${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")} ${d.getHours() < 12 ? "AM" : "PM"}`);
    };
    tick();
    const id = window.setInterval(tick, 20_000);
    return () => window.clearInterval(id);
  }, []);

  // Clippy cycles through its lines on its own schedule.
  useEffect(() => {
    if (clipGone) return;
    const id = window.setInterval(() => {
      setClipLine((n) => (n + 1) % CLIPPY_LINES.length);
      tone({ freq: 1200, duration: 0.03, type: "square", gain: 0.03 });
    }, 9000);
    return () => window.clearInterval(id);
  }, [clipGone]);

  const raise = (id: number) => {
    setTop((z) => z + 1);
    setWins((prev) => prev.map((w) => (w.id === id ? { ...w, z: top + 1, minimised: false } : w)));
    setFocus(id);
  };

  /**
   * Closing an error spawns two more. The count is capped — the joke is the cascade,
   * and an uncapped one would lock the page up rather than being funny.
   */
  const close = (id: number) => {
    const w = wins.find((x) => x.id === id);
    setWins((prev) => prev.filter((x) => x.id !== id));
    tone({ freq: 400, toFreq: 200, duration: 0.1, type: "square", gain: 0.05 });

    if (w?.kind === "error") {
      const errorCount = wins.filter((x) => x.kind === "error").length;
      if (errorCount < 7) {
        window.setTimeout(() => {
          for (let i = 0; i < 2; i++) {
            open("error", "Error", {
              x: 260 + Math.random() * 640,
              y: 140 + Math.random() * 320,
              w: 400,
              h: 168,
              payload: ERRORS[Math.floor(Math.random() * ERRORS.length)],
            });
          }
        }, 130);
      }
    }
  };

  const onDragStart = (e: React.PointerEvent, w: Win) => {
    if (w.maximised) return;
    const p = toCanvasSpace(e.clientX, e.clientY);
    drag.current = { id: w.id, dx: p.x - w.x, dy: p.y - w.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    raise(w.id);
  };

  const onDragMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const p = toCanvasSpace(e.clientX, e.clientY);
    const { id, dx, dy } = drag.current;
    setWins((prev) =>
      prev.map((w) =>
        w.id === id
          ? {
              ...w,
              x: Math.min(Math.max(p.x - dx, -w.w + 90), W - 90),
              y: Math.min(Math.max(p.y - dy, 0), H - 70),
            }
          : w,
      ),
    );
  };

  const body = (w: Win): ReactNode => {
    if (w.kind === "error") {
      return (
        <div className={styles.dialogRow}>
          <span className={styles.dialogIcon}>⛔</span>
          <div style={{ flex: 1 }}>
            <p style={{ marginBottom: 18 }}>{w.payload}</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button type="button" className={styles.dialogBtn} onClick={() => close(w.id)}>
                OK
              </button>
              <button type="button" className={styles.dialogBtn} onClick={() => close(w.id)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (w.kind === "channels") {
      return (
        <div className={styles.windowBodyInset} style={{ height: "100%", padding: 6, overflow: "auto" }}>
          {AESTHETICS.map((a) => (
            <button
              key={a.slug}
              type="button"
              onClick={() => begin(a.slug)}
              style={{
                display: "flex",
                width: "100%",
                gap: 10,
                padding: "3px 6px",
                background: "none",
                border: 0,
                textAlign: "left",
                fontSize: 13,
              }}
            >
              <span>📁</span>
              <span style={{ flex: 1 }}>{a.slug}</span>
              <span style={{ color: "#666" }}>{a.status === "live" ? "Online" : "Offline"}</span>
            </button>
          ))}
        </div>
      );
    }

    if (w.kind === "readme") {
      return (
        <div className={styles.windowBodyInset} style={{ height: "100%", padding: 10, fontFamily: "'Courier New', monospace", fontSize: 13, overflow: "auto" }}>
          {`SYNERGYCORP INTRANET
====================

v2.1  (build 1999.04.12)

CHANGELOG
  1999-04-12  Added WordArt to the homepage banner.
  1999-03-02  Removed WordArt from the homepage banner.
  1999-02-18  Added WordArt to the homepage banner.
  1998-11-30  IT requests that staff stop emailing the whole company.
  1998-11-29  Staff email the whole company about the whole-company emails.
  1998-06-01  Intranet goes live. Migration to the new platform begins.

The migration is ongoing.`}
        </div>
      );
    }

    if (w.kind === "solitaire") {
      return (
        <div style={{ height: "100%", background: "#008000", padding: 12, display: "flex", flexWrap: "wrap", gap: 8, alignContent: "flex-start" }}>
          {Array.from({ length: 14 }).map((_, i) => (
            <div
              key={i}
              className={styles.raised}
              style={{ width: 46, height: 64, display: "grid", placeItems: "center", fontSize: 15, color: i % 3 === 0 ? "#c00" : "#000" }}
            >
              {["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"][i]}
              {["♠", "♥", "♦", "♣"][i % 4]}
            </div>
          ))}
          <p style={{ width: "100%", color: "#fff", fontSize: 12, marginTop: 10 }}>
            You have been playing for 4 hours. Nobody has noticed.
          </p>
        </div>
      );
    }

    // portal
    return (
      <div style={{ height: "100%", overflow: "auto" }}>
        <div className={styles.wordart}>SYNERGYCORP</div>
        <div className={styles.marqueeRow} style={{ borderTop: "1px solid #808080", borderBottom: "1px solid #808080", padding: "3px 0", margin: "8px 0" }}>
          <span>
            *** REMINDER: timesheets are due Friday *** The 4th floor kitchen is closed
            *** Please do not microwave fish *** Q3 synergy targets have been revised
            upward ***
          </span>
        </div>
        <p style={{ marginBottom: 10 }}>
          <b>Welcome to the SYNERGYCORP employee portal.</b> This site is best viewed in
          Internet Explorer 4.0 or higher at 800&times;600 resolution.
        </p>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <tbody>
            {[
              ["Employee handbook", "Updated 1998"],
              ["Holiday request form", "Print and post"],
              ["IT support", "Have you tried restarting"],
              ["Cafeteria menu", "Unavailable"],
              ["New platform migration", "In progress"],
            ].map(([a, b]) => (
              <tr key={a}>
                <td style={{ border: "1px solid #808080", padding: "3px 7px" }}>
                  <span style={{ color: "#0000ee", textDecoration: "underline" }}>{a}</span>
                </td>
                <td style={{ border: "1px solid #808080", padding: "3px 7px", color: "#555" }}>{b}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ marginTop: 12, fontSize: 12, color: "#444" }}>
          This page has been under construction since 1998.
        </p>
      </div>
    );
  };

  const visible = wins.filter((w) => !w.minimised);

  return (
    <div className={styles.root} onPointerMove={onDragMove} onPointerUp={() => (drag.current = null)}>
      <div className={styles.wallpaper} />

      {/* desktop icons */}
      <div className={styles.icons}>
        {[
          ["🖥️", "My Computer", () => open("readme", "README.TXT", { w: 460, h: 320 })],
          ["📁", "Network", () => open("channels", "Network Neighborhood", { w: 430, h: 380 })],
          ["🗑️", "Recycle Bin", () => open("error", "Error", { w: 400, h: 168, payload: ERRORS[0] })],
          ["🃏", "Solitaire", () => open("solitaire", "Solitaire", { w: 480, h: 360 })],
        ].map(([glyph, label, fn]) => (
          <button
            key={label as string}
            type="button"
            className={styles.icon}
            onDoubleClick={fn as () => void}
            onClick={fn as () => void}
          >
            <span className={styles.iconGlyph}>{glyph as string}</span>
            {label as string}
          </button>
        ))}
      </div>

      {/* windows */}
      {visible.map((w) => (
        <div
          key={w.id}
          className={styles.window}
          style={{
            left: w.maximised ? 0 : w.x,
            top: w.maximised ? 0 : w.y,
            width: w.maximised ? W : w.w,
            height: w.maximised ? H - 34 : w.h,
            zIndex: w.z,
          }}
          onPointerDown={() => raise(w.id)}
        >
          <div
            className={`${styles.titlebar} ${focus === w.id ? "" : styles.titlebarInactive}`}
            onPointerDown={(e) => onDragStart(e, w)}
            onDoubleClick={() =>
              setWins((prev) => prev.map((x) => (x.id === w.id ? { ...x, maximised: !x.maximised } : x)))
            }
          >
            <span className={styles.titleText}>{w.title}</span>
            <button
              type="button"
              className={styles.titleBtn}
              aria-label="Minimise"
              onClick={() => setWins((prev) => prev.map((x) => (x.id === w.id ? { ...x, minimised: true } : x)))}
            >
              _
            </button>
            <button
              type="button"
              className={styles.titleBtn}
              aria-label="Maximise"
              onClick={() => setWins((prev) => prev.map((x) => (x.id === w.id ? { ...x, maximised: !x.maximised } : x)))}
            >
              □
            </button>
            <button
              type="button"
              className={styles.titleBtn}
              aria-label="Close"
              onClick={() => close(w.id)}
            >
              ✕
            </button>
          </div>

          {w.kind !== "error" && (
            <div className={styles.menubar}>
              <span>File</span>
              <span>Edit</span>
              <span>View</span>
              <span>Help</span>
            </div>
          )}

          <div className={styles.windowBody}>{body(w)}</div>
        </div>
      ))}

      {/* the assistant */}
      {!clipGone && (
        <div className={styles.clip} style={{ right: 120, bottom: 90 }}>
          <div className={styles.clipBubble}>
            {CLIPPY_LINES[clipLine]}
            <div className={styles.clipActions}>
              <button
                type="button"
                className={styles.clipMini}
                onClick={() =>
                  open("error", "Error", {
                    w: 400,
                    h: 168,
                    payload: ERRORS[Math.floor(Math.random() * ERRORS.length)],
                  })
                }
              >
                Yes
              </button>
              <button
                type="button"
                className={styles.clipMini}
                onClick={() => setClipLine((n) => (n + 1) % CLIPPY_LINES.length)}
              >
                No
              </button>
              {/*
                The way out. It only appears on the last line, so you have to let the
                assistant finish talking — which is the joke.
              */}
              {clipLine === CLIPPY_LINES.length - 1 && (
                <button
                  type="button"
                  className={styles.clipMini}
                  onClick={() => {
                    setClipGone(true);
                    open("readme", "resignation.txt", {
                      w: 430,
                      h: 220,
                      payload: "gone",
                    });
                    tone({ freq: 520, toFreq: 260, duration: 0.5, gain: 0.07 });
                  }}
                >
                  Stop talking
                </button>
              )}
            </div>
          </div>
          <div className={styles.clipBody}>
            <span style={{ fontSize: 46, lineHeight: 1 }}>📎</span>
          </div>
        </div>
      )}

      <div className={styles.hint}>
        drag the title bars · close an error and see what happens
        <br />
        the assistant can be dismissed. it is not a button at first.
      </div>

      {/* start menu */}
      {startOpen && (
        <div className={styles.startMenu}>
          <div className={styles.startBanner}>Synergy 98</div>
          <div className={styles.startItems}>
            {[
              ["📁", "Programs", () => open("channels", "Network Neighborhood", { w: 430, h: 380 })],
              ["📄", "Documents", () => open("readme", "README.TXT", { w: 460, h: 320 })],
              ["⚙️", "Settings", () => open("error", "Error", { w: 400, h: 168, payload: ERRORS[2] })],
              ["🔍", "Find", () => open("channels", "Find: Channels", { w: 430, h: 380 })],
              ["❓", "Help", () => open("error", "Error", { w: 400, h: 168, payload: ERRORS[5] })],
            ].map(([g, l, fn]) => (
              <button
                key={l as string}
                type="button"
                className={styles.startItem}
                onClick={() => {
                  (fn as () => void)();
                  setStartOpen(false);
                }}
              >
                <span>{g as string}</span>
                {l as string}
              </button>
            ))}
            <div className={styles.startSep} />
            <button
              type="button"
              className={styles.startItem}
              onClick={() => {
                setStartOpen(false);
                open("error", "Shut Down", {
                  w: 400,
                  h: 168,
                  payload: "It is now safe to turn off your computer. It is not.",
                });
              }}
            >
              <span>⏻</span> Shut Down…
            </button>
          </div>
        </div>
      )}

      {/* taskbar */}
      <div className={styles.taskbar}>
        <button
          type="button"
          className={`${styles.start} ${startOpen ? styles.startOpen : ""}`}
          onClick={() => setStartOpen((o) => !o)}
        >
          <span style={{ fontSize: 15 }}>🪟</span> Start
        </button>
        {wins.map((w) => (
          <button
            key={w.id}
            type="button"
            className={`${styles.taskBtn} ${focus === w.id && !w.minimised ? styles.taskBtnActive : ""}`}
            onClick={() =>
              w.minimised || focus !== w.id
                ? raise(w.id)
                : setWins((prev) => prev.map((x) => (x.id === w.id ? { ...x, minimised: true } : x)))
            }
          >
            {w.title}
          </button>
        ))}
        <div className={styles.tray}>
          <span>🔊</span>
          <span>{clock}</span>
        </div>
      </div>
    </div>
  );
}
