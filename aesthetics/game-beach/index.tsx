"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCanvas } from "@/components/CanvasStage";
import { pic } from "@/lib/assets";
import { AESTHETICS } from "@/lib/registry";
import { sbGet, sbSet } from "@/lib/storage";
import { useShell } from "@/lib/store";
import { Sea } from "./Sea";
import styles from "./styles.module.css";
import { blip, coinGet, jingle, splash, startSteel } from "./sound";

/**
 * Channel 08 — Game Beach.
 *
 * Fiction: *Isle Delfino tourist board — level select.*
 *
 * The demo argument: toon shading is a **rendering model**, not a bright palette.
 * Shading is banded with hard edges, outlines are a darker tint of their own fill
 * rather than black, the water is a saturation no ocean has ever had, and the HUD is
 * furniture rather than an overlay. Put a single soft gradient anywhere in it and the
 * whole thing collapses into flat design.
 *
 * Assets: `raw/game-beach/` — a real island, posterised hard toward the toon palette.
 */

const SLUG = "game-beach";
const GOAL = 100;

const LEVELS = ["frutiger-aero", "deep-sea", "tiki", "vaporwave"] as const;

const SIGN_TEXT =
  "WELCOME TO ISLE DELFINO.\nThe tourist board reminds visitors that the water is " +
  "not that colour anywhere else, and asks that you do not attempt to verify this.";

