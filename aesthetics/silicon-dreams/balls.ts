import type { Vec3 } from "./Renderer";

/**
 * Vista III's table: a tiny 2D simulation on the felt, in world units, matching the
 * felt and rails in the shader (32, 0.12, 0; 2.3 × 1.35 inside the cushions).
 */

export const BALL_R = 0.13;
const BALL_Y = 0.12 + BALL_R;
const TX = 32;
const HX = 2.3 - BALL_R;
const HZ = 1.35 - BALL_R;

export interface Balls {
  p: Float32Array; // x,y,z ×7, world
  v: Float32Array; // vx,vz ×7
}

export function rack(): Balls {
  const p = new Float32Array(21);
  const v = new Float32Array(14);
  const spots: [number, number][] = [
    [-1.3, 0],
    [0.7, 0],
    [0.7 + 0.226, -0.131],
    [0.7 + 0.226, 0.131],
    [0.7 + 0.452, -0.262],
    [0.7 + 0.452, 0],
    [0.7 + 0.452, 0.262],
  ];
  spots.forEach(([x, z], i) => {
    p[i * 3] = TX + x;
    p[i * 3 + 1] = BALL_Y;
    p[i * 3 + 2] = z;
  });
  return { p, v };
}

/** Advances the table. Returns the hardest ball-ball and cushion impacts this step. */
export function stepBalls(b: Balls, dt: number): { clack: number; thud: number; moving: boolean } {
  let clack = 0;
  let thud = 0;
  let moving = false;
  const sub = 4;
  const h = dt / sub;
  for (let s = 0; s < sub; s++) {
    for (let i = 0; i < 7; i++) {
      let vx = b.v[i * 2];
      let vz = b.v[i * 2 + 1];
      const sp = Math.hypot(vx, vz);
      if (sp < 0.02) {
        b.v[i * 2] = b.v[i * 2 + 1] = 0;
        continue;
      }
      // rolling resistance: a little proportional, a little constant
      const k = Math.max(0, sp - (0.18 + sp * 0.55) * h) / sp;
      vx *= k;
      vz *= k;
      let x = b.p[i * 3] - TX + vx * h;
      let z = b.p[i * 3 + 2] + vz * h;
      if (x < -HX || x > HX) {
        thud = Math.max(thud, Math.abs(vx));
        x = Math.max(-HX, Math.min(HX, x));
        vx *= -0.78;
      }
      if (z < -HZ || z > HZ) {
        thud = Math.max(thud, Math.abs(vz));
        z = Math.max(-HZ, Math.min(HZ, z));
        vz *= -0.78;
      }
      b.p[i * 3] = TX + x;
      b.p[i * 3 + 2] = z;
      b.v[i * 2] = vx;
      b.v[i * 2 + 1] = vz;
    }
    for (let i = 0; i < 7; i++) {
      for (let j = i + 1; j < 7; j++) {
        const dx = b.p[j * 3] - b.p[i * 3];
        const dz = b.p[j * 3 + 2] - b.p[i * 3 + 2];
        const d = Math.hypot(dx, dz);
        if (d >= BALL_R * 2 || d < 1e-6) continue;
        const nx = dx / d;
        const nz = dz / d;
        const push = (BALL_R * 2 - d) / 2;
        b.p[i * 3] -= nx * push;
        b.p[i * 3 + 2] -= nz * push;
        b.p[j * 3] += nx * push;
        b.p[j * 3 + 2] += nz * push;
        const rel = (b.v[i * 2] - b.v[j * 2]) * nx + (b.v[i * 2 + 1] - b.v[j * 2 + 1]) * nz;
        if (rel <= 0) continue;
        const imp = rel * 0.96;
        b.v[i * 2] -= nx * imp;
        b.v[i * 2 + 1] -= nz * imp;
        b.v[j * 2] += nx * imp;
        b.v[j * 2 + 1] += nz * imp;
        clack = Math.max(clack, rel);
      }
    }
  }
  for (let i = 0; i < 14; i++) if (b.v[i] !== 0) moving = true;
  return { clack, thud, moving };
}

/** A click on the table, as a world ray. Hits a ball if near one, else sends the cue ball. */
export function strike(b: Balls, o: Vec3, d: Vec3): boolean {
  if (d[1] >= 0) return false;
  const t = (BALL_Y - o[1]) / d[1];
  const hx = o[0] + d[0] * t;
  const hz = o[2] + d[2] * t;
  if (Math.abs(hx - TX) > 2.6 || Math.abs(hz) > 1.6) return false;
  let best = -1;
  let bd = 0.32;
  for (let i = 0; i < 7; i++) {
    const dd = Math.hypot(b.p[i * 3] - hx, b.p[i * 3 + 2] - hz);
    if (dd < bd) {
      bd = dd;
      best = i;
    }
  }
  if (best >= 0) {
    // The cue ball is a break: it goes at the pack. Anything else is struck from where
    // you are standing. Either way a little off line.
    let tx = o[0];
    let tz = o[2];
    if (best === 0) {
      tx = tz = 0;
      for (let i = 1; i < 7; i++) {
        tx += b.p[i * 3] / 6;
        tz += b.p[i * 3 + 2] / 6;
      }
      tx = 2 * b.p[0] - tx;
      tz = 2 * b.p[2] - tz;
    }
    let dx = b.p[best * 3] - tx;
    let dz = b.p[best * 3 + 2] - tz;
    const l = Math.hypot(dx, dz) || 1;
    const wob = (Math.random() - 0.5) * (best === 0 ? 0.06 : 0.25);
    const sp = best === 0 ? 4.8 : 3.4;
    dx /= l;
    dz /= l;
    b.v[best * 2] = (dx * Math.cos(wob) - dz * Math.sin(wob)) * sp;
    b.v[best * 2 + 1] = (dx * Math.sin(wob) + dz * Math.cos(wob)) * sp;
    return true;
  }
  const dx = hx - b.p[0];
  const dz = hz - b.p[2];
  const l = Math.hypot(dx, dz) || 1;
  const sp = Math.min(5, Math.max(2.2, l * 1.6));
  b.v[0] = (dx / l) * sp;
  b.v[1] = (dz / l) * sp;
  return true;
}
