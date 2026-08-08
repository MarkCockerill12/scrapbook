"use client";

import { useEffect, useRef } from "react";
import { saveIcon } from "./models";
import { Raster, draw, project, type Camera, type Prim } from "./renderer";

/**
 * The little rotating icon on a save block, rendered by the same software
 * rasteriser as the main viewport at 48x48.
 *
 * The PS1 memory card manager animated these, and the animation is most of why the
 * screen is memorable. Ten frames per second, because that is roughly what the icon
 * animations actually ran at.
 */

const S = 48;
const FRAME_MS = 100;

export function IconCanvas({ kind, size = 54 }: { kind: number; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    canvas.width = S;
    canvas.height = S;

    const raster = new Raster(ctx, S, S);
    const mesh = saveIcon(kind);
    const cam: Camera = {
      yaw: 0.4,
      pitch: 0.3,
      distance: 6.4,
      target: { x: 0, y: 0, z: 0 },
      focal: 42,
    };

    let raf = 0;
    let last = 0;
    let t = 0;
    const prims: Prim[] = [];

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (now - last < FRAME_MS) return;
      last = now;
      t += 1;

      raster.clear(16, 20, 38);
      prims.length = 0;
      project(mesh, { x: 0, y: 0, z: 0 }, t * 0.22, cam, raster, prims);
      draw(raster, prims, null, 8, 14, [16, 20, 38]);
      ctx.putImageData(raster.image, 0, 0);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [kind]);

  return (
    <canvas
      ref={ref}
      style={{ width: size, height: size, imageRendering: "pixelated", display: "block" }}
    />
  );
}
