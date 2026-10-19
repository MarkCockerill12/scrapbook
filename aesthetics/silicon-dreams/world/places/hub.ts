import * as THREE from "three";
import type { TexName } from "../textures";
import type { WorldDef } from "../worlds";
import { ELSEWHERE, face } from "./shared";

/**
 * Ground Zero. Where everyone arrives: a paved plaza on a grass plain, the server's
 * mascot (a live blob) turning over a plinth, its spinning name in gold letters over the
 * portals, a ringed planet hanging in the afternoon sky.
 */
export const hub: WorldDef = {
  id: "hub",
  name: "Ground Zero",
  sky: 3,
  background: 0x6a8fc8,
  views: [
    { name: "plaza", pos: [0, 2.4, 11.5], tgt: [0, 3.4, 0] },
    { name: "mascot", pos: [6.4, 5.2, 8.6], tgt: [0, 4.8, 0] },
    { name: "portals", pos: [0, 2.2, -3.2], tgt: [0, 2.6, -10] },
    { name: "garden", pos: [-6, 2.4, 9.5], tgt: [-11.5, 2, 2.5] },
  ],
  light: { sky: 0xdfe8ff, ground: 0x5a6a3a, sun: 0xfff2d8, dir: [-0.5, 1, 0.6] },
  avatars: [
    { name: "Zonk", shirt: "fabric", tint: 0xd03030, home: [-3, 4], roam: 3.5 },
    { name: "CyberGrrl97", shirt: "fabric", tint: 0x8a40c8, hair: 0x101010, home: [3, 3], roam: 3 },
    { name: "Neo1999", shirt: "felt", tint: 0x303030, home: [1, 6], roam: 2.5 },
    { name: "RoboDude", kind: "robot", shirt: "paint", tint: 0x9aa4b0, home: [-4.5, -1.5], roam: 2.5 },
    { name: "mOOnchild", kind: "orb", shirt: "plaster", tint: 0xb8e0ff, home: [5, -2.5], roam: 2.5 },
    { name: "fishy", kind: "fish", shirt: "roof", tint: 0xff9a40, home: [0, 1], roam: 6.5, y: 3.2 },
    { name: "BIGHEAD", kind: "head", shirt: "felt", tint: 0x402010, home: [-8.5, 4.5], roam: 1.5 },
    { name: "luna", shirt: "fabric", tint: 0x40c0a0, hair: 0xe0d070, skin: 0xf0c8a8, home: [6.5, 5], roam: 2 },
    { name: "waddles", kind: "penguin", shirt: "felt", tint: 0x1a1a22, home: [-2, 6.5], roam: 2.5 },
    { name: "xX_UFO_Xx", kind: "ufo", shirt: "paint", tint: 0xb0b8c8, home: [4, -5], roam: 5, y: 1.6 },
    { name: "Zorp", kind: "alien", shirt: "fabric", tint: 0x303040, home: [-6, -4], roam: 2 },
    { name: "QuackAttack", kind: "duck", shirt: "paint", tint: 0xffd820, home: [3.5, 7.5], roam: 2 },
    { name: "JAWS_97", kind: "shark", shirt: "paint", tint: 0x7a8a9a, home: [0, -2], roam: 13, y: 7 },
  ],
  build(k) {
    const ground = k.mesh(new THREE.PlaneGeometry(220, 220), "grass", 0xffffff, 80);
    ground.rotation.x = -Math.PI / 2;
    const plaza = k.mesh(new THREE.CircleGeometry(9.5, 24), "paving", 0xffffff, 7);
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.y = 0.02;
    k.at(k.mesh(new THREE.CylinderGeometry(1.4, 1.7, 1.1, 10), "stone", 0xffffff, 2), [0, 0.55, 0]);
    k.blob([0, 4.6, 0], 3.4, 0xd42a1a);

    // things orbiting the mascot
    const ring = k.at(new THREE.Group(), [0, 4.6, 0]);
    k.group.add(ring);
    const things: [THREE.BufferGeometry, TexName, number][] = [
      [new THREE.SphereGeometry(0.75, 12, 8), "tiles", 0],
      [new THREE.ConeGeometry(0.85, 1.4, 4), "woodFloor", 1.6],
      [new THREE.BoxGeometry(1.1, 1.1, 1.1), "brick", 3.1],
      [new THREE.TorusGeometry(0.6, 0.22, 6, 14), "roof", 4.7],
    ];
    for (const [g, t, a] of things) {
      const m = k.mesh(g, t);
      ring.add(m);
      m.position.set(Math.cos(a) * 4.4, Math.sin(a * 1.7) * 0.8, Math.sin(a) * 4.4);
      k.spin(m, 0.7, 1.1);
    }
    k.spin(ring, 0, 0.25);

    k.logo("HYPERSPHERE", [0, 13, -15], 1.5);
    k.flare([-60, 55, -90]);
    k.planet([38, 34, -95], 9, "plaster", 0xe8c0a0, 0xd0b080);
    k.planet([-48, 26, -90], 4, "rock", 0xb0c8ff);

    k.sign(["WELCOME TO", "GROUND ZERO", "be excellent to each other"], [-6.8, 0, 3.5], 0.45);
    k.sign(["NEW!! THE VOID", "is open. enter at", "your own risk"], [7.4, 0, 2.8], -0.5, [2.2, 1.1]);
    for (const a of [0.6, 2.2, 3.9, 5.5]) {
      const x = Math.cos(a) * 9.8;
      const z = Math.sin(a) * 9.8;
      k.at(k.mesh(new THREE.CylinderGeometry(0.07, 0.1, 3.2, 6), "paint", 0x3a4048), [x, 1.6, z]);
      const lamp = k.at(k.mesh(new THREE.SphereGeometry(0.25, 8, 6), null, 0xfff2b0), [x, 3.3, z]);
      (lamp.material as THREE.MeshLambertMaterial).emissive.set(0xffe9a0);
    }
    k.portal("island", "SKY ISLAND", [-9.5, 0, -3], face(-9.5, -3, 0, 12));
    k.portal("cafe", "CYBERCAFÉ", [-3.6, 0, -9.6], face(-3.6, -9.6, 0, 12));
    k.portal("void", "THE VOID", [3.6, 0, -9.6], face(3.6, -9.6, 0, 12));
    k.portal("gallery", "RENDER GALLERY", [9.5, 0, -3], face(9.5, -3, 0, 12));

    // the sculpture garden: things on plinths that should not float, floating
    const plinths: [number, number][] = [
      [-11, 3],
      [-12.5, -0.5],
      [-9.5, 6.5],
    ];
    for (const [x, z] of plinths) k.at(k.mesh(new THREE.BoxGeometry(1, 1.2, 1), "stone"), [x, 0.6, z]);
    k.solid("ico", [-11, 2.4, 3], 0.7, "marble", 0xffffff);
    k.knot([-12.5, 2.4, -0.5], 0.55, 0x2a70ff);
    k.solid("octa", [-9.5, 2.3, 6.5], 0.7, "brick");
    k.solid("dodeca", [13, 5, -6], 1.1, "roof");
    k.solid("tetra", [-15, 6, -9], 1.2, "woodFloor");
    k.blob([12, 6.5, 4], 1.5, 0x20a0ff, { balls: 4, speed: 0.4 });

    // the other servers
    k.screen([8.6, 2.4, 6.2], -0.9, 1.3, ELSEWHERE.slice(0, 6));
    k.sign(["OTHER", "SERVERS"], [8.6, 3.5, 6.2], -0.9, [1.3, 0.5]);

    for (const [x, z, h] of [
      [-16, -6, 4],
      [-14, 8, 3.4],
      [-20, -16, 5],
      [15, 8, 3.6],
      [18, -8, 4.4],
      [22, -20, 5],
      [-8, -22, 4.2],
      [9, -24, 4.8],
      [-26, 2, 4],
      [27, 6, 4.3],
    ])
      k.tree(x, z, h);
  },
};
