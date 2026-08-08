"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { one } from "@/lib/assets";
import { AESTHETICS } from "@/lib/registry";
import { useShell } from "@/lib/store";
import { DrawScreen } from "./DrawScreen";
import { button, greet, lid } from "./sound";
import styles from "./styles.module.css";

/**
 * Channel 12 — Japanese 3DS.
 *
 * Fiction: *A borrowed 3DS, left on the drawing app.*
 *
 * The demo argument: drawing hardware in CSS is a **materials** problem, not a shape
 * problem. Plastic needs a hard specular line where the surface turns, screens are
 * holes rather than panels, and the object needs seams. The background is thrown out
 * of focus because a device photographed at arm's length has a shallow depth of
 * field, and a sharp background is what makes a mockup read as a render.
 *
 * Assets: `raw/nintendo-3ds/` — a night street, blurred to bokeh behind the console.
 */

const SLUG = "nintendo-3ds";

const SKIN = ["#f5cfa8", "#e0b183", "#c08152", "#8d5a35"];
const HAIR = ["#2c1f18", "#111111", "#8a5a2b", "#d8b25c", "#6d6d75"];
const SHIRT = ["#e0574f", "#3f8fd6", "#5cb85c", "#f0b429", "#8b6fd0"];

interface Walker {
  id: number;
  x: number;
  speed: number;
  skin: string;
  hair: string;
  shirt: string;
  name: string;
}

const NAMES = ["AKI", "REN", "YUU", "MOMO", "KOU", "HANA", "SORA", "RIKU", "NAO"];

