"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useCanvas } from "@/components/CanvasStage";
import { unlock } from "@/lib/audio";
import { sbSet } from "@/lib/storage";
import { strike, type Balls } from "./balls";
import type { Vec3 } from "./Renderer";
import { MATERIALS, VISTAS, rayAt } from "./scene";
import { clack, swap } from "./sound";
import styles from "./styles.module.css";

type Ref<T> = { current: T };

/**
 * The Render Gallery's controls: tabs and arrows between the four images, the caption
 * card, and what a click does in each — drag the Whitted light, be a blob in Blinn's,
 * break Cook's rack, change Perlin's material. Mounted only while in the gallery.
 */
export function GalleryView({
  vistaRef,
  texRef,
  glide,
  cam,
  balls,
  blob,
  light,
  passRef,
}: {
  vistaRef: Ref<number>;
  texRef: Ref<number>;
  glide: Ref<{ from: { pos: Vec3; tgt: Vec3 }; to: number; t0: number; dur: number } | null>;
  cam: Ref<{ pos: Vec3; tgt: Vec3 }>;
  balls: Ref<Balls>;
  blob: Ref<[number, number, number, number]>;
  light: Ref<{ angle: number; size: number }>;
  passRef: Ref<HTMLSpanElement | null>;
}) {
  const { toCanvasSpace } = useCanvas();
  const [vista, setVista] = useState(vistaRef.current);
  const [tex, setTex] = useState(texRef.current);
  const drag = useRef<{ x: number; y: number } | null>(null);

  const go = (v: number) => {
    v = ((v % 4) + 4) % 4;
    if (v === vistaRef.current && !glide.current) return;
    const dist = Math.abs(VISTAS[v].c[0] - cam.current.pos[0]);
    glide.current = { from: { pos: cam.current.pos, tgt: cam.current.tgt }, to: v, t0: performance.now(), dur: 1500 + dist * 45 };
    blob.current = [16, 1.35, 0, 0];
    drag.current = null;
    vistaRef.current = v;
    setVista(v);
  };
  const goRef = useRef(go);
  goRef.current = go;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const k = e.key.toLowerCase();
      if (k === "a") goRef.current(vistaRef.current - 1);
      else if (k === "d") goRef.current(vistaRef.current + 1);
      else if (/^[1-4]$/.test(k)) goRef.current(Number(k) - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [vistaRef]);

  const ray = (x: number, y: number) => rayAt(x, y, 1600, 900, cam.current.pos, cam.current.tgt);

  const down = (e: ReactPointerEvent<HTMLDivElement>) => {
    unlock();
    if (glide.current) return;
    const v = vistaRef.current;
    const { x, y } = toCanvasSpace(e.clientX, e.clientY);
    if (v === 0) {
      e.currentTarget.setPointerCapture(e.pointerId);
      drag.current = { x, y };
    } else if (v === 2) {
      const r = ray(x, y);
      if (strike(balls.current, r.o, r.d)) clack(2.4);
    } else if (v === 3) {
      const t = (texRef.current + 1) % 4;
      texRef.current = t;
      setTex(t);
      sbSet("silicon-dreams", "material", t);
      swap();
    }
  };
  const move = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (glide.current) return;
    const v = vistaRef.current;
    const { x, y } = toCanvasSpace(e.clientX, e.clientY);
    if (v === 0 && drag.current) {
      const l = light.current;
      l.angle += (x - drag.current.x) * 0.008;
      l.size = Math.min(1.6, Math.max(0.08, l.size - (y - drag.current.y) * 0.004));
      drag.current = { x, y };
    } else if (v === 1) {
      const r = ray(x, y);
      if (Math.abs(r.d[2]) < 1e-4) return;
      const t = -r.o[2] / r.d[2];
      let px = r.o[0] + r.d[0] * t - 16;
      let py = r.o[1] + r.d[1] * t - 1.35;
      const l = Math.hypot(px, py);
      if (l > 1.8) {
        px *= 1.8 / l;
        py *= 1.8 / l;
      }
      blob.current = [16 + px, 1.35 + py, 0.25, 1];
    }
  };

  const here = VISTAS[vista];
  return (
    <>
      <div
        className={styles.world}
        data-vista={vista}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={() => (drag.current = null)}
        onPointerLeave={() => (blob.current = [blob.current[0], blob.current[1], blob.current[2], 0])}
      />
      <nav className={styles.tabs}>
        {VISTAS.map((v, i) => (
          <button key={v.name} type="button" data-on={i === vista || undefined} onClick={() => go(i)}>
            {v.numeral}
          </button>
        ))}
      </nav>
      <button type="button" className={styles.prev} onClick={() => go(vista - 1)} aria-label="Previous image">
        ‹
      </button>
      <button type="button" className={styles.next} onClick={() => go(vista + 1)} aria-label="Next image">
        ›
      </button>
      <div className={styles.caption} key={vista}>
        <div className={styles.numeral}>{here.numeral}</div>
        <h2>
          {here.name} <span>{here.year}</span>
        </h2>
        <p className={styles.paper}>“{here.paper}”</p>
        <p>{here.does}</p>
        <p className={styles.hint}>
          {here.hint}
          {vista === 3 && <> · now: {MATERIALS[tex]}</>}
        </p>
        <span ref={passRef} className={styles.pass} />
      </div>
    </>
  );
}
