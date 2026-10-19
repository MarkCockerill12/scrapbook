import * as THREE from "three";
import type { WorldDef } from "../worlds";
import { ELSEWHERE } from "./shared";

/**
 * The Void. Black marble slabs hanging in a drained sky. A row of arches walking off
 * into nothing, stairs that stop, a door frame with no wall, an eye the size of a house
 * that follows you, and old CRTs drifting about, each tuned to somewhere else on
 * ScrapBook. Nobody here is really here.
 */
export const voidWorld: WorldDef = {
  id: "void",
  name: "The Void",
  sky: 2,
  skyTint: 0x8a8a96,
  background: 0x2a2c34,
  views: [
    { name: "slab", pos: [0, 2.6, 9], tgt: [0, 2.8, -6] },
    { name: "door", pos: [-1.5, 1.9, 5], tgt: [-1.5, 1.8, 0.9] },
    { name: "eye", pos: [2, 4, 2], tgt: [9, 9, -22] },
    { name: "screens", pos: [-4, 2.6, 2], tgt: [-10, 3.6, -6] },
    { name: "arches", pos: [0, 2.4, -8], tgt: [0, 2.2, -40] },
  ],
  light: { sky: 0xb0b4c8, ground: 0x202024, sun: 0xd8dcf0, dir: [-0.3, 1, 0.2] },
  avatars: [
    { name: "afk_user", shirt: "felt", tint: 0x606060, hair: 0x101010, home: [-2.6, -2.6], roam: 0, face: Math.PI, y: 0.4 },
    { name: "???", kind: "orb", shirt: "marble", tint: 0x606060, home: [7, -14], roam: 0, y: 3.4 },
    { name: "lost", kind: "fish", shirt: "felt", tint: 0x707080, home: [-2, -6], roam: 5, y: 4.5 },
    { name: "the_void", kind: "ghost", shirt: "plaster", tint: 0xffffff, home: [2.5, -6], roam: 1.2, y: 0.8 },
    { name: "watcher", kind: "eyewalker", shirt: "paint", tint: 0xffffff, home: [-1.5, 7.5], roam: 1.5, y: 0 },
    { name: "UFO_sighting", kind: "ufo", shirt: "paint", tint: 0x707888, home: [-10, -20], roam: 6, y: 3 },
  ],
  bounds: { min: [-60, -25, -70], max: [60, 40, 60] },
  build(k) {
    for (const [x, y, z, s] of [
      [0, 0, 8, 5],
      [-1.5, 0.4, 1, 5],
      [2.5, 0.8, -6, 3.5],
      [-5, 1.6, -11, 3],
      [7, 3, -14, 2.5],
      [-11, 0.2, -4, 3],
      [-9, 2.4, -7, 2],
      [11, -1.5, 1, 3.5],
    ])
      k.at(k.mesh(new THREE.BoxGeometry(s, 0.4, s), "marble", 0xffffff, s / 2), [x, y - 0.2, z]);
    for (const [x, z, h] of [
      [-3.2, 0, 4.5],
      [1.8, 2, 4.5],
      [-3.2, -5, 2.2],
      [4.3, -6, 1.3],
      [-6.5, -11, 5],
    ])
      k.at(k.mesh(new THREE.CylinderGeometry(0.35, 0.42, h, 10), "stone"), [x, 0.4 + h / 2, z]);
    // a column lying down, floating
    const fallen = k.at(k.mesh(new THREE.CylinderGeometry(0.4, 0.4, 5, 10), "stone"), [-8, 7.5, -15]);
    fallen.rotation.z = 1.3;
    k.spin(fallen, 0.03, 0.05);

    // stairs that stop, and stairs upside down
    for (let i = 0; i < 9; i++) k.at(k.mesh(new THREE.BoxGeometry(1.6, 0.3, 0.6), "marble"), [4.6, 0.95 + i * 0.32, -3.4 - i * 0.6]);
    for (let i = 0; i < 7; i++) k.at(k.mesh(new THREE.BoxGeometry(1.4, 0.3, 0.6), "marble"), [-9, 11 - i * 0.32, -12 - i * 0.6]);

    // a door frame with nothing around it
    for (const s of [-0.75, 0.75]) k.at(k.mesh(new THREE.BoxGeometry(0.16, 2.6, 0.2), "planks"), [-1.5 + s, 1.7, 1]);
    k.at(k.mesh(new THREE.BoxGeometry(1.66, 0.16, 0.2), "planks"), [-1.5, 3.05, 1]);
    k.portal("gallery", "RENDER GALLERY", [-1.5, 0.4, 0.95], 0);
    k.portal("hub", "GROUND ZERO", [2.5, 0.8, -6.2], 0.1);

    // arches walking off into nothing
    for (let i = 0; i < 9; i++) {
      const z = -16 - i * 5;
      const y = 0.4 - i * 0.6;
      for (const s of [-1.6, 1.6]) k.at(k.mesh(new THREE.BoxGeometry(0.5, 4, 0.5), "stone"), [s, y + 2, z]);
      k.at(k.mesh(new THREE.BoxGeometry(3.7, 0.5, 0.5), "stone"), [0, y + 4.2, z]);
      k.at(k.mesh(new THREE.BoxGeometry(3.7, 0.3, 3), "marble"), [0, y - 0.15, z]);
    }

    k.eye([9, 9, -22], 4);
    k.blob([-6, 5.5, -3], 1.6, 0x18181c, { balls: 5, speed: 0.3 });

    // CRTs adrift, tuned elsewhere
    const screens: [number, number, number, number][] = [
      [-7.5, 3.2, -3, 0.9],
      [-10, 4.6, -7.5, 0.6],
      [-5.5, 5.8, -9, 0.3],
      [-12, 2.4, 0, 1.2],
      [9, 2.6, -3, -0.9],
    ];
    screens.forEach(([x, y, z, ry], i) => k.screen([x, y, z], ry, 1.1, [...ELSEWHERE.slice(i * 2), ...ELSEWHERE.slice(0, i * 2)]));

    const torus = k.at(k.mesh(new THREE.TorusGeometry(4, 0.9, 10, 24), "paint", 0x9098a8, 2), [-14, 9, -30]);
    k.spin(torus, 0.08, 0.12);
    const cone = k.at(k.mesh(new THREE.ConeGeometry(2.4, 5, 8), "marble", 0xffffff, 2), [16, 7, -26]);
    cone.rotation.z = 2.6;
    k.spin(cone, 0.05, 0, 0.07);
    k.bob(cone, 0.8, 0.3);
    k.knot([-4, 13, -34], 2.6, 0x707888);
    k.solid("octa", [13, 2, -8], 1.3, "marble");
    k.solid("tetra", [-13, 7, -16], 1.5, "stone");
    k.planet([0, 30, -80], 10, "rock", 0x707080);
  },
};
