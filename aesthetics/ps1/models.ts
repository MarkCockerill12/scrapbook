import type { Mesh } from "./renderer";

/**
 * Geometry, built by hand and kept absurdly cheap.
 *
 * Lighting is BAKED into the face colours at build time from a fixed light
 * direction — which is what PS1 games did, because there was no per-frame lighting
 * to speak of. It also means the rasteriser only ever fills flat colour, so the
 * whole scene costs one multiply per pixel.
 */

const LIGHT = { x: 0.45, y: 0.82, z: -0.35 };

function shade(nx: number, ny: number, nz: number): number {
  const d = nx * LIGHT.x + ny * LIGHT.y + nz * LIGHT.z;
  // Ambient floor of 0.42 — pitch-black faces read as holes at 15-bit colour.
  return 0.42 + Math.max(0, d) * 0.58;
}

export function empty(): Mesh {
  return { verts: [], faces: [], colours: [] };
}

export function merge(...parts: Mesh[]): Mesh {
  const out: Mesh = { verts: [], faces: [], colours: [], uvs: [] };
  let base = 0;
  let anyUv = false;
  for (const p of parts) {
    out.verts.push(...p.verts);
    for (const f of p.faces) out.faces.push(f + base);
    out.colours.push(...p.colours);
    const faceCount = p.faces.length / 3;
    if (p.uvs) {
      out.uvs!.push(...p.uvs);
      anyUv = true;
    } else {
      for (let i = 0; i < faceCount * 6; i++) out.uvs!.push(0);
    }
    base += p.verts.length / 3;
  }
  if (!anyUv) delete out.uvs;
  return out;
}

/** An axis-aligned box. The only primitive this scene actually needs. */
export function box(
  cx: number, cy: number, cz: number,
  sx: number, sy: number, sz: number,
  r: number, g: number, b: number,
): Mesh {
  const hx = sx / 2;
  const hy = sy / 2;
  const hz = sz / 2;
  const v = [
    cx - hx, cy - hy, cz - hz,
    cx + hx, cy - hy, cz - hz,
    cx + hx, cy + hy, cz - hz,
    cx - hx, cy + hy, cz - hz,
    cx - hx, cy - hy, cz + hz,
    cx + hx, cy - hy, cz + hz,
    cx + hx, cy + hy, cz + hz,
    cx - hx, cy + hy, cz + hz,
  ];

  // [indices..., normal]
  const quads: [number, number, number, number, number, number, number][] = [
    [0, 3, 2, 1, 0, 0, -1], // back
    [4, 5, 6, 7, 0, 0, 1], // front
    [0, 4, 7, 3, -1, 0, 0], // left
    [1, 2, 6, 5, 1, 0, 0], // right
    [3, 7, 6, 2, 0, 1, 0], // top
    [0, 1, 5, 4, 0, -1, 0], // bottom
  ];

  const faces: number[] = [];
  const colours: number[] = [];
  for (const [a, bb, c, d, nx, ny, nz] of quads) {
    const s = shade(nx, ny, nz);
    faces.push(a, bb, c, a, c, d);
    for (let i = 0; i < 2; i++) colours.push(r * s, g * s, b * s);
  }
  return { verts: v, faces, colours };
}

/**
 * The floor: one subdivided, textured plane.
 *
 * Subdivision matters. A single huge quad warps so violently under affine mapping
 * that it reads as a bug rather than as the era; the console had the same problem
 * and games solved it exactly this way, by tessellating the ground.
 */
export function ground(half: number, steps: number, y: number): Mesh {
  const verts: number[] = [];
  const faces: number[] = [];
  const colours: number[] = [];
  const uvs: number[] = [];
  const step = (half * 2) / steps;

  for (let i = 0; i <= steps; i++) {
    for (let j = 0; j <= steps; j++) {
      verts.push(-half + j * step, y, -half + i * step);
    }
  }
  const idx = (i: number, j: number) => i * (steps + 1) + j;

  for (let i = 0; i < steps; i++) {
    for (let j = 0; j < steps; j++) {
      const a = idx(i, j);
      const b = idx(i, j + 1);
      const c = idx(i + 1, j + 1);
      const d = idx(i + 1, j);
      // Wound to face UP. The other way round the whole floor is backface-culled
      // and the scene renders over a void, which reads as "the floor didn't load".
      faces.push(a, b, c, a, c, d);
      for (let k = 0; k < 2; k++) colours.push(232, 236, 248);
      const u0 = j / 2;
      const v0 = i / 2;
      const u1 = (j + 1) / 2;
      const v1 = (i + 1) / 2;
      uvs.push(u0, v0, u1, v0, u1, v1);
      uvs.push(u0, v0, u1, v1, u0, v1);
    }
  }
  return { verts, faces, colours, uvs };
}

/** The thing on the memory card: a chunky figure, seven boxes and no apologies. */
export function hero(): Mesh {
  /*
   * Body parts must not INTERSECT. With no z-buffer, overlapping boxes are resolved
   * per-primitive by average depth, so a torso that shares space with the legs draws
   * straight over them and the figure appears to have none. Games of the era were
   * built the same way: parts butt up against each other, they never interpenetrate.
   */
  return merge(
    box(0, 2.95, 0, 1.4, 1.3, 1.3, 216, 178, 140), // head
    box(0, 2.78, 0.7, 0.85, 0.42, 0.16, 90, 60, 40), // visor
    box(0, 1.75, 0, 1.7, 1.3, 1.0, 60, 96, 178), // torso
    box(-1.14, 1.75, 0, 0.56, 1.3, 0.7, 60, 96, 178), // left arm
    box(1.14, 1.75, 0, 0.56, 1.3, 0.7, 60, 96, 178), // right arm
    box(-0.42, 0.55, 0, 0.68, 1.1, 0.8, 48, 52, 74), // left leg
    box(0.42, 0.55, 0, 0.68, 1.1, 0.8, 48, 52, 74), // right leg
  );
}

/** Scenery, so the fog has something to eat. */
export function pillars(): Mesh {
  const parts: Mesh[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.4;
    const rad = 6.4 + (i % 3) * 1.3;
    const h = 3.4 + (i % 4) * 1.8;
    parts.push(
      box(
        Math.cos(a) * rad, h / 2, Math.sin(a) * rad,
        1.8, h, 1.8,
        120 - (i % 3) * 18, 116 - (i % 3) * 14, 132,
      ),
    );
  }
  return merge(...parts);
}

/** Save-block icons. Small, spinning, and each one obviously a different game. */
export function saveIcon(kind: number): Mesh {
  if (kind === 0) {
    return merge(
      box(0, 0, 0, 1.6, 1.6, 1.6, 210, 66, 66),
      box(0, 1.0, 0, 0.7, 0.6, 0.7, 240, 200, 90),
    );
  }
  if (kind === 1) {
    return merge(
      box(0, -0.5, 0, 2.0, 0.5, 2.0, 70, 150, 90),
      box(0, 0.4, 0, 1.0, 1.4, 1.0, 200, 210, 230),
    );
  }
  return merge(
    box(0, 0, 0, 1.2, 2.2, 1.2, 150, 110, 200),
    box(0, 0, 0, 2.2, 0.6, 0.6, 230, 230, 240),
  );
}