export default function GameBeach() {
  const { toCanvasSpace } = useCanvas();
  const begin = useShell((s) => s.beginTransition);
  const muted = useShell((s) => s.muted);

  const [coins, setCoins] = useState(0);
  const [collected, setCollected] = useState<number[]>([]);
  const [pops, setPops] = useState<{ id: number; x: number; y: number }[]>([]);
  const [splashes, setSplashes] = useState<{ id: number; x: number; y: number }[]>([]);
  const [night, setNight] = useState(false);
  const [typed, setTyped] = useState(0);
  const [signOpen, setSignOpen] = useState(false);
  const [oneUp, setOneUp] = useState(false);
  const [cam, setCam] = useState(0);
  const seq = useRef(0);

  const island = pic(SLUG, "gbeach_island", 0);

  useEffect(() => {
    const stored = sbGet<number>(SLUG, "coins", 0);
    setCoins(stored);
    if (stored >= GOAL) setOneUp(false);
  }, []);

  useEffect(() => {
    if (muted || night) return;
    return startSteel();
  }, [muted, night]);

  /* Right-drag orbits the camera a little, which is all the parallax needs. */
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (e.buttons !== 2) return;
      setCam((c) => Math.max(-1, Math.min(1, c + e.movementX * 0.004)));
    };
    const noMenu = (e: Event) => e.preventDefault();
    window.addEventListener("pointermove", onMove);
    window.addEventListener("contextmenu", noMenu);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("contextmenu", noMenu);
    };
  }, []);

  /* The sign types itself out, one character and one beep at a time. */
  useEffect(() => {
    if (!signOpen) return;
    setTyped(0);
    const id = window.setInterval(() => {
      setTyped((n) => {
        if (n >= SIGN_TEXT.length) {
          window.clearInterval(id);
          return n;
        }
        if (n % 2 === 0) blip();
        return n + 1;
      });
    }, 26);
    return () => window.clearInterval(id);
  }, [signOpen]);

  const scatter = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        id: i,
        x: 150 + ((i * 233) % 1300),
        y: 300 + ((i * 149) % 460),
      })),
    [],
  );

  const collect = useCallback(
    (id: number, x: number, y: number) => {
      coinGet();
      const pid = ++seq.current;
      setPops((p) => [...p, { id: pid, x, y }]);
      window.setTimeout(() => setPops((p) => p.filter((q) => q.id !== pid)), 700);

      setCollected((c) => {
        const next = [...c, id];
        // Respawn the lot once the beach is clear, the way a game would.
        if (next.length >= scatter.length) window.setTimeout(() => setCollected([]), 1400);
        return next;
      });

      setCoins((n) => {
        const next = n + 1;
        sbSet(SLUG, "coins", next);
        if (next === GOAL) {
          setOneUp(true);
          jingle();
        }
        return next;
      });
    },
    [scatter.length],
  );

  const onSea = (e: React.PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const p = toCanvasSpace(e.clientX, e.clientY);
    const o = toCanvasSpace(rect.left, rect.top);
    const id = ++seq.current;
    setSplashes((s) => [...s, { id, x: p.x - o.x, y: p.y - o.y }]);
    window.setTimeout(() => setSplashes((s) => s.filter((q) => q.id !== id)), 700);
    splash();
  };

  const par = (k: number) => ({ transform: `translateX(${cam * k}px)` });

  return (
    <div className={`${styles.root} ${night ? styles.night : styles.day}`}>
      {/* sky */}
      <div className={styles.layer} style={par(-14)}>
        <span className={styles.sunDisc} style={{ left: 1180, top: 80 }} />
        {[
          /* Clear of the top-left HUD: a cloud behind the heart pill reads as a
             second, broken piece of UI. */
          { x: 470, y: 46, w: 180, h: 52 },
          { x: 760, y: 122, w: 210, h: 58 },
          { x: 1040, y: 62, w: 168, h: 48 },
          { x: 1360, y: 214, w: 200, h: 56 },
        ].map((c, i) => (
          <span
            key={i}
            className={styles.cloud}
            style={{ left: c.x, top: c.y, width: c.w, height: c.h }}
          />
        ))}
      </div>

      {/* the far island, posterised */}
      {island && (
        <div className={styles.layer} style={par(-32)}>
          <Image
            src={island.src}
            alt=""
            width={620}
            height={230}
            priority
            className={styles.island}
            style={{ left: 470, top: 300, width: 620, height: 200 }}
          />
        </div>
      )}

      <Sea night={night} />
      {splashes.map((s) => (
        <span
          key={s.id}
          className={styles.splash}
          style={{ left: s.x, top: 460 + s.y }}
        />
      ))}
      {/* A transparent hit layer, because the canvas is behind the coins. */}
      <div
        style={{ position: "absolute", left: 0, right: 0, top: 460, bottom: 300, zIndex: 6 }}
        onPointerDown={onSea}
      />

      <div className={styles.beach} />

      {/* palms, drawn: cel shading needs flat bands and a photo cannot give them */}
      <div className={styles.layer} style={par(26)}>
        <Palm x={90} y={470} s={1.15} />
        <Palm x={1360} y={430} s={0.95} flip />
        <Palm x={1490} y={520} s={1.3} />
      </div>

      {/* coins */}
      {scatter.map((c) =>
        collected.includes(c.id) ? null : (
          <button
            key={c.id}
            type="button"
            aria-label="Coin"
            className={styles.coin}
            style={{ left: c.x, top: c.y }}
            onClick={() => collect(c.id, c.x, c.y)}
          />
        ),
      )}
      {pops.map((p) => (
        <span key={p.id} className={styles.coinPop} style={{ left: p.x, top: p.y }}>
          +1
        </span>
      ))}

      {/* level select */}
      {LEVELS.map((slug, i) => {
        const a = AESTHETICS.find((x) => x.slug === slug);
        if (!a) return null;
        return (
          <button
            key={slug}
            type="button"
            className={styles.card}
            style={{ left: 210 + i * 300, top: 466, animationDelay: `${i * 0.4}s` }}
            onClick={() => a.status === "live" && begin(a.slug)}
          >
            <span className={styles.cardArt} style={{ background: a.accent }}>
              {String(a.channel).padStart(2, "0")}
            </span>
            <span className={styles.cardName}>{a.name.toUpperCase()}</span>
            <span className={styles.cardSub}>
              {a.status === "live" ? "warp pipe open" : "under construction"}
            </span>
          </button>
        );
      })}

      {/* signpost */}
      <button
        type="button"
        className={styles.signpost}
        style={{ left: 232, top: 690 }}
        onClick={() => {
          setSignOpen((o) => !o);
          blip();
        }}
      >
        <span className={styles.signBoard}>TOURIST INFORMATION</span>
        <span className={styles.signPost} />
      </button>

      {/* HUD */}
      <div className={styles.hud} style={{ left: 40, top: 34 }}>
        <span className={styles.hudCoin} />
        <span className={styles.hudNum}>
          {String(Math.min(coins, 999)).padStart(3, "0")}
        </span>
      </div>
      <div className={styles.hud} style={{ left: 40, top: 100 }}>
        <span className={styles.hearts}>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <span
              key={i}
              className={styles.heart}
              style={{ opacity: i < 6 ? 1 : 0.25 }}
            />
          ))}
        </span>
      </div>

      <div className={styles.minimap} style={{ left: 40, bottom: 90 }}>
        {scatter.map((c) =>
          collected.includes(c.id) ? null : (
            <span
              key={c.id}
              className={styles.mapBlip}
              style={{ left: (c.x / 1600) * 150, top: (c.y / 900) * 150 }}
            />
          ),
        )}
        <span
          className={`${styles.mapBlip} ${styles.mapYou}`}
          style={{ left: 75 + cam * 40, top: 100 }}
        />
      </div>

      <button
        type="button"
        className={styles.toggle}
        style={{ left: 40, top: 166 }}
        onClick={() => {
          setNight((n) => !n);
          blip();
        }}
      >
        {night ? "night" : "day"}
      </button>

      {signOpen && (
        <div className={styles.textbox}>
          {SIGN_TEXT.slice(0, typed)}
          <span className={styles.textboxMore}>▼</span>
        </div>
      )}

      <div className={styles.hint}>
        click the coins · splash the water · right-drag to look around
        <br />
        {GOAL - Math.min(coins, GOAL)} coins to something
      </div>

      {oneUp && (
        <div className={styles.oneup}>
          <div className={styles.oneupText}>1-UP!</div>
          <div className={styles.oneupSub}>100 coins · a channel opens</div>
          <button
            type="button"
            className={styles.oneupGo}
            onClick={() => begin("liminal")}
          >
            take the warp
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * A cel-shaded palm.
 *
 * Two flat greens with a hard edge between them and a trunk outlined in its own
 * darker tint — the same rules as everything else on the page. A photographed palm
 * cannot supply banded shading, which is why these are drawn even though the harvest
 * has four of them.
 */
function Palm({
  x,
  y,
  s,
  flip,
}: {
  x: number;
  y: number;
  s: number;
  flip?: boolean;
}) {
  return (
    <svg
      className={styles.palm}
      style={{
        left: x,
        top: y,
        width: 300 * s,
        height: 420 * s,
        transform: flip ? "scaleX(-1)" : undefined,
      }}
      viewBox="0 0 300 420"
    >
      <path
        d="M150 420 C 140 320, 136 240, 158 150 l26 8 C 166 240, 168 320, 176 420z"
        fill="#c08c42"
        stroke="#8a5f28"
        strokeWidth="6"
      />
      {[
        "M164 152 C 90 118, 40 132, 8 176 C 62 150, 116 152, 160 172z",
        "M164 152 C 96 92, 44 76, 6 92 C 68 96, 122 122, 160 160z",
        "M170 150 C 216 92, 268 74, 296 96 C 240 96, 198 122, 176 160z",
        "M172 154 C 236 128, 282 142, 298 184 C 252 154, 204 154, 178 172z",
        "M166 146 C 150 84, 172 40, 214 22 C 180 66, 178 108, 178 150z",
      ].map((d, i) => (
        <path
          key={i}
          d={d}
          fill={i % 2 ? "#2f8f3a" : "#3fae4a"}
          stroke="#1f6b28"
          strokeWidth="5"
          strokeLinejoin="round"
        />
      ))}
      <circle cx="164" cy="150" r="13" fill="#8a5f28" />
    </svg>
  );
}
