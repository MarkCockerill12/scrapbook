"use client";

import { useEffect, useState } from "react";
import { clunk } from "./sound";
import styles from "./styles.module.css";

/**
 * The cassette deck. A real transport: the reels only turn while it is playing, the
 * counter only advances while it is playing, and rewind runs it backwards.
 *
 * The VU meter is driven by a cheap pseudo-signal rather than the audio graph — the
 * tape loop is four sustained sine tones, so a genuine analyser would show an almost
 * flat bar and read as broken. A meter should look like the music sounds, and here
 * that means a slow swell with a little jitter on top.
 */

const BARS = 14;

export function Cassette({
  playing,
  onToggle,
  title,
}: {
  playing: boolean;
  onToggle: (next: boolean) => void;
  title: string;
}) {
  const [counter, setCounter] = useState(0);
  const [level, setLevel] = useState(0);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setCounter((c) => c + 1), 1000);
    return () => window.clearInterval(id);
  }, [playing]);

  useEffect(() => {
    if (!playing) {
      setLevel(0);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const step = () => {
      const t = (performance.now() - start) / 1000;
      const swell = 0.5 + 0.4 * Math.sin(t * 0.75) + 0.1 * Math.sin(t * 5.3);
      setLevel(Math.max(0, Math.min(1, swell)));
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const lit = Math.round(level * BARS);

  return (
    <>
      <div className={styles.cassette}>
        <div className={styles.cassetteLabel}>{title}</div>
        <div className={styles.reelWindow}>
          <span className={`${styles.reel} ${playing ? styles.reelSpin : ""}`} />
          <span className={styles.tapeSpan} />
          <span className={`${styles.reel} ${playing ? styles.reelSpin : ""}`} />
        </div>
      </div>

      <div className={styles.transport}>
        <button
          type="button"
          className={styles.tbutton}
          aria-label="Rewind"
          onClick={() => {
            clunk();
            setCounter((c) => Math.max(0, c - 30));
          }}
        >
          ◀◀
        </button>
        <button
          type="button"
          className={`${styles.tbutton} ${playing ? styles.tbuttonOn : ""}`}
          aria-label={playing ? "Pause" : "Play"}
          onClick={() => {
            clunk();
            onToggle(!playing);
          }}
        >
          {playing ? "❚❚" : "▶"}
        </button>
        <button
          type="button"
          className={styles.tbutton}
          aria-label="Stop"
          onClick={() => {
            clunk();
            onToggle(false);
            setCounter(0);
          }}
        >
          ■
        </button>
        <button
          type="button"
          className={styles.tbutton}
          aria-label="Fast forward"
          onClick={() => {
            clunk();
            setCounter((c) => c + 30);
          }}
        >
          ▶▶
        </button>
      </div>

      <div className={styles.counter}>
        {String(Math.floor(counter / 60)).padStart(2, "0")}:
        {String(counter % 60).padStart(2, "0")} · {playing ? "PLAY" : "STOP"}
      </div>

      <div className={styles.vu}>
        {Array.from({ length: BARS }, (_, i) => (
          <span
            key={i}
            className={`${styles.vuBar} ${i < lit ? styles.vuOn : ""}`}
          />
        ))}
      </div>
    </>
  );
}
