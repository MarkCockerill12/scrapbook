"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { chime, tick, tone } from "@/lib/audio";
import styles from "./styles.module.css";

/**
 * Channel 07 — Neon.
 *
 * Fiction: SPECTRUM, a character configurator for an avatar made entirely of light.
 *
 * The demo argument: neon is a LIGHT SOURCE, not a colour. Every surface on the page
 * reads its hue from one CSS custom property, so dragging the wheel relights the whole
 * scene — background, panels, floor, figure and tubes together. If the light didn't
 * land on things, the brain would read the tubes as printed shapes.
 *
 * No assets. Every glow is layered box-shadow; the figure is inline SVG.
 */

const TUBES = [
  { x: 96, y: 210, w: 8, h: 300, dh: 0 },
  { x: 1494, y: 180, w: 8, h: 340, dh: 40 },
  { x: 560, y: 92, w: 360, h: 8, dh: 20 },
  { x: 940, y: 96, w: 360, h: 8, dh: 300 },
  { x: 210, y: 760, w: 260, h: 6, dh: 60 },
  { x: 1130, y: 786, w: 300, h: 6, dh: 320 },
];

const PRESETS = [312, 190, 96, 42, 268, 0];

export default function Neon() {
  const [hue, setHue] = useState(312);
  const [tubes, setTubes] = useState<boolean[]>(() => TUBES.map(() => true));
  const [striking, setStriking] = useState<number | null>(null);
  const [intensity, setIntensity] = useState(0.72);
  const [cycling, setCycling] = useState(false);
  const [burnout, setBurnout] = useState(false);

  const wheelRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const lastTick = useRef(0);

  // RGB cycle: runs the hue continuously until switched off.
  useEffect(() => {
    if (!cycling) return;
    let raf = 0;
    const step = () => {
      setHue((h) => (h + 0.9) % 360);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [cycling]);

  /** Angle from wheel centre -> hue. */
  const applyWheel = useCallback((clientX: number, clientY: number) => {
    const rect = wheelRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const deg = (Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI + 90;
    const next = Math.round((deg + 360) % 360);
    setHue(next);

    const step = Math.round(next / 24);
    if (step !== lastTick.current) {
      lastTick.current = step;
      tick();
    }
  }, []);

  const toggleTube = (i: number) => {
    setTubes((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
    // Cold tubes stutter before they strike; switching one off is instant.
    if (!tubes[i]) {
      setStriking(i);
      window.setTimeout(() => setStriking(null), 640);
      tone({ freq: 120, toFreq: 60, duration: 0.18, type: "sawtooth", gain: 0.05 });
    } else {
      tone({ freq: 300, toFreq: 80, duration: 0.1, type: "square", gain: 0.04 });
    }
  };

  const allOn = tubes.every(Boolean);

  // Easter egg: every tube on AND intensity maxed blows the whole rig.
  useEffect(() => {
    if (allOn && intensity > 0.985 && !burnout) {
      setBurnout(true);
      tone({ freq: 2400, toFreq: 60, duration: 1.1, type: "sawtooth", gain: 0.16 });
      window.setTimeout(() => {
        setBurnout(false);
        setTubes(TUBES.map(() => false));
        setIntensity(0.4);
      }, 2600);
    }
  }, [allOn, intensity, burnout]);

  const knobAngle = ((hue - 90) * Math.PI) / 180;
  const knobR = 72;

  return (
    <div
      className={styles.root}
      style={
        {
          "--hue": hue,
          filter: `saturate(${0.6 + intensity * 0.9}) brightness(${0.62 + intensity * 0.6})`,
        } as React.CSSProperties
      }
    >
      <div className={styles.floor} />

      {/* tubes */}
      {TUBES.map((t, i) => (
        <button
          key={i}
          type="button"
          aria-label={`Tube ${i + 1}`}
          aria-pressed={tubes[i]}
          onClick={() => toggleTube(i)}
          className={`${styles.tube} ${tubes[i] ? "" : styles.tubeOff} ${
            striking === i ? styles.striking : ""
          }`}
          style={
            {
              left: t.x,
              top: t.y,
              width: t.w,
              height: t.h,
              "--tube-h": `calc(var(--hue) + ${t.dh})`,
              cursor: "pointer",
            } as React.CSSProperties
          }
        />
      ))}

      {/* the figure */}
      <div className={styles.figureGlow} style={{ left: "50%", top: 400 }} />
      <div className={styles.figure}>
        <svg viewBox="0 0 300 560" width="300" height="560" fill="none">
          <defs>
            {/*
              userSpaceOnUse is load-bearing. With the default objectBoundingBox, a
              perfectly vertical or horizontal stroke has a zero-width or zero-height
              bounding box, the gradient degenerates, and the stroke renders as
              NOTHING — which silently deleted the figure's torso and both accent
              lines while every diagonal drew fine.
            */}
            <linearGradient id="nfig" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="560">
              <stop offset="0%" stopColor={`hsl(${hue} 100% 74%)`} />
              <stop offset="100%" stopColor={`hsl(${(hue + 48) % 360} 100% 56%)`} />
            </linearGradient>
          </defs>
          <g
            stroke="url(#nfig)"
            strokeWidth="7"
            strokeLinecap="round"
            style={{
              filter: `drop-shadow(0 0 8px hsl(${hue} 100% 62%)) drop-shadow(0 0 28px hsl(${hue} 100% 56% / .8))`,
            }}
          >
            <circle cx="150" cy="66" r="42" />
            <path d="M150 108 L150 300" />
            <path d="M150 140 L74 214" />
            <path d="M150 140 L226 214" />
            <path d="M150 300 L100 440 L92 520" />
            <path d="M150 300 L200 440 L208 520" />
            <path d="M112 176 L188 176" opacity=".55" />
            <path d="M104 236 L196 236" opacity=".35" />
          </g>
        </svg>
      </div>

      {/* wordmark */}
      <div className={styles.wordmark}>
        <div className={styles.wordmarkTitle}>SPECTRUM</div>
        <div className={styles.wordmarkSub}>customise your look · rig 07</div>
      </div>

      {/* hue panel */}
      <aside className={styles.panel} style={{ left: 72, top: 236, width: 262 }}>
        <div className={styles.panelTitle}>Hue</div>
        <div
          ref={wheelRef}
          className={styles.wheel}
          role="slider"
          aria-label="Hue"
          aria-valuemin={0}
          aria-valuemax={359}
          aria-valuenow={Math.round(hue)}
          tabIndex={0}
          onPointerDown={(e: ReactPointerEvent<HTMLDivElement>) => {
            dragging.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            applyWheel(e.clientX, e.clientY);
          }}
          onPointerMove={(e: ReactPointerEvent<HTMLDivElement>) => {
            if (dragging.current) applyWheel(e.clientX, e.clientY);
          }}
          onPointerUp={(e: ReactPointerEvent<HTMLDivElement>) => {
            dragging.current = false;
            e.currentTarget.releasePointerCapture?.(e.pointerId);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
              e.stopPropagation();
              setHue((h) => (h + (e.key === "ArrowRight" ? 8 : -8) + 360) % 360);
              tick();
            }
          }}
        >
          <span
            className={styles.wheelKnob}
            style={{
              left: `calc(50% + ${Math.cos(knobAngle) * knobR}px)`,
              top: `calc(50% + ${Math.sin(knobAngle) * knobR}px)`,
            }}
          />
          <span className={styles.wheelValue}>{Math.round(hue)}°</span>
        </div>

        <div className={styles.swatches} style={{ marginTop: 18 }}>
          {PRESETS.map((h) => (
            <button
              key={h}
              type="button"
              aria-label={`Preset hue ${h}`}
              className={styles.swatch}
              style={{
                background: `linear-gradient(160deg, hsl(${h} 100% 64%), hsl(${(h + 48) % 360} 100% 44%))`,
                boxShadow: `0 0 14px hsl(${h} 100% 58% / .7)`,
              }}
              onClick={() => {
                setHue(h);
                chime(true);
              }}
            />
          ))}
        </div>

        <button
          type="button"
          className={`${styles.cycle} ${cycling ? styles.cycleOn : ""}`}
          onClick={() => {
            setCycling((c) => !c);
            chime(!cycling);
          }}
        >
          {cycling ? "Stop cycle" : "RGB cycle"}
        </button>
      </aside>

      {/* rig panel */}
      <aside className={styles.panel} style={{ right: 72, top: 236, width: 290 }}>
        <div className={styles.panelTitle}>Rig</div>

        <div className={styles.row}>
          <div>
            <div className={styles.rowLabel}>Intensity</div>
            <div className={styles.rowHint}>
              {intensity > 0.94 ? "⚠ above rated load" : "drives the whole scene"}
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(intensity * 100)}
            aria-label="Intensity"
            onChange={(e) => {
              setIntensity(Number(e.target.value) / 100);
              tick();
            }}
            onKeyDown={(e) => e.stopPropagation()}
            style={{ width: 118, accentColor: `hsl(${hue} 100% 60%)` }}
          />
        </div>

        <div className={styles.panelTitle} style={{ marginTop: 16, marginBottom: 8 }}>
          Tubes — click any tube to switch it
        </div>
        {TUBES.map((t, i) => (
          <div key={i} className={styles.row} style={{ padding: "5px 0" }}>
            <div className={styles.rowLabel} style={{ fontSize: 12 }}>
              Tube {String(i + 1).padStart(2, "0")}
              <span className={styles.rowHint} style={{ display: "inline", marginLeft: 8 }}>
                +{t.dh}°
              </span>
            </div>
            <button
              type="button"
              onClick={() => toggleTube(i)}
              aria-pressed={tubes[i]}
              style={{
                width: 46,
                height: 20,
                borderRadius: 999,
                background: tubes[i]
                  ? `hsl(${(hue + t.dh) % 360} 100% 56%)`
                  : `hsl(${hue} 20% 22%)`,
                boxShadow: tubes[i] ? `0 0 14px hsl(${(hue + t.dh) % 360} 100% 56%)` : "none",
                transition: "background 200ms, box-shadow 200ms",
              }}
            />
          </div>
        ))}
      </aside>

      <div className={styles.hint}>
        drag the wheel · click the tubes
        <br />
        all tubes on + intensity 100 = don&apos;t
      </div>

      {burnout && (
        <div className={styles.burnout}>
          <div className={styles.burnoutText}>rig burned out · resetting</div>
        </div>
      )}
    </div>
  );
}
