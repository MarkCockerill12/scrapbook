"use client";

import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { chime, tick } from "@/lib/audio";
import styles from "./styles.module.css";

/**
 * The controls. Glossy toggles and sliders that actually drive the page.
 *
 * The 2004 rule these follow: a control must look like it has a light source above
 * it and a physical body underneath. Every one of them has a hard specular highlight
 * on its top half — that's the .knob::after and .glass::after in the stylesheet.
 *
 * Both read their geometry from getBoundingClientRect, which is already in client
 * space, so they're scale-correct without going through toCanvasDelta.
 */

export function GlossToggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`${styles.toggle} ${on ? styles.toggleOn : ""}`}
      onClick={() => {
        chime(!on);
        onChange(!on);
      }}
    >
      <span className={styles.knob} />
    </button>
  );
}

export function GlossSlider({
  value,
  onChange,
  label,
}: {
  /** 0..1 */
  value: number;
  onChange: (next: number) => void;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const lastTick = useRef(0);

  const apply = useCallback(
    (clientX: number) => {
      const rect = ref.current?.getBoundingClientRect();
      if (!rect || !rect.width) return;
      const next = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
      onChange(next);

      // A tick per 10% travel — continuous ticking on every pointermove is grating.
      const step = Math.round(next * 10);
      if (step !== lastTick.current) {
        lastTick.current = step;
        tick();
      }
    },
    [onChange],
  );

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    apply(e.clientX);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    apply(e.clientX);
  };

  const stop = (e: ReactPointerEvent<HTMLDivElement>) => {
    dragging.current = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  return (
    <div
      ref={ref}
      className={styles.slider}
      role="slider"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stop}
      onPointerCancel={stop}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          // Stop the dial stealing these — inside a slider they mean "adjust".
          e.stopPropagation();
          const delta = e.key === "ArrowRight" ? 0.05 : -0.05;
          onChange(Math.min(Math.max(value + delta, 0), 1));
          tick();
        }
      }}
    >
      <div className={styles.sliderTrack}>
        <div className={styles.sliderFill} style={{ right: `${(1 - value) * 100}%` }} />
      </div>
      <div className={styles.sliderKnob} style={{ left: `${value * 100}%` }} />
    </div>
  );
}
