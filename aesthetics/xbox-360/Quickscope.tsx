"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { blip, killThud } from "./sound";
import styles from "./styles.module.css";

/**
 * SNIPEZ 360 — the quickscope minigame.
 *
 * Two mechanics, and the second one is the whole page's easter egg:
 *
 *   SCOPE — hold the right mouse button. The arena masks down to a scope circle.
 *   Scoped hits are worth less, because that is the entire moral universe of 2010
 *   montage culture.
 *
 *   THE SPIN — the cursor's angle around the arena centre is accumulated over a
 *   rolling 1.6s window. Sweep a full revolution and the meter fills; land an
 *   UNSCOPED hit while it is full and you have done a 360 no-scope, which is the
 *   only way to reach the red ring.
 *
 * Angles are unwrapped per sample (the +/-PI seam otherwise registers as half a
 * revolution every time the cursor crosses the twelve o'clock line, and the meter
 * fills by accident within a second or two of idle movement).
 */

const LIFETIME = 1500;
const SPIN_WINDOW = 1600;
const FULL_SPIN = Math.PI * 2;

interface Target {
  id: number;
  x: number;
  y: number;
  at: number;
}

export function Quickscope({
  onTrickshot,
  onNoScope,
}: {
  onTrickshot: () => void;
  onNoScope: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [target, setTarget] = useState<Target | null>(null);
  const [scoped, setScoped] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [spin, setSpin] = useState(0);

  const seq = useRef(0);
  const spinRef = useRef(0);
  const lastAngle = useRef<number | null>(null);
  const spinAt = useRef(0);
  const scopedRef = useRef(false);
  scopedRef.current = scoped;

  const spawn = useCallback(() => {
    const host = hostRef.current;
    if (!host) return;
    const w = host.clientWidth;
    const h = host.clientHeight;
    setTarget({
      id: ++seq.current,
      x: 44 + Math.random() * (w - 88),
      y: 44 + Math.random() * (h - 88),
      at: performance.now(),
    });
  }, []);

  useEffect(() => {
    spawn();
  }, [spawn]);

  // A target that times out costs the streak — otherwise there is no reason to hurry.
  useEffect(() => {
    if (!target) return;
    const id = window.setTimeout(() => {
      setStreak(0);
      spawn();
    }, LIFETIME);
    return () => window.clearTimeout(id);
  }, [target, spawn]);

  // --- spin tracking -------------------------------------------------------
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      const a = Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2));
      const now = performance.now();

      if (lastAngle.current === null || now - spinAt.current > SPIN_WINDOW) {
        spinRef.current = 0;
      } else {
        // Unwrap: take the shortest signed step, so crossing the seam is not a jump.
        let d = a - lastAngle.current;
        if (d > Math.PI) d -= Math.PI * 2;
        if (d < -Math.PI) d += Math.PI * 2;
        // Direction changes cancel, so waggling the cursor never fills the meter.
        spinRef.current += d;
      }
      lastAngle.current = a;
      spinAt.current = now;
      setSpin(Math.min(1, Math.abs(spinRef.current) / FULL_SPIN));
    };

    const onContext = (e: Event) => e.preventDefault();
    const onDown = (e: PointerEvent) => {
      if (e.button === 2) {
        setScoped(true);
        blip();
      }
    };
    const onUp = (e: PointerEvent) => {
      if (e.button === 2) setScoped(false);
    };

    host.addEventListener("pointermove", onMove);
    host.addEventListener("contextmenu", onContext);
    host.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    return () => {
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("contextmenu", onContext);
      host.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  // The meter decays on its own, so a spin you don't cash in is lost.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (performance.now() - spinAt.current > SPIN_WINDOW) {
        spinRef.current = 0;
        setSpin(0);
      }
    }, 200);
    return () => window.clearInterval(id);
  }, []);

  const hit = (t: Target) => {
    const dt = performance.now() - t.at;
    killThud();
    setScore((s) => s + (scopedRef.current ? 100 : 250) + streak * 25);
    setStreak((s) => s + 1);
    if (dt < 300) onTrickshot();
    if (!scopedRef.current && Math.abs(spinRef.current) >= FULL_SPIN) {
      spinRef.current = 0;
      setSpin(0);
      onNoScope();
    }
    spawn();
  };

  return (
    <div ref={hostRef} className={styles.arena}>
      {target && (
        <button
          key={target.id}
          type="button"
          aria-label="Target"
          className={styles.target}
          style={{ left: target.x, top: target.y }}
          /*
           * Deliberately does NOT stop propagation: the page-wide hit layer is
           * listening on the root and is what draws the marker at the cursor.
           */
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            hit(target);
          }}
        />
      )}

      {scoped && <div className={styles.scoped} />}

      <div className={styles.arenaHud}>
        SCORE {score}
        <br />
        STREAK ×{streak}
      </div>

      <div className={styles.spinMeter}>
        spin {Math.round(spin * 360)}°
        <div className={styles.spinBar}>
          <div className={styles.spinFill} style={{ width: `${spin * 100}%` }} />
        </div>
        {spin >= 1 && "NOW — DON'T SCOPE"}
      </div>
    </div>
  );
}
