import * as THREE from "three";
import { build, type Kind, type Model } from "./models";
import { textTexture, type TexName } from "./textures";

/**
 * The other people in the world (and the fish, and the duck). A model from models.ts
 * on a group that wanders, waddles, slides, floats or swims in circles; a name tag over
 * it and speech in a bubble above that, both drawn at a fixed size on screen the way
 * chat clients did.
 */

export interface AvatarSpec {
  name: string;
  kind?: Kind;
  shirt: TexName;
  tint: number;
  skin?: number;
  hair?: number;
  /** Where it hangs about (x, z) and how far it wanders (or the radius it circles). 0 = stays put. */
  home: [number, number];
  roam: number;
  /** Floor height under it, or flying height for swimmers. */
  y?: number;
  sit?: boolean;
  /** Facing, radians, for ones that stay put. */
  face?: number;
}

/** Callback the world gives each avatar for a material that will get its texture later. */
export type Skin = (tex: TexName | null, color: number, repeat?: number) => THREE.MeshLambertMaterial;

const SPEED = { walk: 0.85, waddle: 0.5, slide: 0.6, float: 0.5, circle: 0 };

function wrap(text: string, n = 18): string[] {
  const out: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    if ((line + " " + word).trim().length > n) {
      out.push(line.trim());
      line = word;
    } else line += " " + word;
  }
  if (line.trim()) out.push(line.trim());
  return out.slice(0, 3);
}

export class Avatar {
  readonly spec: AvatarSpec;
  readonly kind: Kind;
  readonly group = new THREE.Group();
  private body = new THREE.Group();
  private model: Model;
  private bubble: THREE.Sprite;
  private target: THREE.Vector2;
  private pause = 0;
  private phase = Math.random() * 10;
  private waveUntil = 0;
  private jumpAt = -10;
  private sayUntil = 0;
  private facing: number;
  private turnTo: number | null = null;
  private orbit = Math.random() * Math.PI * 2;

