"use client";

import { useEffect, useRef, useState } from "react";
import { boot, select, snap, wheelTick } from "./sound";
import styles from "./styles.module.css";

/**
 * Three devices whose screens genuinely work.
 *
 * They are drawn rather than photographed, and that is the point: the harvested
 * grabs are *objects*, and an object photographed on a table cannot have a working
 * click wheel. The photographs are the clutter around these; these are the ones you
 * can switch on.
 */

const TRACKS = [
  "01 · Ocean Drive",
  "02 · Silver Hz",
  "03 · Untitled (final)",
  "04 · Chrome Sky",
  "05 · 128kbps",
  "06 · Track 06",
  "07 · Hidden",
];

/* ------------------------------------------------------------------ iPod */

export function Pod({ on, onToggle }: { on: boolean; onToggle: (v: boolean) => void }) {
  const [sel, setSel] = useState(0);
  const [playing, setPlaying] = useState(false);
  const wheelRef = useRef<HTMLDivElement>(null);
  const lastAngle = useRef<number | null>(null);
  const accum = useRef(0);

  const spin = (e: React.PointerEvent) => {
    if (e.buttons !== 1 || !on) return;
    const r = wheelRef.current?.getBoundingClientRect();
    if (!r) return;
    const a = Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2));
    if (lastAngle.current !== null) {
      let d = a - lastAngle.current;
      if (d > Math.PI) d -= Math.PI * 2;
      if (d < -Math.PI) d += Math.PI * 2;
      accum.current += d;
      // One notch per ~26 degrees, which is roughly what the real wheel did.
      while (Math.abs(accum.current) > 0.46) {
        const dir = Math.sign(accum.current);
        accum.current -= dir * 0.46;
        setSel((s) => Math.max(0, Math.min(TRACKS.length - 1, s + dir)));
        wheelTick();
      }
    }
    lastAngle.current = a;
  };

  return (
    <div className={styles.shell} style={{ width: 212, height: 344, padding: 14 }}>
      <div
        className={`${styles.screen} ${on ? styles.screenOn : ""}`}
        style={{ left: 14, top: 14, width: 184, height: 138 }}
      >
        {on && (
          <>
            <div className={styles.lcdHead}>
              {playing ? "▶ Now playing" : "Music"} · {sel + 1}/{TRACKS.length}
            </div>
            {TRACKS.slice(Math.max(0, sel - 2), Math.max(0, sel - 2) + 5).map((t, i) => {
              const idx = Math.max(0, sel - 2) + i;
              return (
                <div
                  key={t}
                  className={`${styles.lcdRow} ${idx === sel ? styles.lcdSel : ""}`}
                >
                  {t}
                </div>
              );
            })}
          </>
        )}
      </div>

      <div
        ref={wheelRef}
        className={styles.wheel}
        style={{ left: 36, top: 168, width: 140, height: 140 }}
        onPointerDown={(e) => {
          lastAngle.current = null;
          e.currentTarget.setPointerCapture(e.pointerId);
          if (!on) {
            onToggle(true);
            select();
          }
        }}
        onPointerMove={spin}
        onPointerUp={(e) => {
          lastAngle.current = null;
          e.currentTarget.releasePointerCapture?.(e.pointerId);
        }}
        onClick={() => {
          if (!on) return;
          setPlaying((p) => !p);
          select();
        }}
      />
      <span className={styles.wheelMark} style={{ left: 88, top: 176 }}>
        MENU
      </span>
      <span className={styles.label} style={{ left: 16, bottom: 8 }}>
        5GB · dead battery
      </span>
    </div>
  );
}

/* ------------------------------------------------------------- flip phone */

