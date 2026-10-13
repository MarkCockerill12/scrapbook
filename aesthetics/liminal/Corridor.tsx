"use client";

import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { useCanvas } from "@/components/CanvasStage";
import { buildFigure, poseFigure, type Figure } from "./figure";

/**
 * The corridor, as a real lit room.
 *
 * Fourth pass (2026-10). Mark: "it feels too blocky and flat… the entity is just a
 * flat png… make it feel as real as possible". CSS 3D cannot light anything, so this
 * is now WebGL: scanned carpet, paper and ceiling tile with their normal maps, a
 * fitting in every bay that actually throws light and falls off, skirting, a dado
 * rail and door casings that have depth, fog that is real distance, and a figure with
 * volume that casts a shadow when it crouches to look under the table.
 *
 * The loop is still modulo. The room is built once, ten bays long, and the CAMERA
 * moves through one bay's worth of it; cross a bay and the camera snaps back by
 * exactly one while what is in each bay shifts along by one index.
 *
 * Units are the old CSS pixels, so the page's camera maths did not have to change:
 * x is right, z is towards you, and only y is flipped (up is positive in here).
 */

export const WIDTH = 560;
export const HEIGHT = 440;
export const DEPTH = 560;
export const SEGMENTS = 9;
const PERSPECTIVE = 700;
const BASE = DEPTH;
const FLOOR = HEIGHT / 2;
const SLOTS = SEGMENTS + 1;
const LENGTH = SLOTS * DEPTH;
const MID_Z = (DEPTH - SEGMENTS * DEPTH) / 2;

/** Where the camera sits in world-local z when nobody has moved it. */
export const camLocalZ = (travel: number) => PERSPECTIVE - BASE - (((travel % DEPTH) + DEPTH) % DEPTH);
/** World-local z of the middle of global segment `g`. */
export const segmentZ = (g: number, baseIndex: number) => -((g - baseIndex) * DEPTH + DEPTH / 2);

export type LightState = "on" | "off" | "flicker";

export interface SegmentInfo {
  light: LightState;
  door: "left" | "right" | null;
  doorIsNew: boolean;
  plaque: string;
  art: { side: "left" | "right"; slot: string; n: number } | null;
  exitSign: boolean;
}

export interface Textures {
  floor: string;
  floorN: string;
  wall: string;
  wallN: string;
  ceiling: string;
  ceilingN: string;
  door: string;
  wood: string;
  woodN: string;
  exit: string;
  art: (slot: string, n: number) => string;
}

export interface Cam {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
}

/** The thing. `anchor` is a world-local z; everything it does is measured from there. */
export interface Entity {
  mode: "pass" | "rush";
  t0: number;
  anchor: number;
}

export const TW = 250;
export const TD = 150;
export const TH = 124;
export const TX = WIDTH / 2 - TW / 2 - 16;

const LAMP = 300000;

interface Slot {
  group: THREE.Group;
  lamp: THREE.PointLight;
  panel: THREE.MeshBasicMaterial;
  glow: THREE.MeshBasicMaterial;
  state: LightState;
  level: number;
  door: THREE.Group;
  leaf: THREE.Mesh;
  plaque: THREE.Mesh;
  art: THREE.Group;
  photo: THREE.Mesh;
  exit: THREE.Group;
}

