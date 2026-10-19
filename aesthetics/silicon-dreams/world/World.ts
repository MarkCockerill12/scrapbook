import * as THREE from "three";
import { Avatar } from "./avatar";
import { AMBIENT, type WorldId } from "./chat";
import { KIND_LINES } from "./models";
import { makeKit, type FrameFn } from "./kit";
import { sky, surface, type TexName } from "./textures";
import { WORLDS, type WorldDef } from "./worlds";

/**
 * The chat client's 3D view. Rasterised the way the period did it: Gouraud (Lambert)
 * lighting, nearest-filtered textures, no anti-aliasing, a small framebuffer the page
 * scales up with hard pixels.
 *
 * Loading a world rebuilds the scene and then lets it "download": every surface starts
 * as a flat swatch of its texture's average colour and snaps to the real texture at a
 * random moment in the next couple of seconds.
 *
 * The camera flies: WASD across, Space up, Shift down, drag to look, the wheel to push
 * forward. The named viewpoints are presets it glides to. It is kept inside each world's
 * bounds, and nothing else stops it — 1996 clients let you fly through walls too.
 */

export interface ChatLine {
  name: string;
  text: string;
}

interface Pending {
  mat: THREE.MeshLambertMaterial;
  tex: TexName;
  repeat: number;
  tint: number;
  at: number;
  asked?: boolean;
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export class World {
  private gl: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 400);
  private root = new THREE.Group();
  private avatars: Avatar[] = [];
  private frameFns: FrameFn[] = [];
  private pending: Pending[] = [];
  private hidden: { o: THREE.Object3D; at: number }[] = [];
  private nextChat = 0;
  private raycaster = new THREE.Raycaster();
  private fly = { pos: new THREE.Vector3(), yaw: 0, pitch: 0 };
  private glide: { from: { pos: THREE.Vector3; yaw: number; pitch: number }; to: { pos: THREE.Vector3; yaw: number; pitch: number }; t0: number } | null = null;
  private viewI = 0;
  /** Held movement keys (KeyboardEvent.code), kept up to date by the page. */
  readonly keys = new Set<string>();
  def: WorldDef = WORLDS.hub;
  /** Lines said since the page last asked. */
  readonly said: ChatLine[] = [];
  /** 0..1, how much of the world has arrived. */
  loaded = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.gl = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
    this.gl.setPixelRatio(1);
    this.gl.outputColorSpace = THREE.SRGBColorSpace;
    this.scene.add(this.root);
  }

  get viewIndex(): number {
    return this.viewI;
  }

  /** A viewpoint as the camera's own terms: position, heading, pitch. */
  private pose(i: number) {
    const v = this.def.views[i];
    const pos = new THREE.Vector3(...v.pos);
    const d = new THREE.Vector3(...v.tgt).sub(pos);
    return { pos, yaw: Math.atan2(-d.x, -d.z), pitch: Math.atan2(d.y, Math.hypot(d.x, d.z)) };
  }

  load(id: Exclude<WorldId, "gallery">, now: number): void {
    this.clear();
    const def = WORLDS[id];
    this.def = def;
    this.scene.background = new THREE.Color(def.background);
    const l = def.light;
    this.root.add(new THREE.HemisphereLight(l.sky, l.ground, 1.6));
    const sun = new THREE.DirectionalLight(l.sun, 1.8);
    sun.position.set(...l.dir);
    this.root.add(sun);

    sky(def.sky).then((t) => {
      if (this.def !== def) return;
      // Two mirrored copies round the horizon, seams at the sides; tall enough that its
      // top edge is never in view.
      const tex = t.clone();
      tex.repeat.set(2, 1);
      tex.needsUpdate = true;
      const cyl = new THREE.Mesh(
        new THREE.CylinderGeometry(150, 150, 200, 24, 1, true),
        new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, color: def.skyTint ?? 0xffffff, fog: false }),
      );
      cyl.position.y = 70;
      cyl.rotation.y = Math.PI / 2;
      this.root.add(cyl);
      this.reveal(cyl, now + 200);
      // windows onto the outside show the same sky
      this.root.traverse((o) => {
        if (o instanceof THREE.Mesh && o.userData.skyWindow) {
          const m = o.material as THREE.MeshLambertMaterial;
          m.map = t;
          m.emissive.set(0xffffff);
          m.emissiveMap = t;
          m.needsUpdate = true;
        }
      });
    });

    def.build(
      makeKit({
        group: this.root,
        now,
        skin: (tex, color, repeat) => this.skin(tex, color, repeat ?? 1, now),
        reveal: (o, at) => this.reveal(o, at),
        onFrame: (fn) => this.frameFns.push(fn),
        skyOf: (to) => (to === "gallery" ? 2 : WORLDS[to].sky),
      }),
    );
    for (const spec of def.avatars) {
      const a = new Avatar(spec, (tex, color, repeat) => this.skin(tex, color, repeat ?? 1, now));
      this.avatars.push(a);
      this.root.add(a.group);
      this.reveal(a.group, now + 600 + Math.random() * 1600);
    }
    this.nextChat = now + 2500;
    const start = this.pose(0);
    this.fly = { pos: start.pos, yaw: start.yaw, pitch: start.pitch };
    this.glide = null;
    this.viewI = 0;
  }

  /** Glide to one of the world's set viewpoints. */
  setView(i: number, now: number): void {
    if (!this.def.views[i]) return;
    const f = this.fly;
    const to = this.pose(i);
    // the short way round
    to.yaw = f.yaw + Math.atan2(Math.sin(to.yaw - f.yaw), Math.cos(to.yaw - f.yaw));
    this.glide = { from: { pos: f.pos.clone(), yaw: f.yaw, pitch: f.pitch }, to, t0: now };
    this.viewI = i;
  }

  /** Drag to look, in canvas pixels. */
  turn(dx: number, dy: number): void {
    this.glide = null;
    this.fly.yaw -= dx * 0.0045;
    this.fly.pitch = Math.max(-1.45, Math.min(1.45, this.fly.pitch - dy * 0.0045));
  }

  /** The wheel pushes the camera along where it is looking. */
  dolly(dy: number): void {
    this.glide = null;
    const f = this.fly;
    const fw = new THREE.Vector3(-Math.sin(f.yaw) * Math.cos(f.pitch), Math.sin(f.pitch), -Math.cos(f.yaw) * Math.cos(f.pitch));
    f.pos.addScaledVector(fw, -dy * 0.012);
    this.clamp();
  }

  private clamp(): void {
    const b = this.def.bounds ?? { min: [-70, 0.4, -70], max: [70, 45, 70] };
    const p = this.fly.pos;
    p.set(Math.min(b.max[0], Math.max(b.min[0], p.x)), Math.min(b.max[1], Math.max(b.min[1], p.y)), Math.min(b.max[2], Math.max(b.min[2], p.z)));
  }

  frame(now: number, dt: number, w: number, h: number, aspect: number): void {
    // downloads landing
    let done = 0;
    for (const p of this.pending) {
      if (now >= p.at && !p.asked) {
        p.asked = true;
        surface(p.tex).then((s) => {
          const t = s.texture.clone();
          t.repeat.set(p.repeat, p.repeat);
          t.needsUpdate = true;
          p.mat.map = t;
          p.mat.color.set(p.tint);
          p.mat.needsUpdate = true;
        });
      }
      if (p.mat.map) done++;
    }
    for (const hd of this.hidden) if (now >= hd.at) hd.o.visible = true;
    this.loaded = this.pending.length ? done / this.pending.length : 1;

    for (const fn of this.frameFns) fn(now, dt, this.camera);
    for (const a of this.avatars) a.update(dt, now);

    // someone says something
    if (now > this.nextChat && this.avatars.length && this.loaded > 0.6) {
      this.nextChat = now + 3500 + Math.random() * 6000;
      const a = this.avatars[Math.floor(Math.random() * this.avatars.length)];
      const own = KIND_LINES[a.kind];
      const lines = own && Math.random() < 0.65 ? own : AMBIENT[this.def.id];
      this.speak(a, lines[Math.floor(Math.random() * lines.length)], now);
      if (Math.random() < 0.3) a.wave(now);
      else if (Math.random() < 0.15) a.jump(now);
    }

    // where the camera is
    const f = this.fly;
    if (this.glide) {
      const g = this.glide;
      const k = Math.min(1, (now - g.t0) / 1400);
      const e = ease(k);
      f.pos.lerpVectors(g.from.pos, g.to.pos, e);
      f.yaw = g.from.yaw + (g.to.yaw - g.from.yaw) * e;
      f.pitch = g.from.pitch + (g.to.pitch - g.from.pitch) * e;
      if (k >= 1) this.glide = null;
    }
    const ks = this.keys;
    const ax = (ks.has("KeyD") ? 1 : 0) - (ks.has("KeyA") ? 1 : 0);
    const az = (ks.has("KeyW") ? 1 : 0) - (ks.has("KeyS") ? 1 : 0);
    const ay = (ks.has("Space") ? 1 : 0) - (ks.has("ShiftLeft") || ks.has("ShiftRight") ? 1 : 0);
    if (ax || ay || az) {
      this.glide = null;
      const speed = (this.def.flySpeed ?? 7) * dt;
      // W goes where you are looking, including up and down; A/D strafe flat
      const fw = new THREE.Vector3(-Math.sin(f.yaw) * Math.cos(f.pitch), Math.sin(f.pitch), -Math.cos(f.yaw) * Math.cos(f.pitch));
      const rt = new THREE.Vector3(Math.cos(f.yaw), 0, -Math.sin(f.yaw));
      f.pos.addScaledVector(fw, az * speed).addScaledVector(rt, ax * speed);
      f.pos.y += ay * speed;
      this.clamp();
    }
    this.camera.position.copy(f.pos);
    this.camera.rotation.order = "YXZ";
    this.camera.rotation.set(f.pitch, f.yaw, 0);
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();

    const size = this.gl.getSize(new THREE.Vector2());
    if (size.x !== w || size.y !== h) this.gl.setSize(w, h, false);
    this.gl.render(this.scene, this.camera);
  }

  speak(a: Avatar, text: string, now: number): void {
    a.say(text, now);
    this.said.push({ name: a.spec.name, text });
  }

  /** Someone answers the visitor. */
  answer(text: string, now: number): void {
    if (!this.avatars.length) return;
    this.speak(this.avatars[Math.floor(Math.random() * this.avatars.length)], text, now);
  }

  /** What is under a point of the view (0..1 across, 0..1 down). */
  pick(u: number, v: number): { portal?: WorldId; avatar?: Avatar; channel?: string } {
    this.raycaster.setFromCamera(new THREE.Vector2(u * 2 - 1, -(v * 2 - 1)), this.camera);
    for (const hit of this.raycaster.intersectObjects(this.root.children, true)) {
      if (!hit.object.visible) continue;
      const d = hit.object.userData;
      if (d.portal) return { portal: d.portal as WorldId };
      if (d.avatar) return { avatar: d.avatar as Avatar };
      if (d.channel) return { channel: d.channel as string };
      if (hit.object instanceof THREE.Mesh && !(hit.object.material as THREE.Material).transparent) return {};
    }
    return {};
  }

  private reveal(o: THREE.Object3D, at: number): void {
    o.visible = false;
    this.hidden.push({ o, at });
  }

  private skin(tex: TexName | null, color: number, repeat: number, now: number): THREE.MeshLambertMaterial {
    const mat = new THREE.MeshLambertMaterial({ color: tex ? 0x8a8a8a : color });
    if (tex) {
      this.pending.push({ mat, tex, repeat, tint: color, at: now + 500 + Math.random() * 2200 });
      surface(tex).then((s) => {
        if (!mat.map) mat.color.copy(s.flat).multiply(new THREE.Color(color));
      });
    }
    return mat;
  }

  private clear(): void {
    this.root.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) {
          (m as THREE.MeshBasicMaterial).map?.dispose();
          m.dispose();
        }
      }
    });
    this.root.clear();
    this.avatars = [];
    this.frameFns = [];
    this.pending = [];
    this.hidden = [];
  }

  dispose(): void {
    this.clear();
    this.gl.dispose();
  }
}
