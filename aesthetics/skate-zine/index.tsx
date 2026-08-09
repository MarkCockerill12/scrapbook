"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCanvas } from "@/components/CanvasStage";
import { pic } from "@/lib/assets";
import { sbGet, sbSet } from "@/lib/storage";
import { Ransom } from "./Ransom";
import { copy, jam, peel, rattle, squeak, staplePull, startSpray } from "./sound";
import styles from "./styles.module.css";

/**
 * Channel 18 — Skate Zine.
 *
 * Fiction: *SHRED WEEKLY #12 — cut, pasted, photocopied, stapled.*
 *
 * The demo argument, and the project's thesis statement: **a photocopy is 1-bit, not
 * greyscale.** Mid-tones do not survive — they resolve to solid black or to nothing.
 * That single fact is why this is the one channel where a merely-adequate photograph
 * becomes *correct* material: threshold it hard enough and any snapshot is zine stock.
 * Everything else follows — nothing square to anything, edges torn or cut but never
 * rounded, and generation loss that compounds rather than adds.
 *
 * The ransom lettering is composited from fonts and is a **stand-in** — see
 * `Ransom.tsx` and `FOR_MARK.md`.
 *
 * Assets: `raw/skate-zine/` — real skaters and skateparks, thresholded to 1-bit.
 */

const SLUG = "skate-zine";
const MAX_GEN = 10;

interface Scrap {
  id: string;
  x: number;
  y: number;
  rot: number;
  w: number;
  slot: string;
  pick: number;
  caption: string;
}

const SCRAPS: Scrap[] = [
  { id: "s1", x: 46, y: 210, rot: -3.4, w: 250, slot: "zine_skate", pick: 0, caption: "hunter st. // still open" },
  { id: "s2", x: 330, y: 396, rot: 2.6, w: 232, slot: "zine_skatepark", pick: 1, caption: "the bowl, 6am" },
  { id: "s3", x: 44, y: 616, rot: 1.8, w: 206, slot: "zine_skate", pick: 3, caption: "landed it. once." },
  { id: "s4", x: 706, y: 158, rot: 3.2, w: 262, slot: "zine_spray", pick: 0, caption: "not us" },
  { id: "s5", x: 1006, y: 452, rot: -2.4, w: 238, slot: "zine_skate", pick: 5, caption: "rip the fence" },
];

const COPY_1 = [
  "They put the new blocks in on Tuesday and by Thursday somebody had waxed every edge of them, which tells you everything about who that plaza was actually built for.",
  "Nobody asked for a skate ban. A councillor asked for one. There is a difference and we would like the paper to print it.",
];

const COPY_2 = [
  "Issue twelve. Same photocopier, same jammed tray, same guy at the print shop pretending not to notice what we are running off at eleven at night.",
  "If you sent us a photo and it is not in here it is because the copier ate it. Send it again. Send two.",
];

