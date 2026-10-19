import * as THREE from "three";
import type { WorldDef } from "../worlds";
import { face } from "./shared";

/**
 * Sky Island. A lump of rock with a lawn on top, hanging in the sky: builder_bob's
 * cottage, the house he hasn't finished, a windmill, a ladder that goes up into a sky
 * with a planet in it, and smaller islands drifting round with a tree each.
 */
export const island: WorldDef = {
  id: "island",
  name: "Sky Island",
  sky: 1,
  background: 0x5d86c4,
  views: [
    { name: "island", pos: [3, 4.4, 13], tgt: [0, 1.6, 0] },
    { name: "cottage", pos: [-4.4, 2.3, 4.6], tgt: [-1.6, 1.7, -2.5] },
    { name: "ladder", pos: [2, 1.8, 7], tgt: [7, 9, -6] },
    { name: "islets", pos: [-2.5, 3.2, 8], tgt: [-14, 1.2, -6] },
  ],
  light: { sky: 0xe8f0ff, ground: 0x6a5a40, sun: 0xfff4e0, dir: [0.6, 1, 0.4] },
  avatars: [
    { name: "builder_bob", shirt: "fabric", tint: 0xe07a20, home: [3.8, -1.2], roam: 1.2 },
    { name: "DarkKnight", shirt: "felt", tint: 0x202028, home: [-3, 3], roam: 2.2 },
    { name: "~*Angel*~", shirt: "fabric", tint: 0xf0b0d0, hair: 0xe8d070, skin: 0xf0c8a8, home: [0.5, 4.5], roam: 2 },
    { name: "goldie", kind: "fish", shirt: "roof", tint: 0xffd040, home: [0, 0], roam: 10.5, y: 2.2 },
    { name: "SkyPilot", kind: "robot", shirt: "paint", tint: 0xd8c8a0, home: [5.5, 3.5], roam: 1.5 },
    { name: "Tweety_99", kind: "bird", shirt: "fabric", tint: 0x60b0ff, home: [-2, -2], roam: 6, y: 6.5 },
    { name: "Frosty", kind: "snowman", shirt: "plaster", tint: 0xffffff, home: [-4.5, 1], roam: 1.5 },
    { name: "i_c_u", kind: "eyewalker", shirt: "paint", tint: 0xffffff, home: [1.5, -5.5], roam: 1.5 },
    { name: "SKY_SHARK", kind: "shark", shirt: "paint", tint: 0x5a6a80, home: [0, 0], roam: 16, y: -3 },
  ],
  bounds: { min: [-60, -18, -60], max: [60, 40, 60] },
  build(k) {
    const isle = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 0.6, 18, 1), [k.skin("rock", 0xffffff, 6), k.skin("turf", 0xffffff, 8), k.skin("rock", 0xffffff, 6)]);
    isle.position.y = -0.3;
    k.group.add(isle);
    const under = k.mesh(new THREE.ConeGeometry(9, 8, 18, 1, true), "rock", 0xd0c8c0, 5);
    under.rotation.x = Math.PI;
    under.position.y = -4.6;

    // smaller islands, each with a tree
    for (const [x, y, z, r] of [
      [-15, 1, -6, 2.4],
      [14, 3, -10, 2],
      [-9, 6, -18, 1.8],
      [18, -2, 4, 2.2],
    ]) {
      const g = k.at(new THREE.Group(), [x, y, z]);
      k.group.add(g);
      const top = k.mesh(new THREE.CylinderGeometry(r, r, 0.4, 10), "turf", 0xffffff, 2);
      g.add(top);
      top.position.set(0, 0, 0);
      const bottom = k.mesh(new THREE.ConeGeometry(r, r * 1.6, 10), "rock", 0xffffff, 2);
      bottom.rotation.x = Math.PI;
      bottom.position.set(0, -r * 0.8 - 0.2, 0);
      g.add(bottom);
      const trunk = k.mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.2, 6), "planks");
      trunk.position.set(0, 0.8, 0);
      g.add(trunk);
      const crown = k.mesh(new THREE.ConeGeometry(0.8, 1.8, 7), "turf", 0xa0c080);
      crown.position.set(0, 2, 0);
      g.add(crown);
      k.bob(g, 0.4, 0.08 + r * 0.02);
    }
    for (const [x, y, z, s] of [
      [-13, -1, 2, 1.1],
      [12, 1.5, -4, 0.8],
      [16, -3, 9, 1.4],
    ]) {
      const rock = k.at(k.mesh(new THREE.DodecahedronGeometry(s, 0), "rock"), [x, y, z]);
      k.bob(rock, 0.3, 0.2);
      k.spin(rock, 0.05, 0.1);
    }

    // the cottage
    k.at(k.mesh(new THREE.BoxGeometry(4.4, 3, 3.6), "brick", 0xffffff, 2), [-2, 1.5, -2.5]);
    const roof = k.at(k.mesh(new THREE.ConeGeometry(3.6, 2, 4), "roof", 0xffffff, 3), [-2, 4, -2.5]);
    roof.rotation.y = Math.PI / 4;
    k.at(k.mesh(new THREE.BoxGeometry(0.9, 1.8, 0.1), "planks"), [-2, 0.9, -0.68]);
    k.at(k.mesh(new THREE.PlaneGeometry(0.8, 0.7), null, 0x9ad0ff), [-0.8, 1.9, -0.69]);
    k.at(k.mesh(new THREE.PlaneGeometry(0.8, 0.7), null, 0x9ad0ff), [-3.2, 1.9, -0.69]);
    k.at(k.mesh(new THREE.BoxGeometry(0.5, 1.2, 0.5), "brick"), [-0.8, 4.4, -3.2]);
    const mailbox = k.at(k.mesh(new THREE.BoxGeometry(0.35, 0.3, 0.5), "paint", 0x2050c0), [0.6, 1.05, 0.6]);
    k.at(k.mesh(new THREE.BoxGeometry(0.07, 0.9, 0.07), "planks"), [0.6, 0.45, 0.6]);
    mailbox.rotation.y = 0.3;

    // the one being built: two walls, and a brick hanging where it will go
    k.at(k.mesh(new THREE.BoxGeometry(3, 1.6, 0.25), "stone"), [4, 0.8, -3.5]);
    k.at(k.mesh(new THREE.BoxGeometry(0.25, 1.6, 2.6), "stone"), [5.4, 0.8, -2.2]);
    const brick = k.at(k.mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), "stone"), [3.2, 2.4, -2.2]);
    k.bob(brick, 0.15, 1.4);
    k.spin(brick, 0, 0.6);

    // a windmill
    k.at(k.mesh(new THREE.CylinderGeometry(0.5, 0.9, 4.5, 8), "plaster", 0xf0e8d8), [-6.2, 2.25, 1.2]);
    k.at(k.mesh(new THREE.ConeGeometry(0.75, 1, 8), "roof"), [-6.2, 5, 1.2]);
    const sails = k.at(new THREE.Group(), [-6.2, 4.2, 1.95]);
    k.group.add(sails);
    for (let i = 0; i < 4; i++) {
      const arm = new THREE.Group();
      arm.rotation.z = (i * Math.PI) / 2;
      const sail = k.mesh(new THREE.BoxGeometry(0.5, 2.4, 0.05), "fabric", 0xf8f0e0);
      sail.position.set(0, 1.3, 0);
      arm.add(sail);
      sails.add(arm);
    }
    k.spin(sails, 0, 0, 0.9);

    // a ladder to nowhere, and what it seems to be for
    for (const s of [-0.3, 0.3]) k.at(k.mesh(new THREE.BoxGeometry(0.08, 14, 0.08), "planks"), [6 + s, 7, 2]);
    for (let i = 0; i < 28; i++) k.at(k.mesh(new THREE.BoxGeometry(0.6, 0.06, 0.06), "planks"), [6, 0.3 + i * 0.5, 2]);
    k.planet([10, 24, -26], 6, "turf", 0xa0e0a0, 0xe0c890);
    k.solid("ico", [7.5, 15, -2], 0.9, "tiles", 0xc0d8ff);
    k.flare([70, 60, -60]);

    for (let i = 0; i < 7; i++) k.at(k.mesh(new THREE.BoxGeometry(0.12, 0.9, 0.12), "planks"), [-6 + i * 1.1, 0.45, 5.8]);
    k.at(k.mesh(new THREE.BoxGeometry(7, 0.1, 0.08), "planks", 0xffffff, 3), [-2.7, 0.75, 5.8]);
    k.sign(["HOME SWEET HOME", "(under construction)", "- builder_bob"], [1.5, 0, 2.5], -0.2, [2.2, 1]);
    k.sign(["LAND FOR SALE", "register now!", "only 5 bricks"], [-7.3, 0, -4.5], 0.9, [1.8, 0.9]);
    k.tree(-6.5, -1.5, 3.4);
    k.tree(-3.5, 6.8, 2.8);
    k.tree(5, 5.5, 3);
    k.tree(-7, -5.5, 3.8);
    k.tree(2.5, -6, 3.2);
    k.portal("hub", "GROUND ZERO", [7, 0, -5.5], face(7, -5.5, 3, 13));
  },
};
