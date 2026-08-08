"use client";

import { useEffect, useRef } from "react";
import { ground, hero, pillars, saveIcon } from "./models";
import { Raster, checkerTexture, draw, project, type Camera, type Prim } from "./renderer";
import styles from "./styles.module.css";

/**
 * The 240p viewport.
 *
 * Runs at 30fps on purpose. Sixty is not more faithful, it is less: PS1 titles that
 * held 30 were the well-optimised ones, and at 60 the vertex swim turns into a
 * shimmer rather than the slow wobble it should be.
 *
 * Right-drag or left-drag orbits. `loaded` swaps what the scene contains, which is
 * what "loading a save" means here.
 */

const W = 320;
const H = 240;
const FRAME_MS = 1000 / 30;

export function Viewport({
  loaded,
  reading,
  corrupt,
  width = 760,
  height = 570,
}: {
  /** Which save is booted, or null for the idle turntable. */
  loaded: number | null;
  reading: boolean;
  corrupt: boolean;
  width?: number;
  height?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const state = useRef({ loaded, reading, corrupt });
  state.current = { loaded, reading, corrupt };

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    canvas.width = W;
    canvas.height = H;

    const raster = new Raster(ctx, W, H);
    const tex = checkerTexture(64);
    const floor = ground(9, 10, 0);
    const props = pillars();
    const figure = hero();
    const icons = [saveIcon(0), saveIcon(1), saveIcon(2)];

    /*
     * The camera orbits the target, so anything further from the target than
     * `distance` ends up BEHIND the near plane and gets dropped. The first pass had
     * a 32-unit floor 15 units away: its near half was behind the camera, and the
     * surviving half magnified until it filled the frame. The world is deliberately
     * smaller than the orbit radius, and fog eats the edge before you can see it.
     */
    const cam: Camera = {
      yaw: 0.6,
      pitch: 0.28,
      distance: 12,
      target: { x: 0, y: 1.7, z: 0 },
      focal: 280,
    };

    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      cam.yaw -= (e.clientX - lastX) * 0.008;
      cam.pitch = Math.max(-0.1, Math.min(0.9, cam.pitch + (e.clientY - lastY) * 0.005));
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onUp = (e: PointerEvent) => {
      dragging = false;
      canvas.releasePointerCapture?.(e.pointerId);
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);

    let raf = 0;
    let last = 0;
    let t = 0;
    const prims: Prim[] = [];

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (now - last < FRAME_MS) return;
      last = now;
      t += 1;

      const s = state.current;

      if (s.reading) {
        // The disc-read pause: the console genuinely stopped drawing.
        raster.clear(6, 8, 14);
        ctx.putImageData(raster.image, 0, 0);
        return;
      }

      if (!dragging) cam.yaw += 0.004;

      raster.clear(12, 14, 26);
      prims.length = 0;

      const spin = t * 0.03;
      project(floor, { x: 0, y: 0, z: 0 }, 0, cam, raster, prims);
      project(props, { x: 0, y: 0, z: 0 }, 0, cam, raster, prims);

      if (s.loaded === null) {
        project(figure, { x: 0, y: 0, z: 0 }, spin, cam, raster, prims);
      } else {
        // "Booting" a save puts its icon on the plinth, huge.
        const icon = icons[s.loaded % icons.length];
        project(figure, { x: -4.5, y: 0, z: 2 }, spin * 0.4, cam, raster, prims);
        project(
          { ...icon, verts: icon.verts.map((v) => v * 1.8) },
          { x: 1.5, y: 3.4, z: 0 },
          spin * 2,
          cam,
          raster,
          prims,
        );
      }

      draw(raster, prims, tex, 9, 19, s.corrupt ? [90, 10, 30] : [12, 14, 26]);

      if (s.corrupt) {
        // Corrupted VRAM: whole scanlines fetched from the wrong address.
        const d = raster.image.data;
        for (let i = 0; i < 26; i++) {
          const y = (Math.random() * H) | 0;
          const shift = ((Math.random() * 60) | 0) * 4;
          const row = y * W * 4;
          for (let x = 0; x < W * 4; x += 4) {
            const src = row + ((x + shift) % (W * 4));
            d[row + x] = d[src] ^ 0x3c;
            d[row + x + 1] = d[src + 1];
            d[row + x + 2] = d[src + 2] ^ 0x18;
          }
        }
      }

      ctx.putImageData(raster.image, 0, 0);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className={styles.viewport}
      style={{ width, height, imageRendering: "pixelated", touchAction: "none" }}
    />
  );
}
