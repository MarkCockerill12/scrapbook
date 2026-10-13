"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { img } from "@/lib/assets";
import { blip, discSpin } from "./sound";
import styles from "./extras.module.css";

const A = "xbox-360";

/** Real box art (en.wikipedia lead images), numbered as on the contact sheet. */
export const GAMES = [
  { n: 1, title: "Halo 3", ach: "39/49", gs: "870", hrs: 412 },
  { n: 2, title: "Gears of War", ach: "28/49", gs: "515", hrs: 96 },
  { n: 3, title: "Call of Duty 4: Modern Warfare", ach: "36/40", gs: "950", hrs: 388 },
  { n: 4, title: "Mass Effect", ach: "20/49", gs: "425", hrs: 61 },
  { n: 5, title: "Guitar Hero III: Legends of Rock", ach: "31/50", gs: "600", hrs: 140 },
  { n: 6, title: "Forza Motorsport 2", ach: "15/50", gs: "230", hrs: 33 },
  { n: 7, title: "Fable II", ach: "30/50", gs: "640", hrs: 58 },
  { n: 8, title: "BioShock", ach: "22/50", gs: "480", hrs: 29 },
  { n: 9, title: "Left 4 Dead", ach: "34/40", gs: "790", hrs: 175 },
  { n: 10, title: "Crackdown", ach: "44/53", gs: "925", hrs: 81 },
  { n: 11, title: "Halo: Reach", ach: "52/59", gs: "1150", hrs: 260 },
  { n: 12, title: "Red Dead Redemption", ach: "25/49", gs: "560", hrs: 74 },
  { n: 13, title: "Grand Theft Auto IV", ach: "18/50", gs: "410", hrs: 120 },
  { n: 14, title: "Rock Band", ach: "27/50", gs: "505", hrs: 66 },
  { n: 15, title: "Assassin's Creed", ach: "40/44", gs: "900", hrs: 47 },
  { n: 16, title: "Portal 2", ach: "46/51", gs: "985", hrs: 22 },
];

export const ARCADE = [
  { n: 17, title: "Castle Crashers", ach: "12/12", gs: "200", hrs: 55 },
  { n: 18, title: "Geometry Wars: Retro Evolved", ach: "6/12", gs: "100", hrs: 19 },
  { n: 19, title: "Kinect Adventures!", ach: "4/60", gs: "40", hrs: 2 },
  { n: 20, title: "Banjo-Kazooie: Nuts & Bolts", ach: "9/50", gs: "150", hrs: 8 },
];

type Game = (typeof GAMES)[number];

export function Library({ list, onPlay }: { list: Game[]; onPlay: (g: Game) => void }) {
  const [sel, setSel] = useState(0);
  const g = list[Math.min(sel, list.length - 1)];
  return (
    <div className={styles.lib}>
      <div className={styles.libGrid}>
        {list.map((x, i) => (
          <button
            key={x.n}
            type="button"
            className={`${styles.cover} ${i === sel ? styles.coverOn : ""}`}
            onClick={() => {
              setSel(i);
              blip();
            }}
            onDoubleClick={() => onPlay(x)}
          >
            <img src={img(A, "x360_cover", x.n)?.src ?? ""} alt={x.title} />
            <span className={styles.coverGloss} />
          </button>
        ))}
      </div>
      <div className={styles.libInfo}>
        <img className={styles.libBig} src={img(A, "x360_cover", g.n)?.src ?? ""} alt="" />
        <b>{g.title}</b>
        <span>
          {g.ach} achievements · {g.gs} G
        </span>
        <span>{g.hrs} hours played</span>
        <button type="button" className={styles.libPlay} onClick={() => onPlay(g)}>
          <i>A</i> Play Game
        </button>
      </div>
    </div>
  );
}

/**
 * "Play": the disc spins up like a jet engine, the loading ring turns over the
 * blurred box art… and it's the wrong disc. Of course it is.
 */
export function Loading({ game, onDone }: { game: Game; onDone: () => void }) {
  const [err, setErr] = useState(false);
  useEffect(() => {
    discSpin();
    const a = window.setTimeout(() => setErr(true), 2600);
    return () => window.clearTimeout(a);
  }, []);
  return (
    <div className={styles.loading} onClick={err ? onDone : undefined}>
      <img className={styles.loadingBg} src={img(A, "x360_cover", game.n)?.src ?? ""} alt="" />
      {!err ? (
        <div className={styles.spinner}>
          {Array.from({ length: 4 }, (_, i) => (
            <i key={i} style={{ animationDelay: `${i * 0.18}s` }} />
          ))}
        </div>
      ) : (
        <div className={styles.discErr}>
          <b>Unreadable Disc</b>
          <p>
            The disc could not be read. It may be dirty or damaged, or it may be the Guitar
            Hero disc in the {game.title} case. Again.
          </p>
          <button type="button" onClick={onDone}>
            <i>B</i> Back
          </button>
        </div>
      )}
    </div>
  );
}
