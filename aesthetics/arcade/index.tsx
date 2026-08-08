"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AESTHETICS } from "@/lib/registry";
import { sbGet, sbSet } from "@/lib/storage";
import { useShell } from "@/lib/store";
import { LETTERS, Screen, type Mode, type ScoreEntry } from "./Screen";
import { bleep, clack, coin, jackpot, letterTick, move, start } from "./sound";
import styles from "./styles.module.css";

/**
 * Channel 21 — Arcade attract mode.
 *
 * Fiction: *SCRAPBOOK — 1 PLAYER · INSERT COIN.* The page is the cabinet.
 *
 * The demo argument: a cabinet is **hardware you are standing at**, and the thing
 * that makes it hardware is that it does not care about you until you pay. The page
 * demos itself, the marquee is backlit and flickering, the glass reflects the room,
 * and the controls are physical objects that move when pressed. Nothing is
 * interactive until a coin goes in — which is the whole social contract of an
 * arcade, expressed as a UI state machine.
 *
 * No assets.
 */

const SLUG = "arcade";
const ATTRACT_MS = 4200;
const FREE_PLAY_AT = 99;

const DEFAULT_SCORES: ScoreEntry[] = [
  { initials: "CPU", score: 23000 },
  { initials: "ZAK", score: 18000 },
  { initials: "AAA", score: 12000 },
  { initials: "MRK", score: 9000 },
  { initials: "???", score: 4000 },
];

const BUTTONS = [
  { id: "start", label: "START", colour: "#38c46a" },
  { id: "fire", label: "SELECT", colour: "#e0392f" },
  { id: "sign", label: "SIGN", colour: "#2b8fd6" },
  { id: "back", label: "BACK", colour: "#f0c419" },
] as const;

type ButtonId = (typeof BUTTONS)[number]["id"];

