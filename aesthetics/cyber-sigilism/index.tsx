"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCanvas } from "@/components/CanvasStage";
import { cut } from "@/lib/assets";
import styles from "./styles.module.css";
import { Flip, Handheld, Pod } from "./Devices";
import { clatter, ink, sync } from "./sound";

/**
 * Channel 23 — Cyber Sigilism / Silver Tech.
 *
 * Fiction: *A drawer of dead devices, photographed and annotated.*
 *
 * The demo argument: **chrome is a reflection, not a gradient.** A metal surface
 * reflects a horizon — bright sky above, dark ground below, with a hard flip between
 * them. Soften that flip and you have grey plastic. The wordmark's flip point tracks
 * the cursor, because a reflection has to move when you do.
 *
 * The three devices you can switch on are drawn, not photographed — an object
 * photographed on a table cannot have a working click wheel. The photographs are the
 * clutter around them.
 *
 * Assets: `raw/cyber-sigilism/` — matted dead hardware.
 */

const SLUG = "cyber-sigilism";

interface Placed {
  id: string;
  x: number;
  y: number;
  rot: number;
  w: number;
  slot: string;
  pick: number;
  plate: string;
}

const CLUTTER: Placed[] = [
  { id: "c1", x: 120, y: 620, rot: -9, w: 250, slot: "sigil_mp3", pick: 0, plate: "fig. i — mp3, 128kbps" },
  { id: "c2", x: 560, y: 96, rot: 7, w: 230, slot: "sigil_minidisc", pick: 0, plate: "fig. ii — minidisc" },
  { id: "c3", x: 980, y: 700, rot: -4, w: 240, slot: "sigil_device", pick: 2, plate: "fig. iii — unknown" },
  { id: "c4", x: 1300, y: 120, rot: 12, w: 210, slot: "sigil_earbud", pick: 0, plate: "fig. iv — earbuds" },
];

/** Tribal-tattoo swooshes. Long, tapering, always in mirrored pairs. */
const SIGILS = [
  "M120 700 C 300 560, 250 380, 430 300 C 560 244, 700 320, 700 430 C 700 520, 600 560, 540 500",
  "M1480 200 C 1300 300, 1330 470, 1160 540 C 1030 592, 900 520, 900 420 C 900 336, 990 300, 1050 348",
  "M300 140 C 460 90, 640 170, 700 90 C 760 14, 900 60, 930 150",
  "M1240 800 C 1090 850, 940 780, 880 850 C 830 908, 700 880, 660 810",
];