export default function SkateZine() {
  const { toCanvasSpace, toCanvasDelta } = useCanvas();

  const [gen, setGen] = useState(0);
  const [staples, setStaples] = useState([false, false, false]);
  const [tool, setTool] = useState<"hand" | "sharpie" | "spray">("hand");
  const [places, setPlaces] = useState<Record<string, { x: number; y: number }>>({});
  const [spray, setSpray] = useState({ x: -200, y: -200 });
  const drag = useRef<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPt = useRef({ x: 0, y: 0, t: 0 });
  const sprayStop = useRef<null | (() => void)>(null);

  const loose = staples.every(Boolean);

  useEffect(() => {
    setGen(sbGet<number>(SLUG, "gen", 0));
    setPlaces(sbGet<Record<string, { x: number; y: number }>>(SLUG, "places", {}));
  }, []);

  /* Restore the marker layer. Stored as a data URL: unlike the 3DS flipnote nothing
     here needs replaying, and a bitmap survives spray blobs that aren't strokes. */
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    canvas.width = 1290;
    canvas.height = 856;
    const saved = sbGet<string>(SLUG, "marker", "");
    if (!saved) return;
    const img = new window.Image();
    img.onload = () => ctx.drawImage(img, 0, 0);
    img.src = saved;
  }, []);

  const persistMarker = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      sbSet(SLUG, "marker", canvas.toDataURL("image/webp", 0.5));
    } catch {
      /* quota — the drawing still stands for this session */
    }
  }, []);

  // --- marker / spray ----------------------------------------------------
  const paintAt = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const p = toCanvasSpace(clientX, clientY);
    const o = toCanvasSpace(rect.left, rect.top);
    const x = p.x - o.x;
    const y = p.y - o.y;

    if (tool === "spray") {
      // A can throws a cone of droplets, densest in the middle, and it never has an edge.
      for (let i = 0; i < 26; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.pow(Math.random(), 0.6) * 34;
        ctx.fillStyle = `rgba(20,18,16,${0.05 + Math.random() * 0.12})`;
        ctx.fillRect(x + Math.cos(a) * r, y + Math.sin(a) * r, 1.6, 1.6);
      }
      return;
    }

    const now = performance.now();
    const dx = x - lastPt.current.x;
    const dy = y - lastPt.current.y;
    const dist = Math.hypot(dx, dy);
    ctx.strokeStyle = "rgba(18,16,14,0.92)";
    // A marker bleeds: the faster you go the thinner it gets, and it never has a
    // clean edge, so two passes at different alphas beat one crisp line.
    ctx.lineWidth = Math.max(4, 11 - dist * 0.22);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(lastPt.current.x, lastPt.current.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.globalAlpha = 0.35;
    ctx.lineWidth += 3;
    ctx.stroke();
    ctx.globalAlpha = 1;

    const dt = Math.max(1, now - lastPt.current.t);
    if (dist > 3) squeak(dist / dt);
    lastPt.current = { x, y, t: now };
  };

  const onPaintDown = (e: React.PointerEvent) => {
    if (tool === "hand") return;
    drawing.current = true;
    const rect = e.currentTarget.getBoundingClientRect();
    const p = toCanvasSpace(e.clientX, e.clientY);
    const o = toCanvasSpace(rect.left, rect.top);
    lastPt.current = { x: p.x - o.x, y: p.y - o.y, t: performance.now() };
    e.currentTarget.setPointerCapture(e.pointerId);
    if (tool === "spray") {
      rattle();
      sprayStop.current = startSpray();
    }
    paintAt(e.clientX, e.clientY);
  };

  const onPaintUp = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    drawing.current = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    sprayStop.current?.();
    sprayStop.current = null;
    persistMarker();
  };

  // --- dragging scraps ---------------------------------------------------
  const onMove = (e: React.PointerEvent) => {
    if (tool === "spray") {
      const p = toCanvasSpace(e.clientX, e.clientY);
      setSpray(p);
    }
    if (drawing.current) {
      paintAt(e.clientX, e.clientY);
      return;
    }
    const id = drag.current;
    if (!id || e.buttons !== 1) return;
    const dx = toCanvasDelta(e.movementX);
    const dy = toCanvasDelta(e.movementY);
    setPlaces((prev) => {
      const base = prev[id] ?? SCRAPS.find((s) => s.id === id)!;
      const next = { ...prev, [id]: { x: base.x + dx, y: base.y + dy } };
      return next;
    });
  };

  const endDrag = () => {
    if (drag.current) {
      peel();
      sbSet(SLUG, "places", places);
    }
    drag.current = null;
  };

  // --- the copier --------------------------------------------------------
  const runCopy = () => {
    setGen((g) => {
      const next = Math.min(MAX_GEN, g + 1);
      sbSet(SLUG, "gen", next);
      if (next === MAX_GEN) jam();
      else copy();
      return next;
    });
  };

  const pullStaple = (i: number) => {
    if (staples[i]) return;
    staplePull();
    setStaples((s) => s.map((v, k) => (k === i ? true : v)));
  };

  const scraps = useMemo(
    () => SCRAPS.map((s) => ({ ...s, ...(places[s.id] ?? { x: s.x, y: s.y }) })),
    [places],
  );

  return (
    <div
      className={styles.root}
      onPointerMove={onMove}
      onPointerUp={endDrag}
      style={{ cursor: tool === "hand" ? "default" : "none" }}
    >
      <div className={styles.spread} style={{ "--gen": gen } as React.CSSProperties}>
        {/* ---------------------------------------------- left page */}
        <div className={`${styles.page} ${styles.pageLeft} ${loose ? styles.loose : ""}`}>
          <div className={styles.head} style={{ left: 26, top: 24, width: 570 }}>
            <Ransom text="SHRED WEEKLY" size={44} seed={1} />
          </div>
          <div className={styles.head} style={{ left: 28, top: 108, fontSize: 13 }}>
            ISSUE 12 · FREE · TAKE IT
          </div>

          <div className={styles.column} style={{ left: 320, top: 150, width: 268 }}>
            {COPY_1.map((t, i) => (
              <p key={i}>{t}</p>
            ))}
          </div>

          <div className={styles.column} style={{ left: 292, top: 486, width: 296 }}>
            <p>
              <b>WHAT WE WANT:</b> the ledge back, the lights on till ten, and for
              nobody to put a planter on it.
            </p>
          </div>

          {/*
            Toner build-up, modelled honestly: each generation a copier THICKENS the
            dark end, so a mark that started as a hint of grey gets heavier every
            pass. At gen 0 this is very nearly paper; by gen 10 it is the boldest
            thing on the spread. Fading it in on opacity would have been the same
            picture and the wrong reason.
          */}
          <div
            className={styles.secret}
            style={{
              left: 44,
              top: 760,
              width: 520,
              color: `rgb(${Math.round(238 - gen * 12.4)}, ${Math.round(
                236 - gen * 12.2,
              )}, ${Math.round(228 - gen * 11.4)})`,
            }}
          >
            keep making things
            <br />
            nobody asked for
          </div>
        </div>

        {/* ---------------------------------------------- right page */}
        <div className={`${styles.page} ${styles.pageRight} ${loose ? styles.loose : ""}`}>
          {/* left-anchored: right-anchored it ran under the copier panel */}
          <div className={styles.head} style={{ left: 34, top: 26 }}>
            <Ransom text="LETTERS" size={36} seed={9} />
          </div>

          <div className={styles.column} style={{ left: 34, top: 116, width: 250 }}>
            {COPY_2.map((t, i) => (
              <p key={i}>{t}</p>
            ))}
          </div>

          <div className={styles.column} style={{ left: 34, top: 700, width: 560 }}>
            <p>
              PHOTOCOPIED AT THE PLACE ON GRAND · IF YOU ARE READING GENERATION TEN,
              WELL DONE, AND ALSO SORRY
            </p>
          </div>
        </div>

        {/* ---------------------------------------------- scraps */}
        {scraps.map((s) => {
          const img = pic(SLUG, s.slot, s.pick);
          return (
            <div
              key={s.id}
              className={styles.scrap}
              style={{ left: s.x, top: s.y, transform: `rotate(${s.rot}deg)` }}
              onPointerDown={(e) => {
                if (tool !== "hand") return;
                drag.current = s.id;
                e.stopPropagation();
              }}
            >
              {img && (
                <Image
                  src={img.src}
                  alt=""
                  width={s.w}
                  height={Math.round((s.w * img.height) / img.width)}
                  className={styles.photo}
                  style={{ pointerEvents: "none" }}
                />
              )}
              <div className={styles.caption}>{s.caption}</div>
            </div>
          );
        })}

        {/* ---------------------------------------------- gutter + staples */}
        <div className={styles.gutter} />
        {[130, 420, 710].map((y, i) => (
          <button
            key={y}
            type="button"
            aria-label={`Staple ${i + 1}`}
            className={`${styles.staple} ${staples[i] ? styles.staplePulled : ""}`}
            style={{ top: y }}
            onClick={() => pullStaple(i)}
          />
        ))}

        {/* ---------------------------------------------- marker layer */}
        <canvas
          ref={canvasRef}
          className={styles.sharpie}
          style={{
            width: 1290,
            height: 856,
            pointerEvents: tool === "hand" ? "none" : "auto",
            cursor: "none",
          }}
          onPointerDown={onPaintDown}
          onPointerUp={onPaintUp}
          onPointerCancel={onPaintUp}
        />

        <div className={styles.halftone} />
        <div className={styles.speckle} />
      </div>

      {/* ---------------------------------------------- desk */}
      <div className={styles.toolbar}>
        {(["hand", "sharpie", "spray"] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={`${styles.tool} ${tool === t ? styles.toolOn : ""}`}
            onClick={() => setTool(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className={styles.copier}>
        <div className={styles.copierTitle}>Photocopier</div>
        <div className={styles.copierGen}>GEN {gen}</div>
        <button type="button" className={styles.copierBtn} onClick={runCopy}>
          {gen >= MAX_GEN ? "it is jammed" : "copy the copy"}
        </button>
        <button
          type="button"
          className={styles.copierBtn}
          style={{ marginTop: 5 }}
          onClick={() => {
            setGen(0);
            sbSet(SLUG, "gen", 0);
          }}
        >
          fresh original
        </button>
      </div>

      {tool === "spray" && (
        <span className={styles.sprayCursor} style={{ left: spray.x, top: spray.y }} />
      )}

      <div className={styles.hint}>
        drag the scraps · pull all three staples
        <br />
        copy it ten times and read what survives
      </div>
    </div>
  );
}
