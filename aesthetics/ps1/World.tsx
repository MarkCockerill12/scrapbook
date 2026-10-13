"use client";

import { useEffect, useRef } from "react";
import { box, ground, hero, merge } from "./models";
import { Raster, draw, project, type Camera, type Mesh, type Prim, type Texture } from "./renderer";

/**
 * The place. No disc to pick, no score, nothing to win — just the thing the console
 * was actually good at: a small town in fog that isn't quite there until you walk at
 * it. Everything the era did by accident is left in on purpose: vertices snapping to
 * the pixel grid, textures swimming, no z-buffer, 320×240, fifteen-bit dither.
 *
 * Tank controls (↑/W forward, ↓/S back, ←→/AD turn). Stand still and the camera lets
 * go of your shoulder and circles the town by itself.
 */

const W = 320;
const H = 240;
const FRAME_MS = 1000 / 30;

type RGB = [number, number, number];

/** The sky the fog fades to. It turns, slowly, through one long evening. */
const SKIES: RGB[] = [
  [142, 150, 168], // overcast afternoon
  [196, 138, 118], // the sun going
  [78, 62, 112], // dusk
  [16, 20, 40], // night
  [92, 108, 138], // first light
];
const SKY_SECONDS = 48;

function tex(a: RGB, b: RGB, size = 64): Texture {
  const data = new Uint8Array(size * size * 3);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 3;
      const t = ((x >> 3) + (y >> 3)) & 1 ? a : b;
      const grit = ((x * 31 + y * 17) % 23) - 11;
      data[i] = Math.max(0, Math.min(255, t[0] + grit));
      data[i + 1] = Math.max(0, Math.min(255, t[1] + grit));
      data[i + 2] = Math.max(0, Math.min(255, t[2] + grit));
    }
  }
  return { size, data };
}

/** A house: walls, a roof slab that overhangs, a door and a lit window. Nothing intersects. */
function house(x: number, z: number, w: number, d: number, h: number, wall: RGB, roof: RGB): Mesh {
  return merge(
    box(x, h / 2, z, w, h, d, ...wall),
    box(x, h + 0.35, z, w + 0.7, 0.7, d + 0.7, ...roof),
    box(x, h + 1.0, z, w * 0.55, 0.6, d * 0.55, roof[0] - 18, roof[1] - 18, roof[2] - 18),
    box(x - w * 0.2, 0.85, z + d / 2 + 0.06, 0.8, 1.7, 0.1, 74, 48, 30),
    box(x + w * 0.22, 1.7, z + d / 2 + 0.06, 0.8, 0.8, 0.1, 255, 214, 120),
  );
}

function tree(x: number, z: number, s: number): Mesh {
  return merge(
    box(x, 1.2 * s, z, 0.5 * s, 2.4 * s, 0.5 * s, 86, 58, 36),
    box(x, 3.2 * s, z, 2.4 * s, 1.6 * s, 2.4 * s, 44, 104, 62),
    box(x, 4.5 * s, z, 1.5 * s, 1.0 * s, 1.5 * s, 56, 124, 70),
  );
}

function lamp(x: number, z: number): Mesh {
  return merge(box(x, 1.6, z, 0.18, 3.2, 0.18, 40, 42, 50), box(x, 3.4, z, 0.5, 0.5, 0.5, 255, 232, 150));
}

export interface Place {
  x: number;
  z: number;
  text: string;
}

/** Things worth walking up to. The page shows `text` in the message window. */
export const PLACES: Place[] = [
  { x: 0, z: 6, text: "A save point. It hums, very quietly.\nYour progress was saved to MEMORY CARD slot 1." },
  { x: -7.5, z: -3, text: "The door is locked.\nSomebody is home. They are not answering." },
  { x: 8, z: 2.5, text: "A shop. The sign says OPEN.\nIt has said OPEN since 1998." },
  { x: -3, z: 11, text: "The water does not move.\nNothing was ever modelled underneath it." },
  { x: 6.5, z: -9, text: "From here you can see where the world stops.\nIt is closer than you would like." },
];

