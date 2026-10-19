"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useCanvas } from "@/components/CanvasStage";
import { unlock } from "@/lib/audio";
import styles from "./styles.module.css";
import type { World } from "./world/World";

export type Hit = ReturnType<World["pick"]>;

/**
 * Hands on the chat world. WASD across, Space up, Shift down; drag to look; the wheel
 * pushes forward; a press that doesn't travel is a click on whatever is under it.
 * Mounted only while a raster world is on screen, so its key listeners come and go
 * with it — and typing in the chat box never flies the camera.
 */
export function WorldView({ world, onHit }: { world: { current: World | null }; onHit: (hit: Hit) => void }) {
  const { toCanvasSpace } = useCanvas();
  const [hover, setHover] = useState(false);
  const drag = useRef<{ x: number; y: number; travel: number } | null>(null);

  useEffect(() => {
    const MOVE = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "Space", "ShiftLeft", "ShiftRight"]);
    const onDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || !MOVE.has(e.code)) return;
      e.preventDefault();
      world.current?.keys.add(e.code);
    };
    const onUp = (e: KeyboardEvent) => world.current?.keys.delete(e.code);
    const clear = () => world.current?.keys.clear();
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", clear);
    return () => {
      clear();
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", clear);
    };
  }, [world]);

  const at = (e: ReactPointerEvent) => toCanvasSpace(e.clientX, e.clientY);
  const pick = (e: ReactPointerEvent) => {
    const { x, y } = at(e);
    return world.current?.pick(x / 1600, y / 900) ?? {};
  };

  return (
    <>
      <div
        className={styles.view}
        data-hover={hover || undefined}
        onPointerDown={(e) => {
          unlock();
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { ...at(e), travel: 0 };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (d) {
            const { x, y } = at(e);
            world.current?.turn(x - d.x, y - d.y);
            d.travel += Math.abs(x - d.x) + Math.abs(y - d.y);
            d.x = x;
            d.y = y;
            return;
          }
          const hit = pick(e);
          setHover(!!(hit.portal || hit.avatar || hit.channel));
        }}
        onPointerUp={(e) => {
          const d = drag.current;
          drag.current = null;
          if (d && d.travel <= 6) onHit(pick(e));
        }}
        onPointerCancel={() => (drag.current = null)}
        onWheel={(e) => world.current?.dolly(e.deltaY)}
      />
      <div className={styles.keysHint}>
        <b>WASD</b> fly · <b>Space</b> up · <b>Shift</b> down · <b>drag</b> to look · <b>click</b> people, portals &amp; TVs
      </div>
    </>
  );
}
