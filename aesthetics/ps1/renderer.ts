/**
 * A PlayStation 1 software rasteriser, in about two hundred lines.
 *
 * WHY NOT WEBGL: every characteristic of the PS1 look is a *rendering defect*, and
 * modern GPUs are built to not have them. Faking them in shaders means undoing
 * correct behaviour. Writing the rasteriser gets them for free, in the same way the
 * hardware did:
 *
 *   - VERTEX SNAPPING. The GTE worked in fixed point with no subpixel precision, so
 *     projected vertices land on integer pixels. Nearby geometry visibly *swims* as
 *     the camera moves. This is the single most recognisable artefact.
 *   - AFFINE TEXTURE MAPPING. There was no perspective divide per pixel, so UVs are
 *     interpolated linearly in screen space and textures warp across a triangle. On
 *     large ground polygons it is unmistakable.
 *   - NO Z-BUFFER. Ordering was per-primitive, sorted into an ordering table by
 *     average depth. Intersecting geometry pops. We sort back-to-front and accept it.
 *   - 15-BIT COLOUR + ORDERED DITHER. 5 bits per channel, with a 4x4 Bayer dither to
 *     hide the banding, which is why PS1 gradients have that fine crosshatch.
 *   - 320x240, THEN SCALED. Everything above only reads correctly at 240p.
 *
 * Triangles are rasterised by edge function over a bounding box, which makes both
 * the flat and the affine-textured path the same loop.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Mesh {
  /** Flat list, 3 numbers per vertex. */
  verts: number[];
  /** Flat list, 3 indices per face. */
  faces: number[];
  /** One rgb triple per face. */
  colours: number[];
  /** Optional flat list, 6 numbers per face (u,v per vertex), 0..1. */
  uvs?: number[];
}

export interface Texture {
  size: number;
  /** size*size*3 bytes. */
  data: Uint8Array;
}

const BAYER = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5,
];

/** A procedural texture. Kept tiny on purpose — the PS1's VRAM was 1MB. */
export function checkerTexture(size = 64): Texture {
  const data = new Uint8Array(size * size * 3);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 3;
      const tile = ((x >> 3) + (y >> 3)) & 1;
      const grit = ((x * 31 + y * 17) % 23) - 11;
      const base = tile ? 118 : 74;
      data[i] = Math.max(0, base + grit - 8);
      data[i + 1] = Math.max(0, base + grit - 2);
      data[i + 2] = Math.max(0, base + grit + 12);
    }
  }
  return { size, data };
}

export class Raster {
  readonly w: number;
  readonly h: number;
  readonly image: ImageData;
  private buf: Uint8ClampedArray;

  constructor(ctx: CanvasRenderingContext2D, w: number, h: number) {
    this.w = w;
    this.h = h;
    this.image = ctx.createImageData(w, h);
    this.buf = this.image.data;
  }

  clear(r: number, g: number, b: number): void {
    const { buf } = this;
    for (let i = 0; i < buf.length; i += 4) {
      buf[i] = r;
      buf[i + 1] = g;
      buf[i + 2] = b;
      buf[i + 3] = 255;
    }
  }

  /**
   * One triangle. Screen coords are expected pre-snapped to integers.
   *
   * `tex` present -> affine UV interpolation (the warp). Absent -> flat fill.
   * `shade` multiplies the colour; `fog` blends toward the fog colour at the end.
   */
  tri(
    x0: number, y0: number,
    x1: number, y1: number,
    x2: number, y2: number,
    r: number, g: number, b: number,
    opts?: {
      tex?: Texture;
      u0?: number; v0?: number;
      u1?: number; v1?: number;
      u2?: number; v2?: number;
      fog?: number;
      fogColour?: [number, number, number];
    },
  ): void {
    const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
    if (area === 0) return;
    // Backface culling by winding, exactly as the console did.
    if (area > 0) return;

    const minX = Math.max(0, Math.min(x0, x1, x2) | 0);
    const maxX = Math.min(this.w - 1, Math.max(x0, x1, x2) | 0);
    const minY = Math.max(0, Math.min(y0, y1, y2) | 0);
    const maxY = Math.min(this.h - 1, Math.max(y0, y1, y2) | 0);
    if (minX > maxX || minY > maxY) return;

    const inv = 1 / area;
    const tex = opts?.tex;
    const fog = opts?.fog ?? 0;
    const fc = opts?.fogColour ?? [0, 0, 0];
    const { buf, w } = this;

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const px = x + 0.5;
        const py = y + 0.5;
        const w0 = ((x2 - x1) * (py - y1) - (y2 - y1) * (px - x1)) * inv;
        const w1 = ((x0 - x2) * (py - y2) - (y0 - y2) * (px - x2)) * inv;
        const w2 = 1 - w0 - w1;
        if (w0 < 0 || w1 < 0 || w2 < 0) continue;

        let cr = r;
        let cg = g;
        let cb = b;

        if (tex) {
          // Linear in SCREEN space — no perspective divide. This is the warp.
          const u = w0 * (opts!.u0 ?? 0) + w1 * (opts!.u1 ?? 0) + w2 * (opts!.u2 ?? 0);
          const v = w0 * (opts!.v0 ?? 0) + w1 * (opts!.v1 ?? 0) + w2 * (opts!.v2 ?? 0);
          const tx = ((u * tex.size) | 0) & (tex.size - 1);
          const ty = ((v * tex.size) | 0) & (tex.size - 1);
          const ti = (ty * tex.size + tx) * 3;
          cr = (tex.data[ti] * r) / 255;
          cg = (tex.data[ti + 1] * g) / 255;
          cb = (tex.data[ti + 2] * b) / 255;
        }

        if (fog > 0) {
          cr += (fc[0] - cr) * fog;
          cg += (fc[1] - cg) * fog;
          cb += (fc[2] - cb) * fog;
        }

        // 4x4 ordered dither, then quantise to 15-bit colour.
        const d = (BAYER[(y & 3) * 4 + (x & 3)] - 7.5) * 0.55;
        const o = (y * w + x) * 4;
        buf[o] = (((cr + d) | 0) & 0xf8) | 4;
        buf[o + 1] = (((cg + d) | 0) & 0xf8) | 4;
        buf[o + 2] = (((cb + d) | 0) & 0xf8) | 4;
        buf[o + 3] = 255;
      }
    }
  }
}

