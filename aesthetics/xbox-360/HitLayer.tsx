"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useCanvas } from "@/components/CanvasStage";
import { hitmarker } from "./sound";
import styles from "./styles.module.css";

/**
 * Hitmarkers on every click, anywhere on the page.
 *
 * The bit that makes it funny rather than annoying is the combo: clicks inside 900ms
 * of each other chain, and the counter grows in the montage's own type. One click is
 * a UI sound; six in a row is a personality.
 *
 * Markers are pruned by the same timer that renders them out, so a long session
 * doesn't accumulate a thousand absolutely-positioned divs.
 */

interface Mark {
  id: number;
  x: number;
  y: number;
}

const COMBO_WINDOW = 900;

export function HitLayer({
  hostRef,
  onCount,
}: {
  hostRef: RefObject<HTMLDivElement | null>;
  onCount: (total: number) => void;
}) {
  const { toCanvasSpace } = useCanvas();
  const [marks, setMarks] = useState<Mark[]>([]);
  const [combo, setCombo] = useState(0);

  const total = useRef(0);
  const lastAt = useRef(0);
  const seq = useRef(0);
  const comboTimer = useRef(0);
  const report = useRef(onCount);
  report.current = onCount;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const onDown = (e: PointerEvent) => {
      const p = toCanvasSpace(e.clientX, e.clientY);
      const id = ++seq.current;
      setMarks((m) => [...m, { id, x: p.x, y: p.y }]);
      window.setTimeout(() => setMarks((m) => m.filter((k) => k.id !== id)), 360);

      hitmarker();
      total.current += 1;
      report.current(total.current);

      const now = performance.now();
      setCombo((c) => (now - lastAt.current < COMBO_WINDOW ? c + 1 : 1));
      lastAt.current = now;
      window.clearTimeout(comboTimer.current);
      comboTimer.current = window.setTimeout(() => setCombo(0), COMBO_WINDOW + 400);
    };

    host.addEventListener("pointerdown", onDown);
    return () => {
      host.removeEventListener("pointerdown", onDown);
      window.clearTimeout(comboTimer.current);
    };
  }, [hostRef, toCanvasSpace]);

  return (
    <div className={styles.hitLayer}>
      {marks.map((m) => (
        <span key={m.id} className={styles.hit} style={{ left: m.x, top: m.y }} />
      ))}
      {combo > 2 && <div className={styles.combo}>x{combo}</div>}
    </div>
  );
}
