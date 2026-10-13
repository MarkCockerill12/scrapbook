"use client";

import { useEffect, useRef } from "react";
import { useCanvas } from "@/components/CanvasStage";
import styles from "./styles.module.css";

/**
 * The Wii pointer.
 *
 * Three details do all the work, and dropping any one of them makes it read as a
 * generic hand cursor:
 *
 *   1. IT IS EXACTLY WHERE YOU POINT. An earlier version spring-followed the cursor
 *      to imitate IR lag; on a mouse that just reads as a slow, drunk cursor. Position
 *      is now written straight from the pointer event — zero frames behind.
 *   2. IT LEANS, SLIGHTLY. A few degrees of tilt into a fast sweep, critically damped
 *      so it settles without ever swinging back past upright.
 *   3. IT CLOSES. Pointer-down folds the hand into a grab.
 *
 * Runs entirely on rAF against a transform — no React state, so a fast sweep
 * across the grid costs nothing.
 */
export function WiiPointer() {
  const { toCanvasSpace, width, height } = useCanvas();
  const ref = useRef<HTMLDivElement>(null);
  const openRef = useRef<SVGGElement>(null);
  const shutRef = useRef<SVGGElement>(null);

  // Mutable state kept off React on purpose: this updates every frame.
  const target = useRef({ x: width / 2, y: height / 2 });
  const pos = useRef({ x: width / 2, y: height / 2 });
  const rot = useRef(0);
  const lastX = useRef(width / 2);
  const down = useRef(false);
  const inside = useRef(false);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const p = toCanvasSpace(e.clientX, e.clientY);
      target.current = p;
      inside.current = p.x >= 0 && p.y >= 0 && p.x <= width && p.y <= height;
      // Written here, not in rAF: the hand must never trail the real cursor.
      pos.current = p;
      const el = ref.current;
      if (el) el.style.transform = `translate3d(${p.x - 15}px, ${p.y - 8}px, 0) rotate(${rot.current.toFixed(2)}deg)`;
    };
    const onDown = () => {
      down.current = true;
    };
    const onUp = () => {
      down.current = false;
    };
    const onLeave = () => {
      inside.current = false;
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    document.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, [toCanvasSpace, width, height]);

  useEffect(() => {
    let raf = 0;
    const step = () => {
      const p = pos.current;
      const vx = p.x - lastX.current;
      lastX.current = p.x;
      // A plain ease toward the lean — no spring, so nothing to overshoot or wobble.
      const want = Math.max(-9, Math.min(9, -vx * 0.3));
      rot.current += (want - rot.current) * 0.22;
      if (Math.abs(rot.current) < 0.02) rot.current = 0;

      const el = ref.current;
      if (el) {
        el.style.transform = `translate3d(${p.x - 15}px, ${p.y - 8}px, 0) rotate(${rot.current.toFixed(2)}deg)`;
        el.style.opacity = inside.current ? "1" : "0";
      }
      if (openRef.current && shutRef.current) {
        openRef.current.style.display = down.current ? "none" : "";
        shutRef.current.style.display = down.current ? "" : "none";
      }

      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={ref} className={styles.pointer} aria-hidden>
      <svg viewBox="0 0 46 58" width="46" height="58">
        {/* Open — index finger up, thumb out. The hotspot is the fingertip. */}
        <g ref={openRef}>
          <path
            d="M15 6c0-3.3 2.7-6 6-6s6 2.7 6 6v18c1-1.6 2.8-2.6 4.8-2.6 2.6 0 4.7 1.8 5.2 4.2.9-.7 2-1.1 3.2-1.1 3 0 5.4 2.4 5.4 5.4v11.4C45.6 50.4 39.4 58 30.6 58h-8C13.9 58 7 51 7 42.3V27.6c-2.3-1.6-4.6-3.4-5.6-5C.2 20.4.9 17.6 3 16.3c2.1-1.3 4.8-.7 6.2 1.3l5.8 8.2V6z"
            fill="#ffffff"
            stroke="#7f909c"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M21 6v22" stroke="#c3ced6" strokeWidth="1.4" strokeLinecap="round" />
        </g>

        {/* Closed — a fist with knuckles, so the grab reads at 46px. */}
        <g ref={shutRef} style={{ display: "none" }}>
          <path
            d="M11 22c0-4 3.2-7.2 7.2-7.2h14.4c6.6 0 12 5.4 12 12v14.5C44.6 50.4 38.4 58 29.6 58h-8C12.9 58 6 51 6 42.3V29c-2-1.5-3.6-3-4.4-4.4-1.2-2.2-.5-5 1.6-6.3 2.1-1.3 4.8-.7 6.2 1.3L11 22z"
            fill="#ffffff"
            stroke="#7f909c"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M16 22.5h22M18 30h20"
            stroke="#c3ced6"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </g>
      </svg>
    </div>
  );
}
