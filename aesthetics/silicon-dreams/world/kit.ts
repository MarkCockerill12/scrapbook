import * as THREE from "three";
import { Lensflare, LensflareElement } from "three/examples/jsm/objects/Lensflare.js";
import { MarchingCubes } from "three/examples/jsm/objects/MarchingCubes.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { FontLoader, type Font } from "three/examples/jsm/loaders/FontLoader.js";
import { thumbFor } from "@/lib/thumbs";
import type { Skin } from "./avatar";
import type { WorldId } from "./chat";
import { flareTexture, photo, sky, textTexture, type TexName } from "./textures";

/**
 * The props a world is built from. Everything here is a thing early-CGI worlds were full
 * of: spinning 3D text, morphing blobs, lens flares, floating platonic solids and torus
 * knots, planets hanging in a daytime sky, a globe, an eyeball that watches you. Built
 * from primitives and real photographs (the Earth, the iris, the textures).
 */

type V3 = [number, number, number];
export type FrameFn = (now: number, dt: number, cam: THREE.Camera) => void;

export interface KitContext {
  group: THREE.Group;
  now: number;
  skin: Skin;
  reveal: (o: THREE.Object3D, at: number) => void;
  onFrame: (fn: FrameFn) => void;
  /** Lookup of another world's sky number, for the view through its portal. */
  skyOf: (to: WorldId) => number;
}

let fontP: Promise<Font> | null = null;
function font(): Promise<Font> {
  fontP ??= import("three/examples/fonts/helvetiker_bold.typeface.json").then((m) => new FontLoader().parse(m.default as never));
  return fontP;
}