  constructor(spec: AvatarSpec, skin: Skin) {
    this.spec = spec;
    this.kind = spec.kind ?? "person";
    this.facing = spec.face ?? Math.random() * Math.PI * 2;
    this.target = new THREE.Vector2(...spec.home);
    this.group.position.set(spec.home[0], spec.y ?? 0, spec.home[1]);
    this.group.add(this.body);
    this.model = build(this.kind, this.body, { shirt: spec.shirt, tint: spec.tint, skin: spec.skin, hair: spec.hair }, skin);
    const m = this.model;
    if (spec.sit && m.legL && m.legR) {
      this.body.position.y = -0.35;
      m.legL.rotation.x = m.legR.rotation.x = -Math.PI / 2;
    }

    const tag = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: textTexture([spec.name], { w: 128, h: 24, fg: "#ffffff", outline: "#000000", font: "bold 15px Arial, sans-serif" }),
        depthWrite: false,
        sizeAttenuation: false,
      }),
    );
    tag.scale.set(0.2, 0.038, 1);
    tag.position.y = m.tagY - (spec.sit ? 0.35 : 0);
    this.group.add(tag);

    this.bubble = new THREE.Sprite(new THREE.SpriteMaterial({ depthWrite: false, depthTest: false, sizeAttenuation: false }));
    this.bubble.visible = false;
    this.bubble.renderOrder = 10;
    this.bubble.center.set(0.5, 0);
    this.bubble.position.y = m.bubbleY - (spec.sit ? 0.35 : 0);
    this.group.add(this.bubble);

    this.group.traverse((o) => {
      if (!o.userData.noPick) o.userData.avatar = this;
    });
  }

  say(text: string, now: number): void {
    const lines = wrap(text);
    const mat = this.bubble.material;
    mat.map?.dispose();
    mat.map = textTexture(lines, { w: 160, h: 20 * lines.length + 10, bg: "#fffff4", fg: "#101010", font: "bold 14px Arial, sans-serif" });
    mat.needsUpdate = true;
    this.bubble.scale.set(0.2, (0.2 * (20 * lines.length + 10)) / 160, 1);
    this.bubble.visible = true;
    this.sayUntil = now + 2600 + text.length * 70;
  }

  wave(now: number): void {
    this.waveUntil = now + 1700;
  }

  jump(now: number): void {
    this.jumpAt = now;
  }

  /** Turn to look at a point (the visitor) and stop for a while. */
  look(x: number, z: number, now: number): void {
    const p = this.group.position;
    this.turnTo = Math.atan2(x - p.x, z - p.z);
    this.pause = now + 4000;
  }

  update(dt: number, now: number): void {
    const p = this.group.position;
    const s = this.spec;
    const m = this.model;
    for (const sp of m.spinners ?? []) sp.rotation.y += dt * 2.2;
    if (this.bubble.visible && now > this.sayUntil) this.bubble.visible = false;

    if (m.motion === "circle") {
      // round and round its home, nose along the circle
      if (now > this.pause) this.orbit += dt * (0.9 / Math.max(1, s.roam));
      p.x = s.home[0] + Math.cos(this.orbit) * s.roam;
      p.z = s.home[1] + Math.sin(this.orbit) * s.roam;
      p.y = (s.y ?? 2.6) + Math.sin(now / 900 + this.phase) * 0.3;
      const heading = Math.atan2(-Math.sin(this.orbit), Math.cos(this.orbit));
      this.body.rotation.y = now < this.pause && this.turnTo !== null ? this.turnTo : heading;
      if (m.tail) m.tail.rotation.y = Math.sin(now / 140) * 0.5;
      if (m.wings) {
        const flap = Math.sin(now / 90) * 0.7;
        m.wings[0].rotation.z = flap;
        m.wings[1].rotation.z = -flap;
      }
      return;
    }

    let moving = false;
    if (s.roam > 0 && !s.sit && now > this.pause) {
      const dx = this.target.x - p.x;
      const dz = this.target.y - p.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.1) {
        // arrived: stand about for a bit, then pick somewhere new
        this.pause = now + 1500 + Math.random() * 5000;
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * s.roam;
        this.target.set(s.home[0] + Math.cos(a) * r, s.home[1] + Math.sin(a) * r);
        this.turnTo = null;
      } else {
        const step = Math.min(d, dt * SPEED[m.motion]);
        p.x += (dx / d) * step;
        p.z += (dz / d) * step;
        this.turnTo = Math.atan2(dx, dz);
        moving = true;
      }
    }
    if (this.turnTo !== null) {
      const da = Math.atan2(Math.sin(this.turnTo - this.facing), Math.cos(this.turnTo - this.facing));
      this.facing += da * Math.min(1, dt * 6);
    }
    this.body.rotation.y = this.facing;

    const rate = m.motion === "waddle" ? 11 : 8;
    this.phase += dt * (moving ? rate : 0);
    const swing = moving ? Math.sin(this.phase) * (m.motion === "waddle" ? 0.3 : 0.55) : 0;
    if (m.legL && m.legR && !s.sit) {
      m.legL.rotation.x = swing;
      m.legR.rotation.x = -swing;
    }
    this.body.rotation.z = m.motion === "waddle" && moving ? Math.sin(this.phase) * 0.16 : 0;
    this.body.rotation.x = m.motion === "slide" && moving ? 0.1 : 0;
    if (m.tail && m.motion === "waddle") m.tail.rotation.y = Math.sin(now / 200) * 0.3;

    let lift = m.motion === "float" ? Math.sin(now / 700 + this.phase) * 0.15 : moving && m.motion === "walk" ? Math.abs(Math.sin(this.phase)) * 0.04 : 0;
    const jt = (now - this.jumpAt) / 600;
    if (jt >= 0 && jt < 1) lift += Math.sin(jt * Math.PI) * 0.6;
    this.body.position.y = (s.sit ? -0.35 : 0) + lift;

    if (m.armL && m.armR) {
      m.armL.rotation.x = -swing * 0.8;
      if (now < this.waveUntil) {
        m.armR.rotation.x = 0;
        m.armR.rotation.z = 2.6 + Math.sin(now / 90) * 0.35;
      } else {
        m.armR.rotation.z = 0;
        m.armR.rotation.x = swing * 0.8;
      }
    }
  }
}
