import type { RefObject } from "react";
import { Gallery, type GalleryState } from "./gallery";
import { SCREEN, quadAspect, quadMatrix } from "./scene";
import { World } from "./world/World";

/**
 * The frame loop. Two renderers, one on screen at a time:
 *
 *   World    — the chat client's rasteriser (hub, island, café, void)
 *   Gallery  — the ray tracer, for the Render Gallery world
 *
 * and the museum room around them:
 *
 *   off      the monitor is dark
 *   boot     the monitor shows the client connecting, then the world, mapped into the
 *            photographed glass; when connected it dives in by itself
 *   room     (after logging off) the world keeps running on the monitor; click to go back
 *   dive/rise the photo zooms on the monitor while the picture's corners peel away from
 *            the glass to the edges of the page (or back)
 *   world / gallery  full page
 *
 * It owns no React state; the page hands it refs and it writes per-frame things straight
 * to the DOM.
 */

export type Mode = "off" | "boot" | "room" | "dive" | "world" | "gallery" | "rise";

export const CRT_W = 640;
export const CRT_H = 512;
/** The chat client's framebuffer: small, and scaled up with hard pixels. */
const VIEW_W = 800;
const VIEW_H = 450;
export const BOOT_MS = 3600;
export const DIVE_MS = 1700;
const DIVE_SCALE = 2.45;
const FULL: [number, number][] = [
  [0, 0],
  [1600, 0],
  [1600, 900],
  [0, 900],
];
const SCREEN_C: [number, number] = [
  SCREEN.reduce((s, p) => s + p[0], 0) / 4,
  SCREEN.reduce((s, p) => s + p[1], 0) / 4,
];

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const smooth = (a: number, b: number, t: number) => {
  const k = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return k * k * (3 - 2 * k);
};

type Ref<T> = { current: T };

export interface Rig extends GalleryState {
  worldCanvas: RefObject<HTMLCanvasElement | null>;
  galleryCanvas: RefObject<HTMLCanvasElement | null>;
  photo: RefObject<HTMLDivElement | null>;
  glass: RefObject<HTMLDivElement | null>;
  crt: RefObject<HTMLDivElement | null>;
  mode: Ref<Mode>;
  setMode: (m: Mode) => void;
  transition: Ref<number>;
  bootStart: Ref<number>;
  world: Ref<World | null>;
  gallery: Ref<Gallery | null>;
  /** Called every frame with what the world said, for the chat log. */
  onChat: (lines: { name: string; text: string }[]) => void;
}

export function runLoop(rig: Rig, stageScale: number): () => void {
  const wc = rig.worldCanvas.current;
  const gc = rig.galleryCanvas.current;
  if (!wc || !gc) return () => {};
  let world: World;
  let gallery: Gallery;
  try {
    world = new World(wc);
    gallery = new Gallery(gc, stageScale);
  } catch {
    return () => {};
  }
  rig.world.current = world;
  rig.gallery.current = gallery;
  world.load("hub", performance.now());
  // The ray tracer takes a couple of seconds to compile; do it while nobody is waiting.
  const warm = window.setTimeout(() => gallery.warm(), 600);

  let raf = 0;
  let last = performance.now();
  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const m = rig.mode.current;
    if (m === "off") return;

    if (m === "gallery") {
      gallery.frame(rig, now, dt);
      return;
    }

    if (m === "boot" && now - rig.bootStart.current > BOOT_MS) {
      rig.transition.current = now;
      rig.setMode("dive");
    }

    let corners: [number, number][] | null = SCREEN;
    let aspect = quadAspect(SCREEN);
    if (m === "dive" || m === "rise") {
      const raw = Math.min(1, (now - rig.transition.current) / DIVE_MS);
      const p = m === "dive" ? raw : 1 - raw;
      const e = ease(p);
      const s = 1 + (DIVE_SCALE - 1) * e;
      const tx = SCREEN_C[0] + (800 - SCREEN_C[0]) * e - SCREEN_C[0] * s;
      const ty = SCREEN_C[1] + (450 - SCREEN_C[1]) * e - SCREEN_C[1] * s;
      const T = `translate(${tx}px, ${ty}px) scale(${s})`;
      const photo = rig.photo.current;
      const glass = rig.glass.current;
      const crt = rig.crt.current;
      if (photo) photo.style.transform = T;
      const b = smooth(0.25, 1, p);
      if (glass) {
        glass.style.transform = T;
        glass.style.opacity = String(0.5 * (1 - b));
      }
      corners = SCREEN.map(([x, y], i) => [
        x * s + tx + (FULL[i][0] - (x * s + tx)) * b,
        y * s + ty + (FULL[i][1] - (y * s + ty)) * b,
      ]);
      aspect = quadAspect(corners);
      if (crt) {
        crt.style.transform = quadMatrix(CRT_W, CRT_H, corners);
        crt.style.opacity = String(1 - smooth(0, 0.4, p));
      }
      if (raw >= 1) {
        if (m === "dive") rig.setMode("world");
        else {
          rig.setMode("room");
          if (photo) photo.style.transform = "";
          if (glass) {
            glass.style.transform = "";
            glass.style.opacity = "";
          }
          if (crt) crt.style.opacity = "";
        }
      }
    }
    if (m === "world") {
      corners = null;
      aspect = 16 / 9;
    }
    const onGlass = m === "boot" || m === "room";
    const cssW = onGlass ? CRT_W : 1600;
    const cssH = onGlass ? CRT_H : 900;
    wc.style.width = `${cssW}px`;
    wc.style.height = `${cssH}px`;
    wc.style.transform = corners ? quadMatrix(cssW, cssH, corners) : "";

    world.frame(now, dt, onGlass ? CRT_W : VIEW_W, onGlass ? CRT_H : VIEW_H, aspect);
    if (world.said.length) rig.onChat(world.said.splice(0));
  };
  raf = requestAnimationFrame(tick);
  return () => {
    window.clearTimeout(warm);
    cancelAnimationFrame(raf);
    rig.world.current = null;
    rig.gallery.current = null;
    world.dispose();
    gallery.dispose();
  };
}