export function Corridor({
  travelRef,
  segments,
  textures,
  baseIndex,
  onDoor,
  onArt,
  camRef,
  table,
  onTable,
  entity,
  onFootfall,
}: {
  travelRef: RefObject<number>;
  /** SEGMENTS + 1 entries. Entry 0 is the segment BEHIND the camera's. */
  segments: SegmentInfo[];
  textures: Textures;
  baseIndex: number;
  onDoor: (globalIndex: number) => void;
  onArt: (slot: string, n: number) => void;
  camRef: RefObject<Cam>;
  table: number | null;
  onTable: () => void;
  entity: Entity | null;
  onFootfall: () => void;
}) {
  const { toCanvasSpace } = useCanvas();
  const host = useRef<HTMLDivElement>(null);
  const live = useRef({ segments, baseIndex, table, entity, onDoor, onArt, onTable, onFootfall });
  live.current = { segments, baseIndex, table, entity, onDoor, onArt, onTable, onFootfall };
  const sync = useRef<() => void>(() => {});
  const pick = useRef<(x: number, y: number) => THREE.Object3D | null>(() => null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(1600, 900, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const FOG = 0x0d0b06;
    scene.background = new THREE.Color(FOG);
    scene.fog = new THREE.FogExp2(FOG, 0.00052);
    const camera = new THREE.PerspectiveCamera((2 * Math.atan(450 / PERSPECTIVE) * 180) / Math.PI, 16 / 9, 8, 7000);
    camera.rotation.order = "YXZ";

    const loader = new THREE.TextureLoader();
    const aniso = renderer.capabilities.getMaxAnisotropy();
    const tex = (url: string, rx: number, ry: number, colour = true) => {
      const t = loader.load(url);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(rx, ry);
      t.anisotropy = aniso;
      if (colour) t.colorSpace = THREE.SRGBColorSpace;
      return t;
    };
    const dispose: { dispose: () => void }[] = [];
    const keep = <T extends { dispose: () => void }>(x: T) => {
      dispose.push(x);
      return x;
    };

    scene.add(new THREE.HemisphereLight(0xfff0c0, 0x4a3a1c, 0.16));

    // ---- the shell: one floor, one ceiling, two walls, ten bays long -------
    const carpet = keep(
      new THREE.MeshStandardMaterial({
        map: tex(textures.floor, WIDTH / 280, LENGTH / 280),
        normalMap: tex(textures.floorN, WIDTH / 280, LENGTH / 280, false),
        normalScale: new THREE.Vector2(1.6, 1.6),
        roughness: 1,
        color: 0xb9ab86,
      }),
    );
    const floor = new THREE.Mesh(keep(new THREE.PlaneGeometry(WIDTH, LENGTH)), carpet);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -FLOOR, MID_Z);
    floor.receiveShadow = true;
    scene.add(floor);

    const tiles = keep(
      new THREE.MeshStandardMaterial({
        map: tex(textures.ceiling, WIDTH / 560, LENGTH / 560),
        normalMap: tex(textures.ceilingN, WIDTH / 560, LENGTH / 560, false),
        normalScale: new THREE.Vector2(0.7, 0.7),
        roughness: 0.95,
        color: 0xcfc6ad,
      }),
    );
    const ceiling = new THREE.Mesh(keep(new THREE.PlaneGeometry(WIDTH, LENGTH)), tiles);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, FLOOR, MID_Z);
    scene.add(ceiling);

    const DADO = 118;
    const paper = keep(
      new THREE.MeshStandardMaterial({
        map: tex(textures.wall, LENGTH / 330, (HEIGHT - DADO) / 330),
        normalMap: tex(textures.wallN, LENGTH / 330, (HEIGHT - DADO) / 330, false),
        normalScale: new THREE.Vector2(1.3, 1.3),
        roughness: 0.92,
        // the scan is white lining paper; this is what forty years of strip light does to it
        color: 0xc9b46c,
      }),
    );
    const panelling = keep(
      new THREE.MeshStandardMaterial({
        map: tex(textures.wall, LENGTH / 330, DADO / 330),
        roughness: 0.8,
        color: 0x9a8648,
      }),
    );
    const gloss = keep(new THREE.MeshStandardMaterial({ color: 0xb5a57a, roughness: 0.45 }));
    const upperGeo = keep(new THREE.PlaneGeometry(LENGTH, HEIGHT - DADO));
    const lowerGeo = keep(new THREE.PlaneGeometry(LENGTH, DADO));
    const railGeo = keep(new THREE.BoxGeometry(LENGTH, 9, 7));
    const skirtGeo = keep(new THREE.BoxGeometry(LENGTH, 26, 5));
    const coveGeo = keep(new THREE.BoxGeometry(LENGTH, 12, 12));
    for (const s of [-1, 1]) {
      const x = (s * WIDTH) / 2;
      const turn = s < 0 ? Math.PI / 2 : -Math.PI / 2;
      const upper = new THREE.Mesh(upperGeo, paper);
      upper.position.set(x, -FLOOR + DADO + (HEIGHT - DADO) / 2, MID_Z);
      upper.rotation.y = turn;
      upper.receiveShadow = true;
      const lower = new THREE.Mesh(lowerGeo, panelling);
      lower.position.set(x, -FLOOR + DADO / 2, MID_Z);
      lower.rotation.y = turn;
      lower.receiveShadow = true;
      const rail = new THREE.Mesh(railGeo, gloss);
      rail.position.set(x - s * 3, -FLOOR + DADO, MID_Z);
      rail.rotation.y = turn;
      const skirt = new THREE.Mesh(skirtGeo, gloss);
      skirt.position.set(x - s * 2, -FLOOR + 13, MID_Z);
      skirt.rotation.y = turn;
      const cove = new THREE.Mesh(coveGeo, gloss);
      cove.position.set(x - s * 5, FLOOR - 5, MID_Z);
      cove.rotation.y = turn;
      scene.add(upper, lower, rail, skirt, cove);
    }

    // Where two surfaces meet, less light gets in. Painted on, the cheap way.
    const shade = document.createElement("canvas");
    shade.width = 4;
    shade.height = 64;
    const sg = shade.getContext("2d");
    if (sg) {
      const g = sg.createLinearGradient(0, 0, 0, 64);
      g.addColorStop(0, "rgba(0,0,0,0.5)");
      g.addColorStop(0.3, "rgba(0,0,0,0.14)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      sg.fillStyle = g;
      sg.fillRect(0, 0, 4, 64);
    }
    const shadeTex = keep(new THREE.CanvasTexture(shade));
    const occl = keep(new THREE.MeshBasicMaterial({ map: shadeTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    const stripGeo = keep(new THREE.PlaneGeometry(LENGTH, 90));
    for (const s of [-1, 1]) {
      // on the carpet, along the skirting
      const a = new THREE.Mesh(stripGeo, occl);
      a.rotation.set(-Math.PI / 2, 0, s < 0 ? -Math.PI / 2 : Math.PI / 2);
      a.position.set(s * (WIDTH / 2 - 45), -FLOOR + 0.6, MID_Z);
      // on the ceiling, along the cove
      const b = new THREE.Mesh(stripGeo, occl);
      b.rotation.set(Math.PI / 2, 0, s < 0 ? Math.PI / 2 : -Math.PI / 2);
      b.position.set(s * (WIDTH / 2 - 45), FLOOR - 0.6, MID_Z);
      // on the paper, under the ceiling
      const c2 = new THREE.Mesh(stripGeo, occl);
      c2.rotation.y = s < 0 ? Math.PI / 2 : -Math.PI / 2;
      c2.position.set(s * (WIDTH / 2 - 0.6), FLOOR - 45, MID_Z);
      scene.add(a, b, c2);
    }
    const endWall = new THREE.Mesh(keep(new THREE.PlaneGeometry(WIDTH, HEIGHT)), keep(new THREE.MeshBasicMaterial({ color: FOG })));
    endWall.position.set(0, 0, -SEGMENTS * DEPTH + 2);
    scene.add(endWall);

    // ---- what a bay can have in it ---------------------------------------
    const wood = keep(
      new THREE.MeshStandardMaterial({ map: tex(textures.wood, 1, 1), normalMap: tex(textures.woodN, 1, 1, false), roughness: 0.62, color: 0x9a7a5a }),
    );
    const casing = keep(new THREE.MeshStandardMaterial({ color: 0x6f5a3c, roughness: 0.5 }));
    const brass = keep(new THREE.MeshStandardMaterial({ color: 0xb89a55, roughness: 0.28, metalness: 0.9 }));
    const doorTex = tex(textures.door, 0.72, 1);
    doorTex.offset.set(0.14, 0);
    doorTex.wrapS = doorTex.wrapT = THREE.ClampToEdgeWrapping;
    const frameMat = keep(new THREE.MeshStandardMaterial({ color: 0x1c1712, roughness: 0.4 }));
    const mount = keep(new THREE.MeshStandardMaterial({ color: 0xe6e0cf, roughness: 0.9 }));
    const housing = keep(new THREE.MeshStandardMaterial({ color: 0x8c8676, roughness: 0.5, metalness: 0.4 }));
    const exitTex = tex(textures.exit, 0.5, 0.66);
    exitTex.offset.set(0.26, 0.18);
    exitTex.wrapS = exitTex.wrapT = THREE.ClampToEdgeWrapping;
    const exitMat = keep(new THREE.MeshBasicMaterial({ map: exitTex, toneMapped: false }));

    const panelGeo = keep(new THREE.PlaneGeometry(150, 300));
    const trimGeo = keep(new THREE.BoxGeometry(166, 6, 316));
    const glowGeo = keep(new THREE.PlaneGeometry(460, 620));
    const glowCv = document.createElement("canvas");
    glowCv.width = glowCv.height = 128;
    const gg = glowCv.getContext("2d");
    if (gg) {
      const g = gg.createRadialGradient(64, 64, 4, 64, 64, 64);
      g.addColorStop(0, "rgba(255,244,205,0.3)");
      g.addColorStop(0.45, "rgba(255,236,180,0.05)");
      g.addColorStop(1, "rgba(255,236,180,0)");
      gg.fillStyle = g;
      gg.fillRect(0, 0, 128, 128);
    }
    const glowTex = keep(new THREE.CanvasTexture(glowCv));
    const leafGeo = keep(new THREE.BoxGeometry(160, 300, 6));
    const jambGeo = keep(new THREE.BoxGeometry(14, 314, 20));
    const headGeo = keep(new THREE.BoxGeometry(202, 14, 20));
    const knobGeo = keep(new THREE.SphereGeometry(7, 16, 12));
    const roseGeo = keep(new THREE.CylinderGeometry(9, 9, 3, 16));
    const plaqueGeo = keep(new THREE.BoxGeometry(120, 40, 3));
    const artFrameGeo = keep(new THREE.BoxGeometry(216, 156, 10));
    const artMountGeo = keep(new THREE.PlaneGeometry(200, 140));
    const artPhotoGeo = keep(new THREE.PlaneGeometry(164, 108));
    const exitBoxGeo = keep(new THREE.BoxGeometry(136, 88, 22));
    const exitFaceGeo = keep(new THREE.PlaneGeometry(128, 80));
    const rodGeo = keep(new THREE.CylinderGeometry(1.6, 1.6, 34, 6));

    const plaques = new Map<string, THREE.CanvasTexture>();
    const plaqueTex = (text: string) => {
      let t = plaques.get(text);
      if (!t) {
        const cv = document.createElement("canvas");
        cv.width = 480;
        cv.height = 160;
        const g = cv.getContext("2d");
        if (g) {
          g.fillStyle = "#2a2620";
          g.fillRect(0, 0, 480, 160);
          g.strokeStyle = "#8a7c58";
          g.lineWidth = 6;
          g.strokeRect(9, 9, 462, 142);
          g.fillStyle = "#e9dfc2";
          g.textAlign = "center";
          g.textBaseline = "middle";
          let size = 50;
          g.font = `600 ${size}px "Helvetica Neue", Arial, sans-serif`;
          while (g.measureText(text).width > 420 && size > 20) {
            size -= 2;
            g.font = `600 ${size}px "Helvetica Neue", Arial, sans-serif`;
          }
          g.fillText(text, 240, 84);
        }
        t = new THREE.CanvasTexture(cv);
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = aniso;
        plaques.set(text, t);
      }
      return t;
    };
    const photos = new Map<string, THREE.Texture>();
    const photoTex = (url: string) => {
      let t = photos.get(url);
      if (!t) {
        t = loader.load(url);
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = aniso;
        photos.set(url, t);
      }
      return t;
    };

    const clickable: THREE.Object3D[] = [];
    const slots: Slot[] = [];
    for (let slot = 0; slot < SLOTS; slot++) {
      const group = new THREE.Group();
      group.position.z = -((slot - 1) * DEPTH + DEPTH / 2);

      // the fitting: a recessed troffer that really is the light source
      const lamp = new THREE.PointLight(0xfff1cf, LAMP, 1500, 2);
      lamp.position.set(0, FLOOR - 46, 0);
      const panel = new THREE.MeshBasicMaterial({ color: 0xfff6dc, toneMapped: false });
      const face = new THREE.Mesh(panelGeo, panel);
      face.rotation.x = Math.PI / 2;
      face.position.y = FLOOR - 3.2;
      const trim = new THREE.Mesh(trimGeo, housing);
      trim.position.y = FLOOR - 1;
      const glow = new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
      const halo = new THREE.Mesh(glowGeo, glow);
      halo.rotation.x = Math.PI / 2;
      halo.position.y = FLOOR - 5;
      group.add(lamp, trim, face, halo);

      // a door, with a casing that stands proud of the wall
      const door = new THREE.Group();
      const leaf = new THREE.Mesh(leafGeo, [casing, casing, casing, casing, new THREE.MeshStandardMaterial({ map: doorTex, roughness: 0.55 }), casing]);
      leaf.position.set(0, -FLOOR + 152, 4);
      leaf.userData = { kind: "door", slot };
      leaf.castShadow = true;
      const jl = new THREE.Mesh(jambGeo, casing);
      jl.position.set(-94, -FLOOR + 157, 6);
      const jr = new THREE.Mesh(jambGeo, casing);
      jr.position.set(94, -FLOOR + 157, 6);
      const head = new THREE.Mesh(headGeo, casing);
      head.position.set(0, -FLOOR + 311, 6);
      const rose = new THREE.Mesh(roseGeo, brass);
      rose.rotation.x = Math.PI / 2;
      rose.position.set(62, -FLOOR + 146, 8);
      const knob = new THREE.Mesh(knobGeo, brass);
      knob.position.set(62, -FLOOR + 146, 17);
      const plaque = new THREE.Mesh(plaqueGeo, [casing, casing, casing, casing, new THREE.MeshStandardMaterial({ roughness: 0.5 }), casing]);
      plaque.position.set(-172, 8, 2);
      door.add(leaf, jl, jr, head, rose, knob, plaque);
      clickable.push(leaf);
      group.add(door);

      // a photograph, glazed, in a frame with some depth to it
      const art = new THREE.Group();
      const fr = new THREE.Mesh(artFrameGeo, frameMat);
      fr.castShadow = true;
      const mt = new THREE.Mesh(artMountGeo, mount);
      mt.position.z = 5.4;
      const photo = new THREE.Mesh(artPhotoGeo, new THREE.MeshStandardMaterial({ roughness: 0.25 }));
      photo.position.z = 5.8;
      photo.userData = { kind: "art", slot };
      art.add(fr, mt, photo);
      clickable.push(photo);
      group.add(art);

      const exit = new THREE.Group();
      const box = new THREE.Mesh(exitBoxGeo, housing);
      const ef = new THREE.Mesh(exitFaceGeo, exitMat);
      ef.position.z = 11.4;
      const r1 = new THREE.Mesh(rodGeo, housing);
      r1.position.set(-48, 60, 0);
      const r2 = new THREE.Mesh(rodGeo, housing);
      r2.position.set(48, 60, 0);
      exit.add(box, ef, r1, r2);
      exit.position.set(0, FLOOR - 76, -DEPTH / 2 + 12);
      group.add(exit);

      scene.add(group);
      slots.push({ group, lamp, panel, glow, state: "on", level: 1, door, leaf, plaque, art, photo, exit });
    }

    // ---- the table --------------------------------------------------------
    const tableG = new THREE.Group();
    const top = new THREE.Mesh(keep(new THREE.BoxGeometry(TW, 8, TD)), wood);
    top.position.y = -FLOOR + TH - 4;
    top.castShadow = true;
    top.receiveShadow = true;
    tableG.add(top);
    const legGeo = keep(new THREE.BoxGeometry(14, TH - 8, 14));
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        const leg = new THREE.Mesh(legGeo, wood);
        leg.position.set(sx * (TW / 2 - 13), -FLOOR + (TH - 8) / 2, sz * (TD / 2 - 13));
        leg.castShadow = true;
        tableG.add(leg);
      }
    const apronGeo = keep(new THREE.BoxGeometry(TW - 30, 22, 5));
    for (const sz of [-1, 1]) {
      const ap = new THREE.Mesh(apronGeo, wood);
      ap.position.set(0, -FLOOR + TH - 19, sz * (TD / 2 - 13));
      tableG.add(ap);
    }
    const sideApron = new THREE.Mesh(keep(new THREE.BoxGeometry(5, 22, TD - 30)), wood);
    sideApron.position.set(TW / 2 - 13, -FLOOR + TH - 19, 0);
    tableG.add(sideApron);
    const hot = new THREE.Mesh(keep(new THREE.BoxGeometry(TW + 30, TH + 40, TD + 30)), keep(new THREE.MeshBasicMaterial({ visible: false })));
    hot.position.y = -FLOOR + TH / 2 + 10;
    hot.userData = { kind: "table" };
    tableG.add(hot);
    clickable.push(hot);
    tableG.position.x = TX;
    tableG.visible = false;
    scene.add(tableG);

    // One light in the building is allowed to cast shadows: whichever is over the thing.
    const key = new THREE.SpotLight(0xfff1cf, 0, 1300, 1.25, 0.9, 2);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -0.0004;
    key.shadow.radius = 5;
    key.shadow.camera.near = 20;
    key.shadow.camera.far = 900;
    scene.add(key, key.target);

    const figure: Figure = buildFigure();
    figure.root.visible = false;
    scene.add(figure.root);
    dispose.push(figure);

    // ---- props -> scene ---------------------------------------------------
    sync.current = () => {
      const { segments: segs, baseIndex: base, table: tb } = live.current;
      slots.forEach((s, slot) => {
        const seg = segs[slot];
        if (!seg) return;
        s.state = seg.light;
        s.door.visible = !!seg.door;
        if (seg.door) {
          const left = seg.door === "left";
          s.door.position.set(left ? -WIDTH / 2 : WIDTH / 2, 0, 0);
          s.door.rotation.y = left ? Math.PI / 2 : -Math.PI / 2;
          const face = (s.plaque.material as THREE.MeshStandardMaterial[])[4];
          face.map = plaqueTex(seg.plaque);
          face.needsUpdate = true;
          const leafFace = (s.leaf.material as THREE.MeshStandardMaterial[])[4];
          leafFace.color.setHex(seg.doorIsNew ? 0x5a5048 : 0xffffff);
        }
        s.art.visible = !!seg.art;
        if (seg.art) {
          const left = seg.art.side === "left";
          s.art.position.set(left ? -WIDTH / 2 + 5 : WIDTH / 2 - 5, 34, -40);
          s.art.rotation.y = left ? Math.PI / 2 : -Math.PI / 2;
          const pm = s.photo.material as THREE.MeshStandardMaterial;
          pm.map = photoTex(textures.art(seg.art.slot, seg.art.n));
          pm.needsUpdate = true;
        }
        s.exit.visible = seg.exitSign;
      });
      tableG.visible = tb !== null && tb - base >= -1 && tb - base < SEGMENTS;
      if (tb !== null) tableG.position.z = segmentZ(tb, base);
    };
    sync.current();

    const ray = new THREE.Raycaster();
    pick.current = (x, y) => {
      ray.setFromCamera(new THREE.Vector2((x / 1600) * 2 - 1, -((y / 900) * 2 - 1)), camera);
      const hit = ray.intersectObjects(clickable, false).find((h) => {
        let o: THREE.Object3D | null = h.object;
        while (o) {
          if (!o.visible) return false;
          o = o.parent;
        }
        return h.distance < 2600;
      });
      return hit ? hit.object : null;
    };

    // ---- the frame --------------------------------------------------------
    let raf = 0;
    let lastFoot = 0;
    const noise = (n: number) => {
      const x = Math.sin(n * 127.1) * 43758.5453;
      return x - Math.floor(x);
    };
    const frame = (now: number) => {
      const t = now / 1000;
      const cam = camRef.current;
      const eyeZ = camLocalZ(travelRef.current) - cam.z;
      // a little weight in the walk: the head dips once a stride
      const stride = Math.sin((travelRef.current / (DEPTH / 2)) * Math.PI);
      camera.position.set(cam.x, -cam.y - Math.abs(stride) * 3.2, eyeZ);
      camera.rotation.set((cam.pitch * Math.PI) / 180, (-cam.yaw * Math.PI) / 180, stride * 0.004);

      slots.forEach((s, i) => {
        let want = s.state === "off" ? 0 : 1;
        if (s.state === "flicker") {
          // a tired tube, not a strobe: it wanders, and now and then it dips
          const slow = 0.5 + 0.5 * Math.sin(t * 1.3 + i * 2.1) * Math.sin(t * 0.47 + i);
          const dip = noise(Math.floor(t * 1.4) + i * 31) > 0.82 ? 0.45 : 1;
          want = (0.62 + 0.38 * slow) * dip;
        }
        // tubes do not snap off; they sag
        s.level += (want - s.level) * (s.state === "flicker" ? 0.06 : 0.12);
        s.lamp.intensity = LAMP * s.level;
        s.panel.color.setRGB(0.1 + 0.9 * s.level, 0.1 + 0.86 * s.level, 0.08 + 0.78 * s.level);
        s.glow.opacity = s.level;
      });

      const e = live.current.entity;
      figure.root.visible = !!e;
      let keyZ = tableG.visible ? tableG.position.z : -DEPTH / 2;
      if (e) {
        const u = Math.max(0, (now - e.t0) / 1000);
        const foot = poseFigure(figure, e.mode, u, e.anchor, -FLOOR, camera.position);
        if (e.mode === "pass" && foot !== null && foot !== lastFoot) {
          lastFoot = foot;
          live.current.onFootfall();
        }
        keyZ = e.mode === "pass" ? e.anchor : figure.root.position.z;
      }
      // the shadow-casting lamp rides on the fitting nearest whatever needs a shadow
      const bay = Math.round((keyZ + DEPTH / 2) / DEPTH) * DEPTH - DEPTH / 2;
      const over = slots[Math.round(-(bay + DEPTH / 2) / DEPTH) + 1];
      key.position.set(0, FLOOR - 12, bay);
      key.target.position.set(0, -FLOOR, bay);
      key.intensity = (e || tableG.visible) && over ? LAMP * 2.2 * over.level : 0;

      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      dispose.forEach((d) => d.dispose());
      plaques.forEach((p) => p.dispose());
      photos.forEach((p) => p.dispose());
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((mt2) => {
          const sm = mt2 as THREE.MeshStandardMaterial;
          sm.map?.dispose();
          sm.normalMap?.dispose();
          sm.dispose();
        });
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
    // the room is built once; what is in it arrives through `live`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => sync.current(), [segments, baseIndex, table]);

  return (
    <div
      ref={host}
      style={{ position: "absolute", inset: 0 }}
      onPointerMove={(e) => {
        const p = toCanvasSpace(e.clientX, e.clientY);
        e.currentTarget.style.cursor = pick.current(p.x, p.y) ? "pointer" : "";
      }}
      onClick={(e) => {
        const p = toCanvasSpace(e.clientX, e.clientY);
        const hit = pick.current(p.x, p.y);
        if (!hit) return;
        const { kind, slot } = hit.userData as { kind: string; slot?: number };
        const l = live.current;
        if (kind === "table") l.onTable();
        else if (kind === "door" && slot !== undefined) l.onDoor(l.baseIndex + slot - 1);
        else if (kind === "art" && slot !== undefined) {
          const a = l.segments[slot]?.art;
          if (a) l.onArt(a.slot, a.n);
        }
      }}
    />
  );
}
