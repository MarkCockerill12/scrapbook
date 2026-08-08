"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCanvas } from "@/components/CanvasStage";
import { cut, one } from "@/lib/assets";
import { useShell } from "@/lib/store";
import { RubPanel } from "./RubPanel";
import { bell, chime, grind, press, startDrums, startFire, wrong } from "./sound";
import styles from "./styles.module.css";

/**
 * Channel 11 — Aztec / Izalith.
 *
 * Fiction: *Expedition Log — Day 47. We should not have opened it.*
 *
 * The demo argument: this page is a **lighting problem**. There are exactly two
 * light sources — the torch you are carrying, which is at the cursor, and the lava,
 * which is underneath — and they come from different directions. Most of the frame
 * is genuinely black. The instinct to let the visitor see everything is the thing to
 * resist; the dread is entirely in what the torch doesn't reach.
 *
 * Assets: `raw/aztec/` — a real Maya stone relief as the wall, matted vines at the
 * corners. The harvested "lava" was basalt columns, so the lava is drawn.
 */

const SLUG = "aztec";

/** Nine carved glyphs. Simple enough to read at 82px in near-darkness. */
const GLYPHS = [
  "M20 20h60v60H20z M35 35h30v30H35z",
  "M50 12l38 38-38 38-38-38z",
  "M15 50a35 35 0 0 1 70 0 M50 50v34",
  "M20 25h60 M20 50h60 M20 75h60 M50 25v50",
  "M50 15v70 M25 30l25-15 25 15 M25 70l25 15 25-15",
  "M25 25h50v50H25z M25 25l50 50 M75 25l-50 50",
  "M50 18a32 32 0 1 0 .1 0z M50 34a16 16 0 1 1 -.1 0z",
  "M18 82l16-64 16 44 16-44 16 64",
  "M22 22h24v24H22z M54 22h24v24H54z M22 54h24v24H22z M54 54h24v24H54z",
];

const SEQUENCE = [4, 1, 7, 3];
const LAVA_BASE = 92;
const LAVA_STEP = 26;

