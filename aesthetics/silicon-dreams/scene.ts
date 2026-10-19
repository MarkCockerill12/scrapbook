import type { Vec3 } from "./Renderer";

/**
 * Everything the page and the shader must agree on, on the JavaScript side: where the
 * Render Gallery's four pools of light are and where the camera stands at each, and
 * where on the photograph the monitor's glass and power button actually are.
 */

// ---------------------------------------------------------------------------
// The photograph. Jonathan Konrath, "SGI Octane Graphics Workstation with Unix (Iris),
// and SGI CRT monitor", CC BY 2.0 — 3600×2348 after processing. Shown 1600 wide (cover)
// and lifted 60px so the label is in frame and the keyboard runs off the bottom.
// ---------------------------------------------------------------------------
export const PHOTO_W = 1600;
export const PHOTO_H = (1600 * 2348) / 3600;
export const PHOTO_Y = -60;

/** Photo fraction -> canvas px. */
const at = (fx: number, fy: number): [number, number] => [fx * PHOTO_W, fy * PHOTO_H + PHOTO_Y];

/** The CRT's visible glass, measured off the photo at 5‰: TL, TR, BR, BL. */
export const SCREEN: [number, number][] = [at(0.0783, 0.2453), at(0.5483, 0.128), at(0.5783, 0.595), at(0.167, 0.7563)];

export function bbox(q: [number, number][]) {
  const xs = q.map((p) => p[0]);
  const ys = q.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

/** A polygon clip-path for an element laid over the quad's bounding box. */
export function clipOf(q: [number, number][]) {
  const b = bbox(q);
  return `polygon(${q.map(([x, y]) => `${x - b.x}px ${y - b.y}px`).join(",")})`;
}

/** The monitor's power button (the one with the ⏻) and the LED beside it. */
export const POWER = { ...xy(at(0.5297, 0.7213)), w: 36, h: 36 };
export const LED = xy(at(0.512, 0.7325));
function xy([x, y]: [number, number]) {
  return { x, y };
}

// ---------------------------------------------------------------------------
// The four images
// ---------------------------------------------------------------------------
export interface Vista {
  numeral: string;
  name: string;
  year: number;
  paper: string;
  does: string;
  hint: string;
  c: Vec3;
  pos: Vec3;
  tgt: Vec3;
  file: string;
}

export const VISTAS: Vista[] = [
  {
    numeral: "I",
    name: "Whitted",
    year: 1980,
    paper: "An Improved Illumination Model for Shaded Display",
    does: "recursive reflection and refraction",
    hint: "drag to move the light",
    c: [0, 0, 0],
    pos: [0.9, 1.75, 5.9],
    tgt: [0.15, 0.85, 0],
    file: "whitted.rib",
  },
  {
    numeral: "II",
    name: "Blinn",
    year: 1982,
    paper: "A Generalization of Algebraic Surface Drawing",
    does: "blobby implicit surfaces",
    hint: "move through it",
    c: [16, 0, 0],
    pos: [15.2, 2.1, 5.6],
    tgt: [16, 1.3, 0],
    file: "blobby.rib",
  },
  {
    numeral: "III",
    name: "Cook",
    year: 1984,
    paper: "Distributed Ray Tracing",
    does: "soft shadows and motion blur",
    hint: "click the cue ball to break · click the felt to send it there",
    c: [32, 0, 0],
    pos: [32.4, 2.25, 3.55],
    tgt: [32.1, 0.2, -0.15],
    file: "1984.rib",
  },
  {
    numeral: "IV",
    name: "Perlin",
    year: 1985,
    paper: "An Image Synthesizer",
    does: "procedural noise textures",
    hint: "click to change the material",
    c: [48, 0, 0],
    pos: [48.4, 1.95, 5.4],
    tgt: [48.2, 1.0, 0],
    file: "noise.rib",
  },
];

export const MATERIALS = ["marble", "wood", "granite", "bump-mapped"];

// ---------------------------------------------------------------------------
// Camera
// ---------------------------------------------------------------------------
export function rotY(v: Vec3, c: Vec3, a: number): Vec3 {
  const x = v[0] - c[0];
  const z = v[2] - c[2];
  const s = Math.sin(a);
  const k = Math.cos(a);
  return [c[0] + x * k + z * s, v[1], c[2] - x * s + z * k];
}

export function pose(v: number, orbit: number, lift: number): { pos: Vec3; tgt: Vec3 } {
  const s = VISTAS[v];
  const p = rotY(s.pos, s.c, orbit);
  return { pos: [p[0], Math.max(0.35, p[1] + lift), p[2]], tgt: s.tgt };
}

export function lightFor(v: number, angle: number): Vec3 {
  const c = VISTAS[v].c;
  return rotY([c[0] + 2.2, 6, c[2] + 3.2], c, angle);
}

const TAN_FOV = Math.tan((25 * Math.PI) / 180);

/** The shader's camera, mirrored: canvas point -> world ray. */
export function rayAt(
  x: number,
  y: number,
  w: number,
  h: number,
  pos: Vec3,
  tgt: Vec3,
): { o: Vec3; d: Vec3 } {
  const fw = norm(sub(tgt, pos));
  const rt = norm(cross(fw, [0, 1, 0]));
  const up = cross(rt, fw);
  const u = ((x / w) * 2 - 1) * (w / h) * TAN_FOV;
  const v = -((y / h) * 2 - 1) * TAN_FOV;
  return { o: pos, d: norm([fw[0] + rt[0] * u + up[0] * v, fw[1] + rt[1] * u + up[1] * v, fw[2] + rt[2] * u + up[2] * v]) };
}

export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: Vec3): Vec3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

// ---------------------------------------------------------------------------
// CSS perspective mapping: a w×h element onto any four corners (TL, TR, BR, BL).
// Heckbert's square-to-quad, composed with a scale from the element's own size.
// ---------------------------------------------------------------------------
export function quadMatrix(w: number, h: number, q: [number, number][]): string {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
  const dx1 = x1 - x2;
  const dx2 = x3 - x2;
  const dy1 = y1 - y2;
  const dy2 = y3 - y2;
  const sx = x0 - x1 + x2 - x3;
  const sy = y0 - y1 + y2 - y3;
  let g = 0;
  let k = 0;
  if (Math.abs(sx) > 1e-9 || Math.abs(sy) > 1e-9) {
    const den = dx1 * dy2 - dx2 * dy1;
    g = (sx * dy2 - dx2 * sy) / den;
    k = (dx1 * sy - sx * dy1) / den;
  }
  const a = x1 - x0 + g * x1;
  const b = x3 - x0 + k * x3;
  const d = y1 - y0 + g * y1;
  const e = y3 - y0 + k * y3;
  const m = [a / w, d / w, 0, g / w, b / h, e / h, 0, k / h, 0, 0, 1, 0, x0, y0, 0, 1];
  return `matrix3d(${m.map((n) => +n.toFixed(9)).join(",")})`;
}

/** Rough visual aspect of a quad: mean width over mean height. */
export function quadAspect(q: [number, number][]): number {
  const len = (a: [number, number], b: [number, number]) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  return (len(q[0], q[1]) + len(q[3], q[2])) / (len(q[0], q[3]) + len(q[1], q[2]));
}
