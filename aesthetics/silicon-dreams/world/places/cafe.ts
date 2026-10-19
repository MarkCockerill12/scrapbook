import * as THREE from "three";
import type { WorldDef } from "../worlds";
import { ELSEWHERE } from "./shared";

/**
 * The CyberCafé. A plaster room with a bar, a lounge corner with a globe and a lava
 * lamp, a jukebox, a TV on the wall tuned to the other servers, a giant coffee cup
 * turning slowly over the bar, and a window onto the real sky.
 */
export const cafe: WorldDef = {
  id: "cafe",
  name: "CyberCafé",
  sky: 3,
  background: 0x20140c,
  views: [
    { name: "door", pos: [0, 1.85, 5.2], tgt: [0, 1.6, -6] },
    { name: "bar", pos: [0.6, 2.1, 0.6], tgt: [1, 1.9, -6] },
    { name: "lounge", pos: [-2.5, 1.7, 2.8], tgt: [-7.5, 1.2, -1] },
    { name: "tv", pos: [2.6, 1.9, 1.8], tgt: [8.4, 2.1, -4.8] },
  ],
  light: { sky: 0xffe2c0, ground: 0x402818, sun: 0xffd8a0, dir: [0.3, 1, 0.5] },
  avatars: [
    { name: "xTREMEx", shirt: "fabric", tint: 0x20a040, home: [-3.3, -2.2], roam: 0, sit: true, face: 1.2 },
    { name: "luvbug", shirt: "fabric", tint: 0xe04080, hair: 0x7a3010, home: [-1.7, -2.6], roam: 0, sit: true, face: -1.6 },
    { name: "Barista9000", kind: "robot", shirt: "paint", tint: 0xc0c8d0, home: [1, -5.6], roam: 1.6 },
    { name: "webmaster", shirt: "felt", tint: 0x2040a0, hair: 0x202020, home: [3.6, -2.6], roam: 1 },
    { name: "DJ_Spin", shirt: "fabric", tint: 0xf0c020, hair: 0x101010, home: [6.6, -5.6], roam: 0.6 },
    { name: "chillax", shirt: "felt", tint: 0x606090, hair: 0xa05020, home: [-7.7, 0.4], roam: 0, sit: true, face: 1.57 },
    { name: "BigHead", kind: "head", shirt: "felt", tint: 0xe0d070, skin: 0xd8a080, home: [-4.6, -5.6], roam: 1 },
    { name: "TVHEAD", kind: "tvhead", shirt: "fabric", tint: 0x8a2030, home: [-1.2, 1.6], roam: 1.5 },
    { name: "boo_who", kind: "ghost", shirt: "plaster", tint: 0xffffff, home: [-5, -5.5], roam: 1.5, y: 0.6 },
    { name: "lil_quack", kind: "duck", shirt: "paint", tint: 0xffd820, home: [-2.6, -4.6], roam: 0, y: 1.18, face: 0.3 },
    { name: "bubbles", kind: "fish", shirt: "roof", tint: 0xff60a0, home: [0, -1], roam: 3.2, y: 3.5 },
  ],
  bounds: { min: [-8.5, 0.5, -7.5], max: [8.5, 4.2, 5.6] },
  flySpeed: 3.5,
  build(k) {
    const W = 18;
    const D = 14;
    const H = 4.6;
    const floor = k.mesh(new THREE.PlaneGeometry(W, D), "woodFloor", 0xffffff, 6);
    floor.rotation.x = -Math.PI / 2;
    floor.position.z = -1;
    const ceil = k.mesh(new THREE.PlaneGeometry(W, D), "plaster", 0xd8c8b0, 4);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(0, H, -1);
    for (const [w, x, z, ry] of [
      [W, 0, -8, 0],
      [D, -9, -1, Math.PI / 2],
      [D, 9, -1, -Math.PI / 2],
      [W, 0, 6, Math.PI],
    ] as const) {
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(w, H), k.skin("plaster", 0xe8b878, 4));
      wall.position.set(x, H / 2, z);
      wall.rotation.y = ry;
      k.group.add(wall);
    }
    const win = new THREE.Mesh(new THREE.PlaneGeometry(6, 2.2), k.skin(null, 0xffffff));
    win.userData.skyWindow = true;
    win.position.set(-8.98, 2.3, -2.5);
    win.rotation.y = Math.PI / 2;
    k.group.add(win);

    // the bar
    k.at(k.mesh(new THREE.BoxGeometry(8, 1.1, 0.8), "planks", 0xffffff, 3), [1, 0.55, -4.6]);
    k.at(k.mesh(new THREE.BoxGeometry(8.2, 0.08, 1), "tiles", 0xf0e8e0, 3), [1, 1.14, -4.6]);
    for (let i = 0; i < 4; i++) {
      k.at(k.mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.08, 10), "fabric", 0xc02020), [-1.6 + i * 1.7, 0.75, -3.7]);
      k.at(k.mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.75, 6), "paint", 0x505860), [-1.6 + i * 1.7, 0.37, -3.7]);
    }
    for (let i = 0; i < 6; i++) {
      // bottles on the back shelf
      k.at(k.mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.45, 6), null, [0x2a8040, 0x803020, 0x30408a][i % 3]), [-1.5 + i * 0.9, 2.15, -7.75]);
    }
    k.at(k.mesh(new THREE.BoxGeometry(6, 0.08, 0.4), "planks"), [1, 1.9, -7.8]);
    // a cup of coffee the size of a car, turning over the bar
    const cup = k.at(new THREE.Group(), [1, 3.4, -4.6]);
    k.group.add(cup);
    const mug = k.mesh(new THREE.CylinderGeometry(0.55, 0.45, 0.9, 14, 1, true), "plaster", 0xffffff);
    mug.position.set(0, 0, 0);
    cup.add(mug);
    const handle = k.mesh(new THREE.TorusGeometry(0.28, 0.07, 6, 12), "plaster", 0xffffff);
    handle.position.set(0.6, 0, 0);
    cup.add(handle);
    const coffee = k.mesh(new THREE.CircleGeometry(0.52, 14), null, 0x3a1a08);
    coffee.rotation.x = -Math.PI / 2;
    coffee.position.set(0, 0.3, 0);
    cup.add(coffee);
    k.spin(cup, 0, 0.5);
    k.bob(cup, 0.15, 0.2);

    // tables
    for (const [x, z] of [
      [-2.5, -2.4],
      [4.6, 1.6],
    ]) {
      k.at(k.mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.06, 14), "marble"), [x, 0.78, z]);
      k.at(k.mesh(new THREE.CylinderGeometry(0.06, 0.2, 0.78, 8), "paint", 0x404850), [x, 0.39, z]);
    }

    // the lounge: sofa, globe, lava lamp
    k.at(k.mesh(new THREE.BoxGeometry(1.1, 0.5, 3), "fabric", 0x7040a0), [-8, 0.25, 0.4]);
    k.at(k.mesh(new THREE.BoxGeometry(0.35, 1, 3), "fabric", 0x6030a0), [-8.5, 0.5, 0.4]);
    k.at(k.mesh(new THREE.BoxGeometry(1, 0.5, 1), "planks"), [-6.5, 0.25, -1.8]);
    k.globe([-6.5, 0.5, -1.8], 0.42);
    k.at(k.mesh(new THREE.BoxGeometry(0.7, 0.6, 0.7), "planks"), [-7.6, 0.3, 2.6]);
    k.lavaLamp([-7.6, 0.6, 2.6]);
    k.lavaLamp([8.3, 0, -6.9], 0x40ff60);

    // the jukebox
    k.at(k.mesh(new THREE.BoxGeometry(1.2, 1.8, 0.7), "woodFloor"), [6.6, 0.9, -7.5]);
    const glow = k.at(k.mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.7, 12, 1, false, -Math.PI / 2, Math.PI), null, 0xff60c0), [6.6, 1.8, -7.5]);
    (glow.material as THREE.MeshLambertMaterial).emissive.set(0xa02080);

    // the TV, tuned to the other servers
    k.screen([8.4, 2.5, -3], -Math.PI / 2, 1.5, ELSEWHERE.slice(6));
    k.sign(["CYBERCAFÉ", "open 24/7 · 28.8k"], [0, 2.95, -7.92], 0, [3.4, 1]);
    k.sign(["THE INFORMATION", "SUPERHIGHWAY", "starts here"], [8.92, 2.6, 2.2], -Math.PI / 2, [2, 1.3]);
    k.sign(["Y2K", "IS COMING"], [-4.4, 3.1, -7.92], 0, [1.4, 1]);
    k.sign(["NO FLAMING", "in the cafe pls"], [5.6, 3.1, -7.92], 0, [1.6, 0.8]);

    // a pot plant
    k.at(k.mesh(new THREE.CylinderGeometry(0.3, 0.22, 0.5, 8), "roof"), [-8.2, 0.25, -6.8]);
    k.at(k.mesh(new THREE.SphereGeometry(0.6, 7, 5), "turf", 0x80c060), [-8.2, 1, -6.8]);

    // ceiling fans
    for (const x of [-4, 4]) {
      const fan = k.at(new THREE.Group(), [x, H - 0.35, -1]);
      for (let i = 0; i < 4; i++) {
        const blade = k.mesh(new THREE.BoxGeometry(1.6, 0.03, 0.22), "planks");
        blade.position.set(0.8, 0, 0);
        const arm = new THREE.Group();
        arm.rotation.y = (i * Math.PI) / 2;
        arm.add(blade);
        fan.add(arm);
      }
      k.group.add(fan);
      k.spin(fan, 0, 2.4);
    }
    for (const x of [-4, 4]) {
      const lamp = new THREE.PointLight(0xffd0a0, 6, 9);
      lamp.position.set(x, H - 0.8, -1);
      k.group.add(lamp);
    }
    k.portal("hub", "GROUND ZERO", [8.2, 0, 4], -Math.PI / 2);
  },
};