export default function Arcade() {
  const begin = useShell((s) => s.beginTransition);
  const visited = useShell((s) => s.visited);

  const games = useMemo(() => AESTHETICS.filter((a) => a.status === "live"), []);
  const myScore = visited.length * 1000;

  const [mode, setMode] = useState<Mode>("attract");
  const [attractPage, setAttractPage] = useState(0);
  const [demoIndex, setDemoIndex] = useState(0);
  const [credits, setCredits] = useState(0);
  const [totalCoins, setTotalCoins] = useState(0);
  const [freePlay, setFreePlay] = useState(false);
  const [selection, setSelection] = useState(0);
  const [scores, setScores] = useState<ScoreEntry[]>(DEFAULT_SCORES);
  const [initials, setInitials] = useState([0, 0, 0]);
  const [cursor, setCursor] = useState(0);
  const [pressed, setPressed] = useState<ButtonId | null>(null);
  const [stick, setStick] = useState({ x: 0, y: 0 });

  const idle = useRef(performance.now());
  const stickRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const lastDir = useRef("");
  const repeat = useRef(0);

  useEffect(() => {
    setScores(sbGet<ScoreEntry[]>(SLUG, "scores", DEFAULT_SCORES));
    const coins = sbGet<number>(SLUG, "coins", 0);
    setTotalCoins(coins);
    if (coins >= FREE_PLAY_AT) setFreePlay(true);
  }, []);

  // Attract mode: three pages on a loop, and it takes the screen back if you walk
  // away mid-select. That reclaiming is what makes it feel like a machine.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (mode !== "attract") {
        if (performance.now() - idle.current > 25000) setMode("attract");
        return;
      }
      setAttractPage((p) => {
        const next = (p + 1) % 3;
        if (next === 2) setDemoIndex((d) => (d + 1) % games.length);
        bleep(next);
        return next;
      });
    }, ATTRACT_MS);
    return () => window.clearInterval(id);
  }, [mode, games.length]);

  const wake = () => {
    idle.current = performance.now();
  };

  const insertCoin = () => {
    wake();
    coin();
    setCredits((c) => c + 1);
    setTotalCoins((t) => {
      const next = t + 1;
      sbSet(SLUG, "coins", next);
      if (next >= FREE_PLAY_AT && !freePlay) {
        setFreePlay(true);
        window.setTimeout(jackpot, 260);
      }
      return next;
    });
  };

  const launch = useCallback(() => {
    const game = games[selection];
    if (!game) return;
    start();
    window.setTimeout(() => begin(game.slug), 620);
  }, [games, selection, begin]);

  const registerScore = useCallback(() => {
    const name = initials.map((n) => LETTERS[n]).join("");
    const next = [...scores.map((s) => ({ ...s, mine: false })), {
      initials: name,
      score: myScore,
      mine: true,
    }]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    setScores(next);
    sbSet(SLUG, "scores", next);
    setMode("attract");
    setAttractPage(1);
    start();
  }, [initials, scores, myScore]);

  const press = useCallback(
    (id: ButtonId) => {
      wake();
      clack();
      setPressed(id);
      window.setTimeout(() => setPressed(null), 110);

      if (id === "start") {
        if (mode !== "attract") return;
        if (!freePlay && credits < 1) return;
        if (!freePlay) setCredits((c) => c - 1);
        setMode("select");
        start();
      } else if (id === "fire") {
        if (mode === "select") launch();
        else if (mode === "initials") registerScore();
      } else if (id === "sign") {
        setMode("initials");
        setCursor(0);
        letterTick();
      } else if (id === "back") {
        setMode("attract");
      }
    },
    [mode, freePlay, credits, launch, registerScore],
  );

  /** One directional pulse from the stick. */
  const nudge = useCallback(
    (dir: string) => {
      wake();
      move();
      if (mode === "select") {
        setSelection((s) => {
          const cols = 4;
          if (dir === "left") return (s - 1 + games.length) % games.length;
          if (dir === "right") return (s + 1) % games.length;
          if (dir === "up") return (s - cols + games.length) % games.length;
          return (s + cols) % games.length;
        });
      } else if (mode === "initials") {
        if (dir === "left") setCursor((c) => (c + 2) % 3);
        else if (dir === "right") setCursor((c) => (c + 1) % 3);
        else {
          setInitials((prev) => {
            const next = [...prev];
            const step = dir === "up" ? 1 : -1;
            next[cursor] = (next[cursor] + step + LETTERS.length) % LETTERS.length;
            return next;
          });
        }
      }
    },
    [mode, games.length, cursor],
  );

  // --- the stick -----------------------------------------------------------
  const onStickMove = (clientX: number, clientY: number) => {
    const rect = stickRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = Math.max(-1, Math.min(1, (clientX - cx) / (rect.width * 0.5)));
    const dy = Math.max(-1, Math.min(1, (clientY - cy) / (rect.height * 0.5)));
    setStick({ x: dx, y: dy });

    const dir =
      Math.abs(dx) < 0.45 && Math.abs(dy) < 0.45
        ? ""
        : Math.abs(dx) > Math.abs(dy)
          ? dx > 0
            ? "right"
            : "left"
          : dy > 0
            ? "down"
            : "up";

    const now = performance.now();
    // New direction fires at once; holding repeats every 180ms, like a real gate.
    if (dir && (dir !== lastDir.current || now - repeat.current > 180)) {
      repeat.current = now;
      nudge(dir);
    }
    lastDir.current = dir;
  };

  const releaseStick = () => {
    setStick({ x: 0, y: 0 });
    lastDir.current = "";
    dragging.current = false;
  };

  return (
    <div className={styles.root} onPointerDown={wake}>
      <div className={styles.marquee}>
        <span className={styles.marqueeText}>SCRAPBOOK</span>
        <span className={styles.marqueeSub}>23 CHANNELS · 1 OR 2 PLAYERS</span>
      </div>

      <div className={styles.body} />

      <div className={styles.sideArt} style={{ left: 34 }}>
        <span className={styles.sideArtText}>INSERT COIN</span>
      </div>
      <div className={styles.sideArt} style={{ right: 34 }}>
        <span className={styles.sideArtText}>HIGH SCORE</span>
      </div>

      <div className={styles.bezel}>
        <div className={styles.screen}>
          <Screen
            mode={mode}
            attractPage={attractPage}
            demo={games[demoIndex] ?? games[0]}
            scores={scores}
            games={games}
            selection={selection}
            initials={initials}
            cursor={cursor}
            credits={credits}
            freePlay={freePlay}
          />
          <div className={styles.scanlines} />
          <div className={styles.aperture} />
          <div className={styles.glass} />
          <div className={styles.warmup} />
        </div>
      </div>

      <div className={styles.panelDeck}>
        <div
          ref={stickRef}
          className={styles.stick}
          onPointerDown={(e) => {
            dragging.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            onStickMove(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => dragging.current && onStickMove(e.clientX, e.clientY)}
          onPointerUp={(e) => {
            e.currentTarget.releasePointerCapture?.(e.pointerId);
            releaseStick();
          }}
          onPointerCancel={releaseStick}
        >
          <span className={styles.stickBase} />
          <span
            className={styles.stickBall}
            style={{ transform: `translate(${stick.x * 17}px, ${stick.y * 17}px)` }}
          />
        </div>

        <div className={styles.buttons}>
          {BUTTONS.map((b) => (
            <button
              key={b.id}
              type="button"
              aria-label={b.label}
              className={`${styles.abutton} ${pressed === b.id ? styles.pressed : ""}`}
              style={{ background: b.colour }}
              onClick={() => press(b.id)}
            >
              {b.label}
            </button>
          ))}
        </div>

        <button type="button" className={styles.coinSlot} onClick={insertCoin}>
          <span className={styles.coinMouth} />
          INSERT COIN
        </button>
      </div>

      <div className={`${styles.credits} ${freePlay ? styles.freeplay : ""}`}>
        {freePlay ? "FREE PLAY" : `CREDITS ${String(credits).padStart(2, "0")}`}
        {!freePlay && totalCoins > 0 && ` · ${totalCoins}/${FREE_PLAY_AT} TO FREE PLAY`}
      </div>

      <div className={styles.hint}>
        put a coin in · press start
        <br />
        your score is how much of the site you have seen
      </div>
    </div>
  );
}
