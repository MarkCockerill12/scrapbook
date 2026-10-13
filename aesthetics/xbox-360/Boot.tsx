"use client";

import { useEffect, useState } from "react";
import { bootSound } from "./sound";
import styles from "./extras.module.css";

/**
 * The power-on: green light ribbons sweep in from the edges, collapse into a glowing
 * orb, the orb resolves into the X, and the wordmark reveals under a light sweep.
 * ~3.6s, click to skip. Plays once per visit to the channel.
 */
export function Boot({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    bootSound();
    const t = [
      window.setTimeout(() => setPhase(1), 900),
      window.setTimeout(() => setPhase(2), 1900),
      window.setTimeout(() => setPhase(3), 3300),
      window.setTimeout(onDone, 3900),
    ];
    return () => t.forEach((x) => window.clearTimeout(x));
  }, [onDone]);

  return (
    <div className={`${styles.boot} ${phase >= 3 ? styles.bootOut : ""}`} onClick={onDone}>
      <div className={styles.ribbons}>
        {Array.from({ length: 7 }, (_, i) => (
          <i key={i} style={{ animationDelay: `${i * 70}ms`, rotate: `${-40 + i * 13}deg` }} />
        ))}
      </div>
      <div className={`${styles.orb} ${phase >= 1 ? styles.orbOn : ""}`}>
        <svg viewBox="0 0 100 100" className={styles.orbX} aria-hidden>
          <path
            d="M28 18c9 3 17 10 22 17 5-7 13-14 22-17 9 8 14 19 14 32 0 7-2 14-5 20-5-12-15-24-31-33-16 9-26 21-31 33-3-6-5-13-5-20 0-13 5-24 14-32z"
            fill="rgba(255,255,255,.92)"
          />
        </svg>
      </div>
      <div className={`${styles.word} ${phase >= 2 ? styles.wordOn : ""}`}>
        XBOX<span>360</span>
      </div>
      <p className={styles.skip}>click to skip</p>
    </div>
  );
}