export function World({ width, height, onNear }: { width: number; height: number; onNear: (i: number) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const nearRef = useRef(onNear);
  nearRef.current = onNear;

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    canvas.width = W;
    canvas.height = H;
    const raster = new Raster(ctx, W, H);
    const grass = tex([74, 112, 70], [62, 98, 62]);

    const keys = new Set<string>();
    let lastInput = -1e9;
    const onKey = (e: KeyboardEvent, down: boolean) => {
      const k = e.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(k)) {
        e.preventDefault();
        if (down) keys.add(k);
        else keys.delete(k);
        lastInput = performance.now();
      }
    };
    const kd = (e: KeyboardEvent) => onKey(e, true);
    const ku = (e: KeyboardEvent) => onKey(e, false);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);

    // ------------------------------------------------------------- the town
    const floor = ground(18, 36, 0);
    const town = merge(
      house(-7.5, -6, 4.2, 4, 3, [196, 178, 150], [140, 62, 52]),
      house(8, -1, 4.6, 4.4, 3.4, [170, 176, 190], [64, 86, 128]),
      house(-9.5, 5, 3.6, 3.6, 2.8, [206, 190, 140], [96, 74, 52]),
      house(2.5, -11, 5, 3.6, 3.2, [184, 160, 150], [120, 50, 70]),
      // the path: flat slabs, laid just proud of the grass so they sort above it
      ...Array.from({ length: 9 }, (_, i) => box(Math.sin(i * 0.5) * 1.2, 0.04, -9 + i * 2.2, 2.2, 0.08, 1.9, 150, 138, 116)),
      // the pond that isn't
      // (tessellated — one big quad is dropped whole the moment a corner crosses the near plane)
      ...Array.from({ length: 12 }, (_, i) => box(-6.4 + (i % 4) * 2.25, 0.05, 12 + Math.floor(i / 4) * 1.6, 2.25, 0.1, 1.6, 54 + (i % 2) * 8, 96 + (i % 3) * 5, 132)),
      ...[
        [-13, -11, 1.2], [-4, -14, 1], [10, -12, 1.3], [14, -4, 1], [13, 7, 1.2], [5, 12, 0.9],
        [-13, 11, 1.1], [-14, -1, 1.3], [0, -15.5, 1.1], [15, 13, 1.4], [-8, 14.5, 1],
      ].map(([x, z, s]) => tree(x, z, s)),
      lamp(-2.4, -4),
      lamp(2.6, 2),
      lamp(-2.2, 9),
    );
    const crystal = merge(box(0, 0, 0, 0.9, 0.9, 0.9, 120, 230, 255), box(0, 0.75, 0, 0.45, 0.45, 0.45, 220, 250, 255), box(0, -0.75, 0, 0.45, 0.45, 0.45, 70, 170, 230));
    const plinth = box(0, 0.25, 6, 1.6, 0.5, 1.6, 120, 122, 134);
    const me = merge(hero());
    me.verts = me.verts.map((v) => v * 0.56);
    const neighbour = merge(
      box(0, 1.55, 0, 0.75, 0.7, 0.7, 216, 178, 140),
      box(0, 0.9, 0, 0.95, 0.6, 0.6, 170, 70, 80),
      box(0, 0.3, 0, 0.8, 0.6, 0.55, 60, 54, 70),
    );

    const p = { x: 0, z: -3, h: 0, v: 0 };
    const cam: Camera = { yaw: 0, pitch: 0.26, distance: 7.2, target: { x: 0, y: 1.6, z: 0 }, focal: 250 };
    const prims: Prim[] = [];
    const O = { x: 0, y: 0, z: 0 };
    let raf = 0;
    let last = 0;
    let tick = 0;
    let orbit = 0;
    let near = -1;
    const t0 = performance.now();

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (now - last < FRAME_MS) return;
      last = now;
      tick += 1;

      const up = keys.has("arrowup") || keys.has("w");
      const down = keys.has("arrowdown") || keys.has("s");
      if (keys.has("arrowleft") || keys.has("a")) p.h += 0.06;
      if (keys.has("arrowright") || keys.has("d")) p.h -= 0.06;
      p.v += ((up ? 0.2 : down ? -0.11 : 0) - p.v) * 0.3;
      const nx = p.x - Math.sin(p.h) * p.v;
      const nz = p.z + Math.cos(p.h) * p.v;
      // The world stops. There is fog there instead of a wall, which is worse.
      if (Math.hypot(nx, nz) < 16.5) {
        p.x = nx;
        p.z = nz;
      }

      const idle = now - lastInput > 7000;
      if (idle) {
        orbit += 0.004;
        cam.yaw += (orbit - cam.yaw) * 0.04;
        cam.target = { x: p.x * 0.3, y: 1.8, z: p.z * 0.3 + 1 };
        cam.distance += (13 - cam.distance) * 0.03;
        cam.pitch += (0.34 - cam.pitch) * 0.03;
      } else {
        orbit = -p.h;
        cam.yaw = -p.h;
        cam.target = { x: p.x, y: 1.5, z: p.z };
        cam.distance += (7.2 - cam.distance) * 0.12;
        cam.pitch += (0.24 - cam.pitch) * 0.12;
      }

      // One long evening, on a loop.
      const s = (Math.max(0, now - t0) / 1000 / SKY_SECONDS) % SKIES.length;
      const a = SKIES[Math.floor(s)];
      const b = SKIES[(Math.floor(s) + 1) % SKIES.length];
      const f = s - Math.floor(s);
      const k = f * f * (3 - 2 * f);
      const sky: RGB = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

      raster.clear(sky[0], sky[1], sky[2]);
      prims.length = 0;
      project(floor, O, 0, cam, raster, prims);
      project(town, O, 0, cam, raster, prims);
      project(plinth, O, 0, cam, raster, prims);
      project(crystal, { x: 0, y: 1.9 + Math.sin(tick / 9) * 0.22, z: 6 }, tick * 0.06, cam, raster, prims);
      project(neighbour, { x: 6.2, y: 0, z: 2.2 }, Math.sin(tick / 40) * 0.5 + 2.4, cam, raster, prims);
      project(me, { x: p.x, y: Math.abs(p.v) > 0.03 ? Math.abs(Math.sin(tick / 2.2)) * 0.08 : 0, z: p.z }, p.h, cam, raster, prims);
      draw(raster, prims, grass, 5, 19, sky);
      ctx.putImageData(raster.image, 0, 0);

      if (tick % 5 === 0) {
        let best = -1;
        for (const [i, pl] of PLACES.entries()) if (Math.hypot(pl.x - p.x, pl.z - p.z) < 2.6) best = i;
        if (idle) best = -1;
        if (best !== near) {
          near = best;
          nearRef.current(best);
        }
      }
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }, []);

  return <canvas ref={ref} style={{ width, height, imageRendering: "pixelated", display: "block" }} />;
}
