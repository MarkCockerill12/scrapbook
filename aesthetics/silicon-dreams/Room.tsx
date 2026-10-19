"use client";

import type { Mode } from "./loop";
import { LED, POWER, SCREEN, bbox, clipOf } from "./scene";
import styles from "./styles.module.css";

/**
 * The two things in the photograph you can put a hand on: the monitor's power button
 * (the real one, with the ⏻) and its glass. Off, either switches it on; once it has been
 * on, the glass takes you back into the world.
 */
export function Room({ mode, power, enter }: { mode: Mode; power: () => void; enter: () => void }) {
  const sb = bbox(SCREEN);
  const on = mode !== "off";
  return (
    <div className={styles.hot}>
      <div className={styles.led} data-on={on || undefined} style={{ left: LED.x - 7, top: LED.y - 4 }} aria-hidden />
      <button
        type="button"
        className={styles.power}
        data-on={on || undefined}
        style={{ left: POWER.x - POWER.w / 2, top: POWER.y - POWER.h / 2, width: POWER.w, height: POWER.h }}
        onClick={power}
        aria-label="Monitor power"
      />
      <button
        type="button"
        className={styles.screen}
        style={{ left: sb.x, top: sb.y, width: sb.w, height: sb.h, clipPath: clipOf(SCREEN) }}
        onClick={mode === "room" ? enter : power}
        aria-label={mode === "room" ? "Go back into the world" : "Switch the monitor on"}
      />
    </div>
  );
}
