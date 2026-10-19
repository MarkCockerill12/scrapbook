import * as THREE from "three";
import { COPY, DISPLAY, TRACE, VERT } from "./glsl";

/**
 * The ray tracer's host: one full-screen triangle pair, three passes.
 *
 *   trace   — one new sample per pixel, blended into an accumulation buffer (ping-pong)
 *   display — accumulation -> filmic curve -> canvas, with the scanline reveal
 *   copy    — freezes a finished image as the "front" the next reveal draws over
 *
 * The page decides WHEN to trace (it stops once a still frame has converged); this
 * class only knows how.
 */

export type Vec3 = [number, number, number];

export interface TraceParams {
  camPos: Vec3;
  camTgt: Vec3;
  aspect: number;
  time: number;
  light: Vec3;
  lightR: number;
  active: number;
  ior: number;
  bounces: number;
  balls: Float32Array;
  blob: [number, number, number, number];
  tex: number;
}

const TAN_FOV = Math.tan((25 * Math.PI) / 180);

function target(w: number, h: number): THREE.WebGLRenderTarget {
  return new THREE.WebGLRenderTarget(w, h, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
    stencilBuffer: false,
  });
}

export class Raytracer {
  private gl: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private quad: THREE.Mesh;
  private traceMat: THREE.RawShaderMaterial;
  private displayMat: THREE.RawShaderMaterial;
  private copyMat: THREE.RawShaderMaterial;
  private acc: [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget];
  private front: THREE.WebGLRenderTarget;
  private ping = 0;
  private seed = 1;
  /** Samples in the accumulation buffer since the last reset. */
  passes = 0;
  private warming: Promise<void> | null = null;
  width = 2;
  height = 2;

