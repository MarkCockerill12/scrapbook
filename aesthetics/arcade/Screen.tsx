"use client";

import type { Aesthetic } from "@/lib/registry";
import styles from "./styles.module.css";

/**
 * Everything behind the glass.
 *
 * Kept as one dumb component because the cabinet owns all the state — the screen is
 * a display, and giving it opinions is how a cabinet stops feeling like hardware.
 */

export type Mode = "attract" | "select" | "initials";

export interface ScoreEntry {
  initials: string;
  score: number;
  mine?: boolean;
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ .!";

export function Screen({
  mode,
  attractPage,
  demo,
  scores,
  games,
  selection,
  initials,
  cursor,
  credits,
  freePlay,
}: {
  mode: Mode;
  attractPage: number;
  demo: Aesthetic;
  scores: ScoreEntry[];
  games: Aesthetic[];
  selection: number;
  initials: number[];
  cursor: number;
  credits: number;
  freePlay: boolean;
}) {
  if (mode === "select") {
    return (
      <div className={styles.crtInner}>
        <div className={styles.scoreHead}>SELECT YOUR GAME</div>
        <div className={styles.selectGrid}>
          {games.map((g, i) => (
            <div
              key={g.slug}
              className={`${styles.game} ${i === selection ? styles.gameOn : ""}`}
            >
              <span className={styles.gameNo} style={{ color: g.accent }}>
                {String(g.channel).padStart(2, "0")}
              </span>
              {g.name.toUpperCase()}
            </div>
          ))}
        </div>
        <div className={styles.subTitle} style={{ marginTop: "auto" }}>
          push the stick · red button starts
        </div>
      </div>
    );
  }

  if (mode === "initials") {
    return (
      <div className={styles.crtInner}>
        <div className={styles.scoreHead}>ENTER YOUR INITIALS</div>
        <div className={styles.initials}>
          {initials.map((n, i) => (
            <span
              key={i}
              className={`${styles.letter} ${i === cursor ? styles.letterOn : ""}`}
            >
              {LETTERS[n]}
            </span>
          ))}
        </div>
        <div className={styles.subTitle}>
          stick up / down for letters · left / right to move
          <br />
          red button to register
        </div>
      </div>
    );
  }

  if (attractPage === 1) {
    return (
      <div className={styles.crtInner}>
        <div className={styles.scoreHead}>HIGH SCORES</div>
        {scores.map((s, i) => (
          <div
            key={i}
            className={`${styles.scoreRow} ${s.mine ? styles.scoreMine : ""}`}
          >
            <span>{i + 1}.</span>
            <span>{s.initials}</span>
            <span style={{ textAlign: "right" }}>{s.score.toLocaleString()}</span>
          </div>
        ))}
        <div className={styles.insert}>
          {credits > 0 || freePlay ? "PRESS START" : "INSERT COIN"}
        </div>
      </div>
    );
  }

  if (attractPage === 2) {
    return (
      <div className={styles.crtInner}>
        <div className={styles.demoTag}>DEMO</div>
        <div className={styles.demoArt} style={{ borderColor: demo.accent }}>
          <span className={styles.demoNo} style={{ color: demo.accent }}>
            {String(demo.channel).padStart(2, "0")}
          </span>
          <span className={styles.demoName}>{demo.name.toUpperCase()}</span>
          <span className={styles.demoTagline}>{demo.tagline}</span>
        </div>
        <div className={styles.insert}>
          {credits > 0 || freePlay ? "PRESS START" : "INSERT COIN"}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.crtInner}>
      <div className={styles.bigTitle}>SCRAPBOOK</div>
      <div className={styles.subTitle}>© 1987 ATTIC WORKS · ALL RIGHTS RESERVED</div>
      <div className={styles.subTitle} style={{ marginTop: 40 }}>
        {games.length} GAMES IN ONE CABINET
      </div>
      <div className={styles.insert}>
        {credits > 0 || freePlay ? "PRESS START" : "INSERT COIN"}
      </div>
    </div>
  );
}

export { LETTERS };