export default function CyberSigilism() {
  const { toCanvasSpace, toCanvasDelta } = useCanvas();

  const [flip, setFlip] = useState(44);
  const [gen, setGen] = useState(0);
  const [pod, setPod] = useState(false);
  const [phone, setPhone] = useState(false);
  const [gb, setGb] = useState(false);
  const [synced, setSynced] = useState(false);
  const [places, setPlaces] = useState<Record<string, { x: number; y: number }>>({});
  const [cable, setCable] = useState([
    { x: 300, y: 520 },
    { x: 720, y: 250 },
    { x: 1140, y: 640 },
  ]);
  const drag = useRef<{ id: string; kind: "item" | "cable"; index: number } | null>(null);

  const items = useMemo(
    () =>
      CLUTTER.map((c) => ({ ...c, ...(places[c.id] ?? { x: c.x, y: c.y }) })),
    [places],
  );

  // The reflection follows you.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const p = toCanvasSpace(e.clientX, e.clientY);
      setFlip(28 + (p.y / 900) * 34);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [toCanvasSpace]);

  // Egg: all three alive at once.
  useEffect(() => {
    if (pod && phone && gb && !synced) {
      setSynced(true);
      sync();
      window.setTimeout(() => setSynced(false), 2600);
    }
  }, [pod, phone, gb, synced]);

  const onDragMove = useCallback(
    (e: React.PointerEvent) => {
      const d = drag.current;
      if (!d || e.buttons !== 1) return;
      const dx = toCanvasDelta(e.movementX);
      const dy = toCanvasDelta(e.movementY);
      if (d.kind === "item") {
        setPlaces((p) => {
          const cur = p[d.id] ?? CLUTTER.find((c) => c.id === d.id)!;
          return { ...p, [d.id]: { x: cur.x + dx, y: cur.y + dy } };
        });
      } else {
        setCable((c) =>
          c.map((pt, i) => (i === d.index ? { x: pt.x + dx, y: pt.y + dy } : pt)),
        );
      }
    },
    [toCanvasDelta],
  );

  /*
   * "Tangle" is the total turning of the cable: sum the absolute angle change at
   * each control point. A straight run is 0; a knot is large. It is a genuine
   * measure of the shape rather than a distance check, so you can't cheat it by
   * dragging everything into a corner.
   */
  const tangle = useMemo(() => {
    const pts = [{ x: 90, y: 760 }, ...cable, { x: 1520, y: 300 }];
    let total = 0;
    for (let i = 1; i < pts.length - 1; i++) {
      const a = Math.atan2(pts[i].y - pts[i - 1].y, pts[i].x - pts[i - 1].x);
      const b = Math.atan2(pts[i + 1].y - pts[i].y, pts[i + 1].x - pts[i].x);
      let d = Math.abs(b - a);
      if (d > Math.PI) d = Math.PI * 2 - d;
      total += d;
    }
    return total;
  }, [cable]);

  const untangled = tangle < 0.9;

  const cablePath = useMemo(() => {
    const pts = [{ x: 90, y: 760 }, ...cable, { x: 1520, y: 300 }];
    let d = `M${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const cur = pts[i];
      d += ` Q ${prev.x + (cur.x - prev.x) * 0.35} ${cur.y} ${cur.x} ${cur.y}`;
    }
    return d;
  }, [cable]);

  return (
    <div
      className={styles.root}
      style={{ "--flip": `${flip}%` } as React.CSSProperties}
      onPointerMove={onDragMove}
      onPointerUp={() => {
        if (drag.current?.kind === "item") clatter();
        drag.current = null;
      }}
    >
      <div className={styles.grain} />

      <h1 className={styles.wordmark}>SILVERTECH</h1>
      <div className={styles.sub}>a drawer of dead devices · catalogued</div>

      {/* photographed clutter */}
      {items.map((c) => {
        const img = cut(SLUG, c.slot, c.pick);
        if (!img) return null;
        return (
          <div key={c.id}>
            <div
              className={styles.clutter}
              style={{ left: c.x, top: c.y, transform: `rotate(${c.rot}deg)` }}
              onPointerDown={(e) => {
                drag.current = { id: c.id, kind: "item", index: 0 };
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
            >
              <Image
                src={img.src}
                alt=""
                width={c.w}
                height={Math.round((c.w * img.height) / img.width)}
                style={{ display: "block", pointerEvents: "none" }}
              />
            </div>
            <span className={styles.plate} style={{ left: c.x + c.w + 34, top: c.y + 16 }}>
              {c.plate}
            </span>
          </div>
        );
      })}

      {/* the earbud cable */}
      <svg className={styles.cable} viewBox="0 0 1600 900">
        <path className={styles.cableLine} d={cablePath} />
        {cable.map((pt, i) => (
          <circle
            key={i}
            className={styles.cableHandle}
            cx={pt.x}
            cy={pt.y}
            r={11}
            onPointerDown={(e) => {
              drag.current = { id: "cable", kind: "cable", index: i };
              (e.target as SVGCircleElement).setPointerCapture(e.pointerId);
            }}
          />
        ))}
      </svg>

      {/* sigil linework, over the photographs */}
      <svg className={styles.sigils} viewBox="0 0 1600 900" key={gen}>
        {SIGILS.map((d, i) => (
          <path
            key={i}
            className={styles.sigilPath}
            d={d}
            strokeWidth={i % 2 ? 3 : 5}
            style={{ animationDelay: `${i * 220}ms` }}
          />
        ))}
      </svg>

      {/* the three that work */}
      <div className={styles.device} style={{ left: 250, top: 300 }}>
        <Pod on={pod} onToggle={setPod} />
      </div>
      <div className={styles.device} style={{ left: 720, top: 400 }}>
        <Flip on={phone} onToggle={setPhone} />
      </div>
      <div className={styles.device} style={{ left: 1090, top: 280 }}>
        <Handheld on={gb} onToggle={setGb} />
      </div>

      <aside className={styles.panel}>
        <div className={styles.panelTitle}>Drawer contents</div>
        <div className={styles.stat}>
          <span>Powered</span>
          <span>{[pod, phone, gb].filter(Boolean).length} / 3</span>
        </div>
        <div className={styles.stat}>
          <span>Cable</span>
          <span>{untangled ? "untangled" : `${tangle.toFixed(2)} rad`}</span>
        </div>
        <div className={styles.stat}>
          <span>Catalogued</span>
          <span>{CLUTTER.length} items</span>
        </div>
        <button
          type="button"
          className={styles.action}
          onClick={() => {
            setGen((g) => g + 1);
            ink();
          }}
        >
          Redraw sigils
        </button>
      </aside>

      <div className={styles.hint}>
        spin the click wheel · open the phone · flick the power switch
        <br />
        drag the three white handles to untangle the cable
        <br />
        {untangled
          ? "the cable is straight. it will not stay that way."
          : "all three alive at once and they agree with each other"}
      </div>

      {synced && (
        <div className={styles.sync}>
          <div className={styles.syncText}>all devices synchronised</div>
        </div>
      )}
    </div>
  );
}