export default function Nintendo3DS() {
  const begin = useShell((s) => s.beginTransition);
  const visited = useShell((s) => s.visited);

  const [depth, setDepth] = useState(0.45);
  const [asleep, setAsleep] = useState(false);
  const [ink, setInk] = useState(0);
  const [pressed, setPressed] = useState<string | null>(null);
  const [walkers, setWalkers] = useState<Walker[]>([]);
  const sliderRef = useRef<HTMLDivElement>(null);
  const seq = useRef(0);

  const street = one(SLUG, "n3ds_street", 1);

  /* StreetPass: one Mii per channel you've actually been to. */
  useEffect(() => {
    const make = (i: number): Walker => ({
      id: ++seq.current,
      x: -60 - i * 130,
      speed: 0.3 + Math.random() * 0.5,
      skin: SKIN[i % SKIN.length],
      hair: HAIR[i % HAIR.length],
      shirt: SHIRT[i % SHIRT.length],
      name: NAMES[i % NAMES.length],
    });
    // `(_, i) => make(i)`, not `make`: Array.from's map function is called with
    // (element, index), and the element of a {length} object is undefined — so
    // passing `make` directly hands it `undefined` as the index and every position
    // computes to NaN.
    setWalkers(
      Array.from({ length: Math.max(3, Math.min(9, visited.length)) }, (_, i) => make(i)),
    );
  }, [visited.length]);

  useEffect(() => {
    if (asleep) return;
    let raf = 0;
    const step = () => {
      setWalkers((ws) =>
        ws.map((w) => {
          const x = w.x + w.speed;
          if (x > 660) {
            greet();
            return { ...w, x: -60 };
          }
          return { ...w, x };
        }),
      );
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [asleep]);

  const skyline = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        x: i * 28 - 20,
        w: 18 + ((i * 37) % 26),
        h: 60 + ((i * 53) % 150),
        wins: Array.from({ length: 6 }, (_, k) => ((i * 7 + k * 11) % 5) < 3),
      })),
    [],
  );

  const onSlider = (e: React.PointerEvent) => {
    if (e.buttons !== 1) return;
    const rect = sliderRef.current?.getBoundingClientRect();
    if (!rect) return;
    const t = 1 - (e.clientY - rect.top) / rect.height;
    setDepth(Math.max(0, Math.min(1, t)));
  };

  const tap = (id: string, action?: () => void) => {
    setPressed(id);
    button();
    window.setTimeout(() => setPressed(null), 120);
    action?.();
  };

  const par = (k: number) => ({ transform: `translateX(${depth * k}px)` });

  return (
    <div className={styles.root}>
      {street && (
        <Image
          src={street.src}
          alt=""
          width={1600}
          height={900}
          priority
          className={styles.street}
        />
      )}
      <div className={styles.streetTint} />

      <svg className={styles.wires} viewBox="0 0 1600 300" aria-hidden>
        {[40, 76, 118, 150, 196].map((y, i) => (
          <path
            key={y}
            d={`M-20 ${y} Q 400 ${y + 40 + i * 8} 820 ${y + 6} T 1620 ${y + 26}`}
            stroke="rgba(6,8,14,0.85)"
            strokeWidth={i % 2 ? 2 : 3}
            fill="none"
          />
        ))}
        <path d="M186 0v300M1386 0v300" stroke="rgba(6,8,14,0.9)" strokeWidth="9" />
      </svg>

      <div className={styles.console}>
        {/* ---------------------------------------------- upper shell */}
        <div className={`${styles.half} ${styles.top} ${asleep ? styles.closed : ""}`}>
          <span className={styles.camera} />
          <span className={styles.grille} style={{ left: 150 }} />
          <span className={styles.grille} style={{ right: 150 }} />

          <div className={`${styles.screenWell} ${styles.topScreen}`}>
            <div className={`${styles.layer} ${styles.sky} ${asleep ? styles.sleeping : ""}`}>
              <span className={styles.moon} style={par(-10)} />

              <div className={styles.skylineFar} style={par(-22)}>
                {skyline.map((b, i) => (
                  <span
                    key={i}
                    className={styles.building}
                    style={{ left: b.x, width: b.w, height: b.h }}
                  >
                    {b.wins.map((on, k) =>
                      on ? (
                        <span
                          key={k}
                          className={styles.win}
                          style={{ left: 4 + (k % 2) * 8, bottom: 8 + Math.floor(k / 2) * 12 }}
                        />
                      ) : null,
                    )}
                  </span>
                ))}
              </div>

              <div className={styles.skylineNear} style={par(-52)}>
                {skyline.slice(0, 14).map((b, i) => (
                  <span
                    key={i}
                    className={`${styles.building} ${styles.buildingNear}`}
                    style={{ left: b.x * 2 - 40, width: b.w * 1.6, height: b.h * 0.62 }}
                  />
                ))}
              </div>

              <div className={styles.appBar}>
                <span>Flipnote Studio</span>
                <span className={styles.appBadge}>
                  {ink > 0 ? `${Math.round(ink)} points` : "no note yet"}
                </span>
              </div>

              <div className={styles.parade} style={par(-70)}>
                {walkers.map((w) => (
                  <span key={w.id} className={styles.walker} style={{ left: w.x }}>
                    <span
                      className={styles.walkerHead}
                      style={{ background: w.skin, borderTop: `7px solid ${w.hair}` }}
                    />
                    {w.name}
                  </span>
                ))}
              </div>
            </div>
            <div className={styles.glass} />
          </div>

          <div
            ref={sliderRef}
            className={styles.slider3d}
            onPointerDown={onSlider}
            onPointerMove={onSlider}
          >
            <span
              className={styles.slider3dKnob}
              style={{ top: (1 - depth) * 156 }}
            />
          </div>
          <span className={styles.slider3dLabel}>3D</span>
        </div>

        <span className={styles.hinge} />

        {/* ---------------------------------------------- lower shell */}
        <div className={styles.half + " " + styles.bottom}>
          <div className={`${styles.screenWell} ${styles.bottomScreen}`}>
            {!asleep && <DrawScreen onInk={setInk} />}
            <div className={styles.glass} />
          </div>

          <span className={`${styles.led} ${asleep ? styles.ledOn : ""}`} />

          <div className={styles.pad} />
          <div className={styles.dpad}>
            <span style={{ left: 34, top: 0, width: 28, height: 96 }} />
            <span style={{ left: 0, top: 34, width: 96, height: 28 }} />
          </div>

          <div className={styles.face}>
            {[
              { id: "X", x: 43, y: 0 },
              { id: "Y", x: 0, y: 43 },
              { id: "A", x: 86, y: 43 },
              { id: "B", x: 43, y: 86 },
            ].map((b) => (
              <button
                key={b.id}
                type="button"
                aria-label={`Button ${b.id}`}
                className={`${styles.faceBtn} ${pressed === b.id ? styles.btnDown : ""}`}
                style={{ left: b.x, top: b.y }}
                onClick={() =>
                  tap(b.id, b.id === "A" ? () => begin("wii") : undefined)
                }
              >
                {b.id}
              </button>
            ))}
          </div>

          <button
            type="button"
            className={styles.smallBtn}
            style={{ left: 330 }}
            onClick={() => tap("select")}
          >
            SELECT
          </button>
          <button
            type="button"
            className={styles.smallBtn}
            style={{ right: 330 }}
            onClick={() => tap("start")}
          >
            START
          </button>
          <button
            type="button"
            className={styles.home}
            onClick={() =>
              tap("home", () => begin(AESTHETICS.find((a) => a.slug === "wii")!.slug))
            }
          >
            HOME
          </button>
        </div>
      </div>

      <div className={styles.hint}>
        draw on the bottom screen · it keeps what you drew
        <br />
        press play to watch it draw itself back
      </div>

      <button
        type="button"
        className={styles.lid}
        onClick={() => {
          setAsleep((s) => {
            lid(!s);
            return !s;
          });
        }}
      >
        {asleep ? "open the lid" : "close the lid"}
      </button>
    </div>
  );
}
