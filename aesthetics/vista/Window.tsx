"use client";

import { useRef, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { useCanvas } from "@/components/CanvasStage";
import { Icon, type IconName } from "./Icons";
import styles from "./window.module.css";

/**
 * An Aero glass window.
 *
 * The frame IS the aesthetic: a tinted, blurred, saturated pane with diagonal light
 * streaks across it and a hard white glow behind the title text. The client area is
 * opaque so content stays readable over any wallpaper; only the frame is glass,
 * exactly as Vista/7 did it.
 *
 * Dragging is by the title bar only, in canvas space (toCanvasDelta — the stage is
 * transform-scaled). Presses that start on a caption button are ignored so the
 * button still gets its click (TECHNICAL_SPECS §2c).
 */

export interface WinState {
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  min: boolean;
  max: boolean;
}

interface Props {
  title: string;
  icon: IconName;
  state: WinState;
  active: boolean;
  onMove: (x: number, y: number) => void;
  onFocus: () => void;
  onClose: () => void;
  onMin: () => void;
  onMax: () => void;
  /** Client area styling — "light" (Explorer), "dark" (Media Player), "glass" (full glass). */
  body?: "light" | "dark" | "glass";
  shaking?: boolean;
  /** Flip 3D overrides the transform entirely. */
  flipStyle?: CSSProperties;
  onFlipPick?: () => void;
  toolbar?: ReactNode;
  children: ReactNode;
}

const DESK = { w: 1600, h: 848 };

export function AeroWindow({
  title,
  icon,
  state,
  active,
  onMove,
  onFocus,
  onClose,
  onMin,
  onMax,
  body = "light",
  shaking,
  flipStyle,
  onFlipPick,
  toolbar,
  children,
}: Props) {
  const { toCanvasDelta } = useCanvas();
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    if (state.max) return;
    drag.current = { id: e.pointerId, x: state.x, y: state.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMoveEv = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    d.x = Math.min(Math.max(d.x + toCanvasDelta(e.movementX), -state.w + 120), 1600 - 120);
    d.y = Math.min(Math.max(d.y + toCanvasDelta(e.movementY), 0), 800);
    onMove(d.x, d.y);
  };
  const onUp = () => {
    drag.current = null;
  };

  const geo: CSSProperties = state.max
    ? { left: 0, top: 0, width: DESK.w, height: DESK.h }
    : { left: state.x, top: state.y, width: state.w, height: state.h };

  return (
    <section
      className={[
        styles.win,
        active ? styles.active : "",
        state.min ? styles.min : "",
        state.max ? styles.max : "",
        shaking ? styles.shake : "",
        flipStyle ? styles.flipping : "",
      ].join(" ")}
      style={{ ...geo, zIndex: state.z, ...flipStyle }}
      onPointerDownCapture={onFocus}
      onClick={flipStyle ? onFlipPick : undefined}
      aria-label={title}
    >
      <div className={styles.streaks} aria-hidden />
      <div
        className={styles.titlebar}
        onPointerDown={onDown}
        onPointerMove={onMoveEv}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onDoubleClick={onMax}
      >
        <span className={styles.titleIcon}>
          <Icon name={icon} size={18} />
        </span>
        <span className={styles.title}>{title}</span>
        <div className={styles.caption}>
          <button type="button" className={styles.capMin} onClick={onMin} aria-label="Minimise">
            <span />
          </button>
          <button type="button" className={styles.capMax} onClick={onMax} aria-label="Maximise">
            <span />
          </button>
          <button type="button" className={styles.capClose} onClick={onClose} aria-label="Close">
            <span>✕</span>
          </button>
        </div>
      </div>
      {toolbar && <div className={styles.toolbar}>{toolbar}</div>}
      <div className={`${styles.client} ${styles[body]}`}>{children}</div>
    </section>
  );
}