export interface Camera {
  /** Radians. */
  yaw: number;
  pitch: number;
  distance: number;
  /** What the camera orbits. */
  target: Vec3;
  /** Screen-space focal length, in pixels. */
  focal: number;
}

interface Prim {
  sx: [number, number, number];
  sy: [number, number, number];
  depth: number;
  r: number;
  g: number;
  b: number;
  uv?: number[];
}

const NEAR = 0.6;

/**
 * Projects a mesh and appends its triangles to `out`.
 *
 * Anything with a vertex nearer than the near plane is DROPPED rather than clipped —
 * which is what the console did, and why PS1 geometry vanishes when you walk into it.
 */
export function project(
  mesh: Mesh,
  origin: Vec3,
  spin: number,
  cam: Camera,
  raster: Raster,
  out: Prim[],
): void {
  const cy = Math.cos(cam.yaw);
  const sy = Math.sin(cam.yaw);
  const cp = Math.cos(cam.pitch);
  const sp = Math.sin(cam.pitch);
  const cs = Math.cos(spin);
  const ss = Math.sin(spin);

  const n = mesh.verts.length / 3;
  const vx = new Float32Array(n);
  const vy = new Float32Array(n);
  const vz = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    // model spin about Y
    const mx = mesh.verts[i * 3];
    const my = mesh.verts[i * 3 + 1];
    const mz = mesh.verts[i * 3 + 2];
    let x = mx * cs - mz * ss + origin.x;
    const y = my + origin.y;
    let z = mx * ss + mz * cs + origin.z;

    // camera: translate to target, yaw, pitch, push back
    x -= cam.target.x;
    let yy = y - cam.target.y;
    z -= cam.target.z;

    const x1 = x * cy - z * sy;
    const z1 = x * sy + z * cy;
    // Pitch rotates the camera DOWNWARD for positive values. With the signs the
    // other way the camera tilts up and the floor renders above the horizon —
    // which looks like the whole scene is inverted rather than like a sign error.
    const y1 = yy * cp + z1 * sp;
    const z2 = -yy * sp + z1 * cp + cam.distance;
    yy = y1;

    vx[i] = x1;
    vy[i] = yy;
    vz[i] = z2;
  }

  const halfW = raster.w / 2;
  const halfH = raster.h / 2;

  for (let f = 0; f < mesh.faces.length; f += 3) {
    const a = mesh.faces[f];
    const b = mesh.faces[f + 1];
    const c = mesh.faces[f + 2];
    const za = vz[a];
    const zb = vz[b];
    const zc = vz[c];
    if (za < NEAR || zb < NEAR || zc < NEAR) continue;

    // Snap to integers. No subpixel precision — this is the swim.
    const sxa = Math.round(halfW + (vx[a] * cam.focal) / za);
    const sya = Math.round(halfH - (vy[a] * cam.focal) / za);
    const sxb = Math.round(halfW + (vx[b] * cam.focal) / zb);
    const syb = Math.round(halfH - (vy[b] * cam.focal) / zb);
    const sxc = Math.round(halfW + (vx[c] * cam.focal) / zc);
    const syc = Math.round(halfH - (vy[c] * cam.focal) / zc);

    const fi = (f / 3) * 3;
    out.push({
      sx: [sxa, sxb, sxc],
      sy: [sya, syb, syc],
      depth: (za + zb + zc) / 3,
      r: mesh.colours[fi],
      g: mesh.colours[fi + 1],
      b: mesh.colours[fi + 2],
      uv: mesh.uvs ? mesh.uvs.slice((f / 3) * 6, (f / 3) * 6 + 6) : undefined,
    });
  }
}

/** Painter's algorithm — the ordering table, near enough. */
export function draw(
  raster: Raster,
  prims: Prim[],
  tex: Texture | null,
  fogStart: number,
  fogEnd: number,
  fogColour: [number, number, number],
): void {
  prims.sort((p, q) => q.depth - p.depth);
  for (const p of prims) {
    const fog = Math.max(0, Math.min(1, (p.depth - fogStart) / (fogEnd - fogStart)));
    raster.tri(
      p.sx[0], p.sy[0], p.sx[1], p.sy[1], p.sx[2], p.sy[2],
      p.r, p.g, p.b,
      p.uv
        ? {
            tex: tex ?? undefined,
            u0: p.uv[0], v0: p.uv[1],
            u1: p.uv[2], v1: p.uv[3],
            u2: p.uv[4], v2: p.uv[5],
            fog,
            fogColour,
          }
        : { fog, fogColour },
    );
  }
}

export type { Prim };
