import { stepBalls, type Balls } from "./balls";
import { Raytracer, type TraceParams, type Vec3 } from "./Renderer";
import { lerp3, lightFor, pose } from "./scene";
import { clack, thud } from "./sound";

/**
 * The Render Gallery: the one world on the server drawn by a ray tracer instead of the
 * rasteriser. Four pools of light, each a landmark image of 1980s rendering research.
 * Stills accumulate up to STILL_PASSES and then cost nothing; scenes that move (the
 * blobs, rolling balls) run a moving average, which is where their motion blur comes
 * from.
 */

export const STILL_PASSES = 220;

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export interface GalleryState {
  vista: { current: number };
  glide: { current: { from: { pos: Vec3; tgt: Vec3 }; to: number; t0: number; dur: number } | null };
  cam: { current: { pos: Vec3; tgt: Vec3 } };
  simTime: { current: number };
  balls: { current: Balls };
  blob: { current: [number, number, number, number] };
  tex: { current: number };
  /** The Whitted vista's light: angle (radians) and size, dragged by the visitor. */
  light: { current: { angle: number; size: number } };
  pass: { current: HTMLSpanElement | null };
}

export class Gallery {
  readonly rt: Raytracer;
  ready = false;
  private kMax: number;
  private k: number;
  private lastKey = "";
  private frames: number[] = [];
  private statusAt = 0;

  constructor(canvas: HTMLCanvasElement, stageScale: number) {
    this.rt = new Raytracer(canvas);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.kMax = Math.min(1.5, Math.max(0.5, stageScale * dpr));
    this.k = this.kMax;
  }

  warm(): void {
    this.rt.warm().then(
      () => (this.ready = true),
      () => (this.ready = true),
    );
  }

  /** Camera pose for a vista. */
  static pose(v: number) {
    return pose(v, 0, 0);
  }

  frame(s: GalleryState, now: number, dt: number): void {
    if (!this.ready) return;
    const rt = this.rt;
    const w = Math.round(1600 * this.k);
    const h = Math.round(900 * this.k);
    rt.resize(w, h);

    let active = s.vista.current;
    const g = s.glide.current;
    if (g) {
      const k = Math.min(1, (now - g.t0) / g.dur);
      const e = ease(k);
      const to = Gallery.pose(g.to);
      const pos = lerp3(g.from.pos, to.pos, e);
      // a crane move: up and over, not a dolly along the floor
      pos[1] += Math.sin(Math.PI * e) * 1.3;
      s.cam.current = { pos, tgt: lerp3(g.from.tgt, to.tgt, e) };
      active = Math.max(0, Math.min(3, e < 0.5 ? Math.round((g.from.pos[0] + 0.9) / 16) : g.to));
      if (k >= 1) s.glide.current = null;
    } else s.cam.current = Gallery.pose(active);

    const watching = !s.glide.current;
    let ballsMoving = false;
    if (watching && s.vista.current === 1) s.simTime.current += dt;
    if (watching && s.vista.current === 2) {
      const hit = stepBalls(s.balls.current, dt);
      if (hit.clack > 0.25) clack(hit.clack);
      if (hit.thud > 0.3) thud(hit.thud);
      ballsMoving = hit.moving;
    }

    const lt = s.light.current;
    const params: TraceParams = {
      camPos: s.cam.current.pos,
      camTgt: s.cam.current.tgt,
      aspect: 16 / 9,
      time: s.simTime.current,
      light: lightFor(active, active === 0 ? lt.angle : 0),
      lightR: active === 0 ? lt.size : 0.45,
      active,
      ior: 1.5,
      bounces: 4,
      balls: s.balls.current.p,
      blob: s.blob.current,
      tex: s.tex.current,
    };

    const live = (watching && s.vista.current === 1) || ballsMoving;
    const key = JSON.stringify([
      params.camPos,
      params.camTgt,
      live ? 0 : params.time,
      params.light,
      params.lightR,
      params.tex,
      live ? 0 : Array.from(params.balls).map((v) => +v.toFixed(3)),
      live ? 0 : params.blob,
    ]);
    const changed = key !== this.lastKey;
    this.lastKey = key;

    if (changed && !live) rt.reset();
    if (live || rt.passes < STILL_PASSES) {
      rt.trace(params, { alphaFloor: live ? 0.3 : 0 });
      rt.display(-1);
      // Resolution only adapts while the picture is moving; a still just converges
      // more slowly on a slow machine, and every resize would throw its passes away.
      if (live || changed) this.frames.push(dt);
      if (this.frames.length >= 50) {
        const avg = this.frames.reduce((a, b) => a + b, 0) / this.frames.length;
        this.frames = [];
        if (avg > 0.028 && this.k > 0.4) this.k = Math.max(0.4, this.k * 0.85);
        else if (avg < 0.0175 && this.k < this.kMax) this.k = Math.min(this.kMax, this.k * 1.08);
      }
    } else this.frames = [];

    if (now > this.statusAt && s.pass.current) {
      this.statusAt = now + 120;
      s.pass.current.textContent = live
        ? `live · ${rt.width}×${rt.height}`
        : `pass ${rt.passes}/${STILL_PASSES} · ${rt.width}×${rt.height}`;
    }
  }

  dispose(): void {
    this.rt.dispose();
  }
}