export default function Aztec() {
  const { toCanvasSpace } = useCanvas();
  const begin = useShell((s) => s.beginTransition);
  const muted = useShell((s) => s.muted);

  const rootRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const flameRef = useRef<HTMLDivElement>(null);
  const target = useRef({ x: 800, y: 450 });
  const pos = useRef({ x: 800, y: 450 });

  const [entered, setEntered] = useState<number[]>([]);
  const [down, setDown] = useState<number | null>(null);
  const [dust, setDust] = useState<{ id: number; g: number; dx: number }[]>([]);
  const [failures, setFailures] = useState(0);
  const [open, setOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [collapsing, setCollapsing] = useState(false);
  const [heat, setHeat] = useState(0);
  const seq = useRef(0);

  const wall = one(SLUG, "aztec_wall", 0)?.src ?? "";

  useEffect(() => {
    if (muted) return;
    const stopFire = startFire();
    const stopDrums = startDrums();
    return () => {
      stopFire();
      stopDrums();
    };
  }, [muted]);

  // --- the torch --------------------------------------------------------
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      target.current = toCanvasSpace(e.clientX, e.clientY);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [toCanvasSpace]);

  useEffect(() => {
    let raf = 0;
    const step = () => {
      // Lag the light behind the hand. A torch has mass and the arm swings.
      pos.current.x += (target.current.x - pos.current.x) * 0.16;
      pos.current.y += (target.current.y - pos.current.y) * 0.16;
      const { x, y } = pos.current;

      const root = rootRef.current;
      if (root) {
        root.style.setProperty("--tx", `${x.toFixed(1)}px`);
        root.style.setProperty("--ty", `${y.toFixed(1)}px`);
      }
      if (glowRef.current) {
        glowRef.current.style.transform = `translate(${x}px, ${y}px)`;
      }
      if (flameRef.current) {
        flameRef.current.style.transform = `translate(${target.current.x}px, ${target.current.y}px)`;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  // --- glyphs -----------------------------------------------------------
  const pushGlyph = useCallback(
    (i: number) => {
      if (open || collapsing) return;
      press();
      setDown(i);
      window.setTimeout(() => setDown(null), 140);

      // Dust out of the recess.
      const id = ++seq.current;
      setDust((d) => [...d, { id, g: i, dx: (Math.random() - 0.5) * 40 }]);
      window.setTimeout(() => setDust((d) => d.filter((x) => x.id !== id)), 900);

      // Each press feeds the fissure. It never goes back down.
      setHeat((h) => Math.min(6, h + 1));

      const next = [...entered, i];
      const correctSoFar = next.every((g, k) => g === SEQUENCE[k]);

      if (!correctSoFar) {
        wrong();
        setEntered([]);
        setFailures((f) => {
          const n = f + 1;
          if (n >= 3) {
            setCollapsing(true);
            bell();
            window.setTimeout(() => begin("deep-sea"), 2500);
          }
          return n;
        });
        return;
      }

      chime(next.length - 1);
      setEntered(next);
      if (next.length === SEQUENCE.length) {
        grind();
        window.setTimeout(() => setOpen(true), 500);
      }
    },
    [entered, open, collapsing, begin],
  );

  const lavaHeight = LAVA_BASE + heat * LAVA_STEP;

  return (
    <div ref={rootRef} className={styles.root} style={{ "--torch": "300px" } as React.CSSProperties}>
      <div className={styles.wall} style={{ backgroundImage: `url(${wall})` }} />
      <div className={styles.wallJoints} />

      <div className={styles.lavaGlow} style={{ height: lavaHeight + 260 }} />
      <div className={styles.lava} style={{ height: lavaHeight }}>
        <div className={styles.lavaCrust} />
      </div>
      <div className={styles.haze} style={{ bottom: lavaHeight }} />

      <div className={styles.title}>
        <div className={styles.titleMain}>EXPEDITION LOG · DAY 47</div>
        <div className={styles.titleSub}>we should not have opened it</div>
      </div>

      {/* glyph wall, or the door once it is open */}
      {open ? (
        <div className={styles.door}>
          <div className={styles.doorText}>the stone has moved</div>
          <div className={styles.doorText} style={{ letterSpacing: "0.18em", opacity: 0.7 }}>
            beyond it the passage is carpeted
          </div>
          <button
            type="button"
            className={styles.doorLink}
            onClick={() => begin("liminal")}
          >
            go through
          </button>
        </div>
      ) : (
        <div className={styles.glyphs}>
          {GLYPHS.map((d, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Glyph ${i + 1}`}
              className={`${styles.glyph} ${down === i ? styles.glyphDown : ""} ${
                entered.includes(i) ? styles.glyphLit : ""
              }`}
              onClick={() => pushGlyph(i)}
            >
              <svg className={styles.glyphSvg} viewBox="0 0 100 100">
                <path d={d} />
              </svg>
              {dust
                .filter((x) => x.g === i)
                .map((x) => (
                  <span
                    key={x.id}
                    className={styles.dust}
                    style={{ "--dx": `${x.dx}px` } as React.CSSProperties}
                  />
                ))}
            </button>
          ))}
        </div>
      )}

      {/* the panel with the answer under five centuries of dirt */}
      <RubPanel width={414} height={190} onClean={() => setRevealed(true)}>
        <span style={{ display: "flex", gap: 18, alignItems: "center" }}>
          {SEQUENCE.map((g, i) => (
            <svg key={i} width="58" height="58" viewBox="0 0 100 100">
              <path
                d={GLYPHS[g]}
                stroke="#ffcf8f"
                strokeWidth="6"
                fill="none"
                strokeLinecap="square"
              />
            </svg>
          ))}
        </span>
      </RubPanel>

      {/* journal */}
      <div className={styles.journal}>
        <span className={styles.clip} />
        <div className={styles.journalHead}>Field journal · R. Vasquez · Day 47</div>
        <div className={styles.journalBody}>
          The chamber is not a tomb. There is no body, no offering, nothing anyone was
          meant to find. Only the wall, and the wall is a <em>lock</em>.
          <br />
          <br />
          Four marks, in an order, and the order is cut into the panel by the fissure
          — but the panel has not been cleaned in five hundred years and neither, I am
          told, has anyone here.
          <br />
          <br />
          The heat rises every time we press one. I have asked the others to stop. They
          have not stopped.
          <span className={styles.hand}>
            {revealed
              ? "— the marks are legible now. God help us."
              : "— rub the panel. it is under there."}
          </span>
        </div>
      </div>

      {/* vines, matted from real photographs */}
      {[0, 1].map((i) => {
        const v = cut(SLUG, "aztec_vine", i);
        if (!v) return null;
        const w = i === 0 ? 480 : 420;
        return (
          <Image
            key={i}
            src={v.src}
            alt=""
            width={w}
            height={Math.round((w * v.height) / v.width)}
            className={styles.vine}
            style={
              i === 0
                ? { left: -70, top: -60 }
                : { right: -80, bottom: 60, transform: "scaleX(-1)" }
            }
          />
        );
      })}

      <div className={styles.hint}>
        the torch is your cursor · press the glyphs in order
        <br />
        {failures > 0 && !collapsing
          ? `the floor has cracked ${failures} time${failures > 1 ? "s" : ""}`
          : "rub the panel to find the order"}
      </div>

      {/* torch layers, drawn last so nothing sits over the light */}
      <div className={styles.dark} />
      <div ref={glowRef} className={styles.torchGlow} />
      <div ref={flameRef} className={styles.flame} />

      {collapsing && (
        <div className={styles.collapse}>
          <div className={styles.collapseText}>
            the floor gives way
            <br />
            there is water below
          </div>
        </div>
      )}
    </div>
  );
}