  constructor(canvas: HTMLCanvasElement) {
    this.gl = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      depth: false,
      stencil: false,
      powerPreference: "high-performance",
    });
    this.gl.autoClear = false;
    this.gl.setPixelRatio(1);
    const mk = (fragmentShader: string, uniforms: Record<string, THREE.IUniform>) =>
      new THREE.RawShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: VERT,
        fragmentShader,
        uniforms,
        depthTest: false,
        depthWrite: false,
      });
    this.traceMat = mk(TRACE, {
      uRes: { value: new THREE.Vector2() },
      uCamPos: { value: new THREE.Vector3() },
      uCamTgt: { value: new THREE.Vector3() },
      uTanFov: { value: TAN_FOV },
      uAspect: { value: 16 / 9 },
      uJitter: { value: new THREE.Vector2() },
      uSeed: { value: 1 },
      uTime: { value: 0 },
      uLight: { value: new THREE.Vector3() },
      uLightR: { value: 0.5 },
      uActive: { value: 0 },
      uIor: { value: 1.5 },
      uBounces: { value: 4 },
      uBalls: { value: Array.from({ length: 7 }, () => new THREE.Vector3(0, -10, 0)) },
      uBlob: { value: new THREE.Vector4() },
      uTex: { value: 0 },
      uStoch: { value: 0 },
      uBlock: { value: 1 },
      uAlpha: { value: 1 },
      uPrev: { value: null },
      uZero: { value: 0 },
    });
    this.displayMat = mk(DISPLAY, {
      uAcc: { value: null },
      uFront: { value: null },
      uOut: { value: new THREE.Vector2() },
      uReveal: { value: -1 },
      uExposure: { value: 1.25 },
    });
    this.copyMat = mk(COPY, { uSrc: { value: null }, uOut: { value: new THREE.Vector2() } });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.traceMat);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
    this.acc = [target(2, 2), target(2, 2)];
    this.front = target(2, 2);
  }

  /** Resolves once every program is compiled — off the main thread where the driver allows. */
  warm(): Promise<void> {
    return (this.warming ??= this.precompile());
  }

  /**
   * The trace shader takes seconds to compile through ANGLE's HLSL path. Done lazily it
   * would freeze the page on the first frame; done here, with KHR_parallel_shader_compile
   * behind compileAsync, it happens while the visitor is still looking at the room.
   */
  private async precompile(): Promise<void> {
    for (const mat of [this.traceMat, this.displayMat, this.copyMat]) {
      if (this.disposed) return;
      this.quad.material = mat;
      await this.gl.compileAsync(this.scene, this.cam);
    }
    this.quad.material = this.traceMat;
  }

  resize(w: number, h: number): void {
    w = Math.max(2, Math.round(w));
    h = Math.max(2, Math.round(h));
    if (w === this.width && h === this.height) return;
    this.width = w;
    this.height = h;
    this.gl.setSize(w, h, false);
    for (const t of [...this.acc, this.front]) t.setSize(w, h);
    this.clearFront();
    this.reset();
  }

  reset(): void {
    this.passes = 0;
  }

  /**
   * One sample. `alphaFloor` > 0 turns the running average into a moving one, for
   * scenes that are themselves moving: the blur it leaves is motion blur.
   */
  trace(p: TraceParams, opts: { block?: number; alphaFloor?: number } = {}): void {
    const u = this.traceMat.uniforms;
    const first = this.passes === 0;
    const block = opts.block ?? 1;
    u.uRes.value.set(this.width, this.height);
    u.uCamPos.value.set(...p.camPos);
    u.uCamTgt.value.set(...p.camTgt);
    u.uAspect.value = p.aspect;
    u.uTime.value = p.time;
    u.uLight.value.set(...p.light);
    u.uLightR.value = p.lightR;
    u.uActive.value = p.active;
    u.uIor.value = p.ior;
    u.uBounces.value = p.bounces;
    const balls = u.uBalls.value as THREE.Vector3[];
    for (let i = 0; i < 7; i++) balls[i].set(p.balls[i * 3], p.balls[i * 3 + 1], p.balls[i * 3 + 2]);
    u.uBlob.value.set(...p.blob);
    u.uTex.value = p.tex;
    // The first pass of a new view is clean (no jitter, no coin-flips), so a moving
    // camera reads as a crisp preview rather than as noise.
    u.uStoch.value = first ? 0 : 1;
    u.uJitter.value.set(first ? 0 : Math.random() - 0.5, first ? 0 : Math.random() - 0.5);
    u.uSeed.value = (this.seed = (this.seed * 16807) % 2147483647);
    u.uBlock.value = block;
    u.uAlpha.value = first ? 1 : Math.max(1 / (this.passes + 1), opts.alphaFloor ?? 0);
    const read = this.acc[this.ping];
    const write = this.acc[1 - this.ping];
    u.uPrev.value = read.texture;
    this.draw(this.traceMat, write);
    this.ping = 1 - this.ping;
    this.passes = block > 1 ? 0 : this.passes + 1;
  }

  /** `reveal` in 0..1 is how far down the scanline has got; negative = no reveal. */
  display(reveal = -1): void {
    const u = this.displayMat.uniforms;
    u.uAcc.value = this.acc[this.ping].texture;
    u.uFront.value = this.front.texture;
    u.uOut.value.set(this.width, this.height);
    u.uReveal.value = reveal;
    this.draw(this.displayMat, null);
  }

  /** Keep what is on screen as the image the next reveal writes over. */
  commitFront(): void {
    this.copyMat.uniforms.uSrc.value = this.acc[this.ping].texture;
    this.copyMat.uniforms.uOut.value.set(this.width, this.height);
    this.draw(this.copyMat, this.front);
  }

  private clearFront(): void {
    this.gl.setRenderTarget(this.front);
    this.gl.setClearColor(0x000000, 1);
    this.gl.clear(true, false, false);
    this.gl.setRenderTarget(null);
  }

  private draw(mat: THREE.Material, to: THREE.WebGLRenderTarget | null): void {
    this.quad.material = mat;
    this.gl.setRenderTarget(to);
    this.gl.render(this.scene, this.cam);
    this.gl.setRenderTarget(null);
  }

  private disposed = false;

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    // three polls a compiling program on a timer; pulling the context out from under
    // that poll throws, so a page left mid-compile waits for the compile to land first.
    if (this.warming) void this.warming.finally(() => this.release());
    else this.release();
  }

  private release(): void {
    for (const t of [...this.acc, this.front]) t.dispose();
    this.traceMat.dispose();
    this.displayMat.dispose();
    this.copyMat.dispose();
    this.quad.geometry.dispose();
    this.gl.dispose();
  }
}