export function makeKit(k: KitContext) {
  const { group, now, skin, reveal, onFrame } = k;
  const later = (o: THREE.Object3D, from = 0, span = 1400) => reveal(o, now + from + Math.random() * span);

  const mesh = (geo: THREE.BufferGeometry, tex: TexName | null, color = 0xffffff, repeat = 1) => {
    const m = new THREE.Mesh(geo, skin(tex, color, repeat));
    group.add(m);
    later(m);
    return m;
  };
  const at = <T extends THREE.Object3D>(o: T, p: V3): T => {
    o.position.set(...p);
    return o;
  };
  const spin = (o: THREE.Object3D, x: number, y: number, z = 0) =>
    onFrame((_n, dt) => {
      o.rotation.x += x * dt;
      o.rotation.y += y * dt;
      o.rotation.z += z * dt;
    });
  const bob = (o: THREE.Object3D, amp: number, speed: number) => {
    const y = o.position.y;
    const ph = Math.random() * 6;
    onFrame((n) => (o.position.y = y + Math.sin((n / 1000) * speed * Math.PI * 2 + ph) * amp));
  };
  const glossy = (color: number, shininess = 80) => new THREE.MeshPhongMaterial({ color, specular: 0xffffff, shininess });

  const kit = {
    group,
    skin,
    mesh,
    at,
    spin,
    bob,

    sign(lines: string[], p: V3, rotY: number, size: [number, number] = [2.6, 1.2]) {
      const sign = at(new THREE.Group(), p);
      sign.rotation.y = rotY;
      group.add(sign);
      const onGround = p[1] < 0.5;
      const board = new THREE.Mesh(
        new THREE.PlaneGeometry(size[0], size[1]),
        new THREE.MeshLambertMaterial({
          map: textTexture(lines, { w: 192, h: Math.round((192 * size[1]) / size[0]), bg: "#f4ecd0", fg: "#1a1410", font: "bold 15px Arial, sans-serif" }),
        }),
      );
      board.position.set(0, onGround ? 2 : 0, 0.06);
      sign.add(board);
      const back = mesh(new THREE.BoxGeometry(size[0] + 0.12, size[1] + 0.12, 0.1), "planks");
      back.position.set(0, onGround ? 2 : 0, 0);
      sign.add(back);
      if (onGround) {
        for (const s of [-1, 1]) {
          const post = mesh(new THREE.BoxGeometry(0.12, 2, 0.12), "planks");
          post.position.set((s * size[0]) / 2.4, 0.7, -0.05);
          sign.add(post);
        }
      }
      later(board, 400, 1200);
    },

    portal(to: WorldId, label: string, p: V3, rotY: number) {
      const arch = at(new THREE.Group(), p);
      arch.rotation.y = rotY;
      group.add(arch);
      for (const s of [-1.2, 1.2]) {
        const pillar = mesh(new THREE.BoxGeometry(0.35, 3.2, 0.35), "stone");
        pillar.position.set(s, 1.6, 0);
        pillar.userData.portal = to;
        arch.add(pillar);
      }
      const beam = mesh(new THREE.BoxGeometry(2.8, 0.4, 0.4), "stone");
      beam.position.y = 3.3;
      beam.userData.portal = to;
      arch.add(beam);
      const pmat = new THREE.MeshBasicMaterial({ color: to === "gallery" ? 0x9080ff : 0xffffff, side: THREE.DoubleSide });
      sky(k.skyOf(to)).then((t) => {
        const tt = t.clone();
        tt.wrapS = THREE.RepeatWrapping;
        tt.needsUpdate = true;
        pmat.map = tt;
        pmat.needsUpdate = true;
      });
      onFrame((n) => pmat.map && (pmat.map.offset.x = (n / 9000) % 1));
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(2.05, 3.1), pmat);
      pane.position.y = 1.55;
      pane.userData.portal = to;
      arch.add(pane);
      later(pane, 900, 900);
      const tag = new THREE.Mesh(
        new THREE.PlaneGeometry(2.6, 0.42),
        new THREE.MeshBasicMaterial({ map: textTexture([label], { w: 200, h: 32, bg: "#101830", fg: "#ffe680", font: "bold 18px Arial, sans-serif" }) }),
      );
      tag.position.set(0, 3.82, 0.05);
      tag.userData.portal = to;
      arch.add(tag);
      later(tag, 700, 900);
    },

    tree(x: number, z: number, h = 3.6, y = 0) {
      at(mesh(new THREE.CylinderGeometry(0.14, 0.2, h * 0.4, 6), "planks"), [x, y + h * 0.2, z]);
      for (const [s, yy] of [
        [1, 0.55],
        [0.72, 0.8],
      ])
        at(mesh(new THREE.ConeGeometry(h * 0.32 * s, h * 0.5, 7), "turf", 0xa0c080), [x, y + h * yy, z]);
    },

    /** Blinn's blobby surface, live. `lava` makes the balls rise and sink like a lamp's. */
    blob(p: V3, scale: number, color: number, opts: { balls?: number; lava?: boolean; speed?: number } = {}) {
      const mc = new MarchingCubes(28, glossy(color, 70), false, false, 30000);
      at(mc, p);
      mc.scale.setScalar(scale);
      group.add(mc);
      later(mc, 300, 200);
      const n = opts.balls ?? 5;
      let t = Math.random() * 10;
      onFrame((_n, dt) => {
        t += dt * (opts.speed ?? 0.6);
        mc.reset();
        for (let i = 0; i < n; i++) {
          const q = t + i * 1.7;
          if (opts.lava) mc.addBall(0.5 + Math.sin(q * 0.5 + i) * 0.08, 0.5 + Math.sin(q * (0.35 + i * 0.07)) * 0.32, 0.5 + Math.cos(q * 0.4 + i) * 0.08, 0.5, 12);
          else mc.addBall(0.5 + Math.sin(q * (0.9 + i * 0.13)) * 0.13, 0.5 + Math.cos(q * (0.7 + i * 0.11)) * 0.12, 0.5 + Math.sin(q * 0.8 + i) * 0.13, 1.1, 10);
        }
        if (opts.lava) mc.addPlaneY(2, 12);
        mc.update();
      });
      return mc;
    },

    lavaLamp(p: V3, color = 0xff5a10) {
      at(mesh(new THREE.ConeGeometry(0.32, 0.5, 10), "paint", 0x6070a0), [p[0], p[1] + 0.25, p[2]]).rotation.x = Math.PI;
      at(mesh(new THREE.ConeGeometry(0.2, 0.3, 10), "paint", 0x6070a0), [p[0], p[1] + 1.95, p[2]]);
      const glass = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.3, 1.3, 14, 1, true),
        new THREE.MeshPhongMaterial({ color: 0x9fe0ff, transparent: true, opacity: 0.3, shininess: 120, side: THREE.DoubleSide }),
      );
      at(glass, [p[0], p[1] + 1.15, p[2]]);
      group.add(glass);
      later(glass, 500, 600);
      kit.blob([p[0], p[1] + 1.15, p[2]], 0.62, color, { balls: 4, lava: true, speed: 0.9 });
      const glow = new THREE.PointLight(color, 3, 4);
      glow.position.set(p[0], p[1] + 1.2, p[2]);
      group.add(glow);
    },

    /** Spinning extruded 3D text, the most 1995 thing there is. */
    logo(text: string, p: V3, size: number, color = 0xffc030) {
      const holder = at(new THREE.Group(), p);
      group.add(holder);
      font().then((f) => {
        const geo = new TextGeometry(text, { font: f, size, depth: size * 0.35, curveSegments: 3, bevelEnabled: true, bevelThickness: size * 0.06, bevelSize: size * 0.04, bevelSegments: 1 });
        geo.center();
        const m = new THREE.Mesh(geo, [glossy(color, 90), glossy(new THREE.Color(color).multiplyScalar(0.55).getHex(), 40)]);
        holder.add(m);
      });
      later(holder, 600, 400);
      onFrame((n) => (holder.rotation.y = Math.sin(n / 2600) * 0.9));
      bob(holder, size * 0.15, 0.25);
      return holder;
    },

    solid(kind: "ico" | "octa" | "dodeca" | "tetra", p: V3, size: number, tex: TexName, tint = 0xffffff) {
      const geo =
        kind === "ico"
          ? new THREE.IcosahedronGeometry(size)
          : kind === "octa"
            ? new THREE.OctahedronGeometry(size)
            : kind === "dodeca"
              ? new THREE.DodecahedronGeometry(size)
              : new THREE.TetrahedronGeometry(size);
      const m = at(mesh(geo, tex, tint), p);
      (m.material as THREE.MeshLambertMaterial).flatShading = true;
      spin(m, 0.3 + Math.random() * 0.4, 0.5 + Math.random() * 0.5);
      bob(m, size * 0.3, 0.2 + Math.random() * 0.2);
      return m;
    },

    knot(p: V3, size: number, color: number) {
      const m = new THREE.Mesh(new THREE.TorusKnotGeometry(size, size * 0.3, 64, 8, 2, 3), glossy(color, 60));
      at(m, p);
      group.add(m);
      later(m);
      spin(m, 0.2, 0.45);
      return m;
    },

    planet(p: V3, r: number, tex: TexName, tint: number, ring?: number) {
      const g = at(new THREE.Group(), p);
      group.add(g);
      const ball = mesh(new THREE.SphereGeometry(r, 16, 12), tex, tint, 2);
      g.add(ball);
      ball.position.set(0, 0, 0);
      if (ring) {
        const rr = mesh(new THREE.TorusGeometry(r * 1.7, r * 0.18, 4, 32), "paint", ring);
        rr.scale.z = 0.2;
        rr.rotation.x = Math.PI / 2.3;
        g.add(rr);
        rr.position.set(0, 0, 0);
      }
      spin(ball, 0, 0.08);
      bob(g, r * 0.08, 0.05);
      return g;
    },

    /** A globe on a stand, the real Earth (NASA Blue Marble) at CD-ROM resolution. */
    globe(p: V3, r: number) {
      const g = at(new THREE.Group(), p);
      group.add(g);
      const mat = new THREE.MeshLambertMaterial({ color: 0x3060a0 });
      photo("sd_earth", 1, 256).then((t) => {
        mat.map = t;
        mat.color.set(0xffffff);
        mat.needsUpdate = true;
      });
      const ball = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 12), mat);
      ball.position.y = r * 1.4;
      ball.rotation.z = 0.41;
      g.add(ball);
      const arc = mesh(new THREE.TorusGeometry(r * 1.12, r * 0.05, 4, 24, Math.PI), "paint", 0xc0a050);
      arc.position.y = r * 1.4;
      arc.rotation.z = 0.41 + Math.PI / 2;
      g.add(arc);
      const foot = mesh(new THREE.CylinderGeometry(r * 0.15, r * 0.5, r * 0.3, 10), "planks");
      foot.position.y = r * 0.15;
      g.add(foot);
      onFrame((_n, dt) => (ball.rotation.y += dt * 0.5));
      later(g, 300, 600);
      return g;
    },

    /** An eyeball the size of a house. It watches the camera. */
    eye(p: V3, r: number) {
      const g = at(new THREE.Group(), p);
      group.add(g);
      const sclera = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), glossy(0xf2ece4, 60));
      g.add(sclera);
      const irisMat = new THREE.MeshPhongMaterial({ color: 0x806040, shininess: 90, specular: 0xffffff });
      photo("sd_eye", 1, 256).then((t) => {
        // the iris fills the middle of the photo; frame the disc on it
        t.repeat.set(0.56, 0.84);
        t.offset.set(0.22, 0.08);
        irisMat.map = t;
        irisMat.color.set(0xffffff);
        irisMat.needsUpdate = true;
      });
      // the iris is a cap of a slightly bigger sphere, UV'd flat so the photo isn't bent
      const cap = new THREE.SphereGeometry(r * 1.004, 28, 8, 0, Math.PI * 2, 0, 0.5);
      cap.rotateX(Math.PI / 2);
      const pos = cap.attributes.position;
      const uv = cap.attributes.uv;
      const ir = r * 1.004 * Math.sin(0.5);
      for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / (2 * ir) + 0.5, pos.getY(i) / (2 * ir) + 0.5);
      const iris = new THREE.Mesh(cap, irisMat);
      g.add(iris);
      const lid = new THREE.Mesh(new THREE.SphereGeometry(r * 1.02, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.3), glossy(0xc89070, 20));
      lid.rotation.x = -0.35;
      g.add(lid);
      const want = new THREE.Vector3();
      onFrame((n, dt, cam) => {
        want.copy(cam.position);
        want.y += Math.sin(n / 1700) * 1.5;
        const m = new THREE.Matrix4().lookAt(want, g.position, new THREE.Vector3(0, 1, 0));
        const q = new THREE.Quaternion().setFromRotationMatrix(m);
        g.quaternion.slerp(q, Math.min(1, dt * 1.6));
      });
      later(g, 900, 300);
      return g;
    },

    /**
     * A floating CRT showing another ScrapBook channel, cycling. Click it and you go
     * there — the server's "other worlds".
     */
    screen(p: V3, rotY: number, size: number, slugs: string[]) {
      const g = at(new THREE.Group(), p);
      g.rotation.y = rotY;
      group.add(g);
      const body = mesh(new THREE.BoxGeometry(size * 1.25, size * 0.95, size * 0.9), "paint", 0xd8d0b8);
      body.position.z = -size * 0.4;
      g.add(body);
      const mat = new THREE.MeshBasicMaterial({ color: 0x223344 });
      const face = new THREE.Mesh(new THREE.PlaneGeometry(size * 1.05, size * 0.66), mat);
      face.position.z = size * 0.06;
      g.add(face);
      const loader = new THREE.TextureLoader();
      const textures: (THREE.Texture | null)[] = slugs.map(() => null);
      slugs.forEach((slug, i) => {
        const url = thumbFor(slug);
        if (url)
          loader.load(url, (t) => {
            t.colorSpace = THREE.SRGBColorSpace;
            t.magFilter = THREE.NearestFilter;
            textures[i] = t;
          });
      });
      let shown = -1;
      const phase = Math.floor(Math.random() * slugs.length);
      onFrame((n) => {
        const i = (Math.floor(n / 3200) + phase) % slugs.length;
        if (i !== shown && textures[i]) {
          shown = i;
          mat.map = textures[i];
          mat.color.set(0xffffff);
          mat.needsUpdate = true;
          for (const o of [face, body]) o.userData.channel = slugs[i];
        }
      });
      bob(g, size * 0.12, 0.15);
      later(g, 800, 800);
      return g;
    },

    /** The sun, seen through a cheap lens. */
    flare(p: V3) {
      const light = new THREE.PointLight(0xffffff, 0, 0);
      light.position.set(...p);
      const lf = new Lensflare();
      lf.addElement(new LensflareElement(flareTexture(256, "rgba(255,255,240,1)", "rgba(255,220,150,0.35)"), 380, 0, new THREE.Color(0xffffff)));
      lf.addElement(new LensflareElement(flareTexture(64, "rgba(160,200,255,0.28)", "rgba(80,120,255,0.06)"), 50, 0.45));
      lf.addElement(new LensflareElement(flareTexture(64, "rgba(120,255,180,0.2)", "rgba(0,0,0,0)"), 70, 0.8));
      lf.addElement(new LensflareElement(flareTexture(128, "rgba(200,140,255,0.14)", "rgba(0,0,0,0)", true), 140, 1));
      light.add(lf);
      group.add(light);
    },
  };
  return kit;
}

export type Kit = ReturnType<typeof makeKit>;
