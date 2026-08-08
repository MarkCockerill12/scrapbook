"use client";

import { useRef, useState, type ReactNode } from "react";
import { useCanvas } from "@/components/CanvasStage";
import { ding } from "./sound";
import styles from "./styles.module.css";

/**
 * A 1995 window that actually works: drag by the title bar, minimise, maximise,
 * close.
 *
 * Pointer deltas go through `toCanvasDelta` — the whole page is transform-scaled, so
 * raw client deltas drift by a factor of `scale` and the window slides out from under
 * the cursor on any screen that isn't exactly 1600 wide.
 */

export interface WindowState {
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  closed: boolean;
}

export function Win95Window({
  title,
  state,
  onMove,
  onFocus,
  onClose,
  flat,
  children,
  tilt = 0,
}: {
  title: string;
  state: WindowState;
  onMove: (x: number, y: number) => void;
  onFocus: () => void;
  onClose: () => void;
  flat?: boolean;
  children: ReactNode;
  /** Degrees. Windows sitting perfectly square is what kills the collage read. */
  tilt?: number;
}) {
  const { toCanvasDelta } = useCanvas();
  const [minimised, setMinimised] = useState(false);
  const [maximised, setMaximised] = useState(false);
  const drag = useRef<{ x: number; y: number } | null>(null);

  if (state.closed) return null;

  const box = maximised
    ? { x: 60, y: 96, w: 1480, h: 700 }
    : { x: state.x, y: state.y, w: state.w, h: state.h };

  return (
    <div
      className={`${styles.window} ${minimised ? styles.minimised : ""}`}
      style={{
        left: box.x,
        top: box.y,
        width: box.w,
        height: box.h,
        zIndex: state.z,
        transform: maximised ? undefined : `rotate(${tilt}deg)`,
      }}
      onPointerDown={onFocus}
    >
      <div
        className={styles.titleBar}
        onPointerDown={(e) => {
          if (maximised) return;
          /*
           * Never capture a press that started on one of the system buttons.
           * setPointerCapture retargets the matching pointerup to the capturing
           * element, so `click` then fires on the TITLE BAR and the button's own
           * handler never runs — minimise, maximise and close all became inert with
           * no error anywhere. Only the bar itself is a drag handle.
           */
          if ((e.target as HTMLElement).closest("button")) return;
          drag.current = { x: e.clientX, y: e.clientY };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const dx = toCanvasDelta(e.clientX - drag.current.x);
          const dy = toCanvasDelta(e.clientY - drag.current.y);
          drag.current = { x: e.clientX, y: e.clientY };
          onMove(box.x + dx, box.y + dy);
        }}
        onPointerUp={(e) => {
          drag.current = null;
          e.currentTarget.releasePointerCapture?.(e.pointerId);
        }}
      >
        <span className={styles.titleText}>{title}</span>
        <button
          type="button"
          className={styles.sysButton}
          aria-label="Minimise"
          onClick={() => setMinimised((m) => !m)}
        >
          _
        </button>
        <button
          type="button"
          className={styles.sysButton}
          aria-label="Maximise"
          onClick={() => setMaximised((m) => !m)}
        >
          □
        </button>
        <button
          type="button"
          className={styles.sysButton}
          aria-label={`Close ${title}`}
          onClick={() => {
            ding();
            onClose();
          }}
        >
          ✕
        </button>
      </div>

      {!minimised && (
        <div className={`${styles.windowBody} ${flat ? styles.windowBodyFlat : ""}`}>
          {children}
        </div>
      )}
    </div>
  );
}