export function Flip({ on, onToggle }: { on: boolean; onToggle: (v: boolean) => void }) {
  return (
    <div style={{ perspective: 900 }}>
      <div
        className={`${styles.shell} ${styles.hinged} ${on ? "" : styles.flipShut}`}
        style={{ width: 168, height: 176, padding: 12 }}
      >
        <div
          className={`${styles.screen} ${on ? styles.screenOn : ""}`}
          style={{ left: 12, top: 12, width: 144, height: 118 }}
        >
          {on && (
            <>
              <div className={styles.lcdHead}>▮▮▮▯ · 14:07</div>
              <div className={styles.lcdRow}>1 New Message</div>
              <div className={styles.lcdRow} style={{ opacity: 0.7 }}>
                From: MUM
              </div>
              <div className={styles.lcdRow} style={{ opacity: 0.7 }}>
                where r u
              </div>
              <div className={styles.lcdRow} style={{ marginTop: 6, fontSize: 9 }}>
                Menu · Names
              </div>
            </>
          )}
        </div>
      </div>

      <button
        type="button"
        className={`${styles.shell} ${styles.shellDark}`}
        aria-label={on ? "Close the phone" : "Open the phone"}
        style={{ width: 168, height: 168, marginTop: 3, padding: 12 }}
        onClick={() => {
          onToggle(!on);
          snap(!on);
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 5,
            marginTop: 22,
          }}
        >
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((k) => (
            <span
              key={k}
              style={{
                height: 22,
                borderRadius: 3,
                background: "linear-gradient(180deg,#cfd6e0,#8f97a4)",
                boxShadow: "inset 0 1px 0 #fff, 0 1px 0 rgba(0,0,0,.5)",
                fontSize: 10,
                color: "#2a303a",
                display: "grid",
                placeItems: "center",
              }}
            >
              {k}
            </span>
          ))}
        </div>
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------- Game Boy */

export function Handheld({ on, onToggle }: { on: boolean; onToggle: (v: boolean) => void }) {
  const [booting, setBooting] = useState(false);

  useEffect(() => {
    if (!on) return;
    setBooting(true);
    boot();
    const id = window.setTimeout(() => setBooting(false), 2400);
    return () => window.clearTimeout(id);
  }, [on]);

  return (
    <div
      className={`${styles.shell} ${styles.shellDark}`}
      style={{ width: 240, height: 392, padding: 16 }}
    >
      <div
        className={`${styles.screen} ${on ? styles.screenOn : ""}`}
        style={{ left: 30, top: 30, width: 180, height: 162 }}
      >
        {on && booting && (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              textAlign: "center",
              fontSize: 15,
              letterSpacing: "0.2em",
              color: "#9ff5c2",
              animation: "none",
              top: 62,
            }}
          >
            SILVER
          </div>
        )}
        {on && !booting && (
          <>
            <div className={styles.lcdHead}>Slot 1 · no save</div>
            <div className={styles.lcdRow}>▶ NEW GAME</div>
            <div className={styles.lcdRow} style={{ opacity: 0.55 }}>
              CONTINUE
            </div>
            <div className={styles.lcdRow} style={{ opacity: 0.55 }}>
              OPTIONS
            </div>
            <div
              className={styles.lcdRow}
              style={{ marginTop: 22, fontSize: 9, opacity: 0.6 }}
            >
              © 2003 SILVER TECH
            </div>
          </>
        )}
      </div>

      <span className={styles.gbPad} style={{ left: 44, top: 236, width: 24, height: 72 }} />
      <span className={styles.gbPad} style={{ left: 20, top: 260, width: 72, height: 24 }} />
      <span className={styles.gbBtn} style={{ right: 30, top: 250 }} />
      <span className={styles.gbBtn} style={{ right: 68, top: 272 }} />

      <button
        type="button"
        className={styles.power}
        aria-label={on ? "Power off" : "Power on"}
        style={{ left: 30, top: 340 }}
        onClick={() => onToggle(!on)}
      >
        <span
          className={styles.powerKnob}
          style={{ left: 2, transform: on ? "translateX(22px)" : "none" }}
        />
      </button>
      <span className={styles.label} style={{ left: 82, top: 342 }}>
        {on ? "on" : "off"}
      </span>
    </div>
  );
}
