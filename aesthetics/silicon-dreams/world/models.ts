import * as THREE from "three";
import type { Skin } from "./avatar";
import { photo, textTexture, type TexName } from "./textures";

/**
 * What avatars are made of. 1996 chat servers let you be anything their artists had
 * modelled in an afternoon: people, robots, a fish, a head, a duck, a UFO. Every model is
 * a handful of primitives; the Avatar class only needs to know which parts swing.
 */

export type Kind =
  | "person"
  | "robot"
  | "alien"
  | "tvhead"
  | "orb"
  | "head"
  | "ghost"
  | "ufo"
  | "fish"
  | "shark"
  | "bird"
  | "penguin"
  | "duck"
  | "snowman"
  | "eyewalker";

/** How it gets about. */
export type Motion = "walk" | "waddle" | "slide" | "float" | "circle";

export interface Model {
  motion: Motion;
  legL?: THREE.Object3D;
  legR?: THREE.Object3D;
  armL?: THREE.Object3D;
  armR?: THREE.Object3D;
  tail?: THREE.Object3D;
  wings?: [THREE.Object3D, THREE.Object3D];
  spinners?: THREE.Object3D[];
  tagY: number;
  bubbleY: number;
}

export interface Look {
  shirt: TexName;
  tint: number;
  skin?: number;
  hair?: number;
}

const box = (w: number, h: number, d: number, mat: THREE.Material, y = -h / 2) => {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(0, y, 0);
  return new THREE.Mesh(g, mat);
};
const ball = (r: number, mat: THREE.Material, w = 10, h = 8) => new THREE.Mesh(new THREE.SphereGeometry(r, w, h), mat);
const put = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number, parent: THREE.Object3D): T => {
  o.position.set(x, y, z);
  parent.add(o);
  return o;
};

/** People and things shaped like people. */
function humanoid(body: THREE.Group, look: Look, skin: Skin, kind: "person" | "robot" | "alien" | "tvhead"): Model {
  const robot = kind === "robot";
  const shirt = skin(look.shirt, look.tint, 1);
  const skinMat = robot ? skin("paint", 0x9aa4b0) : kind === "alien" ? skin(null, 0x7ad860) : skin(null, look.skin ?? 0xe0ac86);
  const legs = robot ? skinMat : skin("felt", 0x334466);
  const hip = put(new THREE.Group(), 0, 0.85, 0, body);
  const legL = put(new THREE.Group(), -0.11, 0, 0, hip);
  const legR = put(new THREE.Group(), 0.11, 0, 0, hip);
  for (const leg of [legL, legR]) leg.add(box(0.18, 0.85, 0.2, legs));
  hip.add(box(0.56, 0.7, 0.3, shirt, 0.35));
  const armL = put(new THREE.Group(), -0.37, 0.66, 0, hip);
  const armR = put(new THREE.Group(), 0.37, 0.66, 0, hip);
  for (const arm of [armL, armR]) arm.add(box(0.15, 0.66, 0.17, kind === "alien" ? skinMat : shirt));
  const dark = skin(null, robot ? 0x30e0ff : 0x141414);
  if (kind === "tvhead") {
    // a television for a head, showing a face
    put(box(0.6, 0.48, 0.46, skin("paint", 0xd8d0b8), 0.24), 0, 0.72, 0, hip);
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(0.44, 0.32),
      new THREE.MeshBasicMaterial({ map: textTexture([":-)"], { w: 64, h: 48, bg: "#103060", fg: "#9fffd0", font: "bold 30px Arial, sans-serif" }) }),
    );
    put(face, 0, 0.96, 0.235, hip);
    put(box(0.02, 0.3, 0.02, dark, 0.15), -0.12, 1.2, 0, hip).rotation.z = 0.5;
    put(box(0.02, 0.3, 0.02, dark, 0.15), 0.12, 1.2, 0, hip).rotation.z = -0.5;
  } else if (kind === "alien") {
    // a big green head with big black eyes
    put(box(0.52, 0.56, 0.46, skinMat, 0.28), 0, 0.74, 0, hip);
    for (const s of [-1, 1]) put(box(0.16, 0.11, 0.02, dark, 0), 0.12 * s, 1.07, 0.24, hip).rotation.z = 0.35 * s;
  } else {
    put(box(0.36, 0.38, 0.34, skinMat, 0.19), 0, 0.76, 0, hip);
    if (robot) {
      put(box(0.3, 0.07, 0.02, dark, 0), 0, 0.98, 0.18, hip);
      put(box(0.03, 0.22, 0.03, skinMat, 0.11), 0, 1.14, 0, hip);
    } else {
      for (const s of [-1, 1]) put(box(0.06, 0.05, 0.02, dark, 0), 0.08 * s, 0.98, 0.18, hip);
      put(box(0.38, 0.1, 0.36, skin(null, look.hair ?? 0x3a2414), 0.05), 0, 1.12, 0, hip);
    }
  }
  return { motion: "walk", legL, legR, armL, armR, tagY: kind === "tvhead" || kind === "alien" ? 2.3 : 2.15, bubbleY: 2.7 };
}

function fishy(body: THREE.Group, look: Look, skin: Skin, shark: boolean): Model {
  const s = shark ? 2.2 : 1;
  const scales = skin(look.shirt, look.tint, 1);
  const torso = put(ball(0.5 * s, scales), 0, 0, 0, body);
  torso.scale.set(0.55, 0.7, 1.2);
  const tail = put(new THREE.Group(), 0, 0, -0.55 * s, body);
  const fin = put(new THREE.Mesh(new THREE.ConeGeometry(0.35 * s, 0.6 * s, 4), scales), 0, 0, -0.25 * s, tail);
  fin.rotation.x = Math.PI / 2;
  fin.scale.x = 0.25;
  const dorsal = put(new THREE.Mesh(new THREE.ConeGeometry(0.2 * s, (shark ? 0.9 : 0.5) * s, 3), scales), 0, (shark ? 0.5 : 0.42) * s, -0.1 * s, body);
  dorsal.scale.z = 1.6;
  if (shark) {
    // a pale belly and a row of teeth
    const belly = put(ball(0.48 * s, skin(null, 0xe8e8e0)), 0, -0.08 * s, 0.05, body);
    belly.scale.set(0.5, 0.5, 1.1);
    for (let i = -2; i <= 2; i++) put(new THREE.Mesh(new THREE.ConeGeometry(0.04 * s, 0.1 * s, 3), skin(null, 0xffffff)), i * 0.05 * s, -0.12 * s, 0.52 * s, body).rotation.x = Math.PI;
  }
  const eyeMat = skin(null, 0x0a0a0a);
  for (const side of [-1, 1]) put(ball(0.07 * s, eyeMat, 6, 4), 0.26 * s * side, 0.1 * s, 0.4 * s, body);
  return { motion: "circle", tail, tagY: shark ? 1.6 : 0.75, bubbleY: shark ? 2 : 1.3 };
}

/** Make one model of the given kind, into `body`. */
export function build(kind: Kind, body: THREE.Group, look: Look, skin: Skin): Model {
  switch (kind) {
    case "person":
    case "robot":
    case "alien":
    case "tvhead":
      return humanoid(body, look, skin, kind);
    case "fish":
      return fishy(body, look, skin, false);
    case "shark":
      return fishy(body, look, skin, true);
    case "orb": {
      put(ball(0.45, skin(look.shirt, look.tint, 1)), 0, 1.55, 0, body);
      const eye = skin(null, 0x111111);
      for (const s of [-1, 1]) put(ball(0.07, eye, 6, 4), 0.15 * s, 1.65, 0.4, body);
      return { motion: "float", tagY: 2.15, bubbleY: 2.7 };
    }
    case "head": {
      put(box(1.2, 1.3, 1.1, skin(null, look.skin ?? 0xe0ac86), 0), 0, 2.1, 0, body);
      const dark = skin(null, 0x141414);
      for (const s of [-1, 1]) put(box(0.2, 0.16, 0.04, dark, 0), 0.26 * s, 2.25, 0.56, body);
      put(box(0.5, 0.08, 0.04, skin(null, 0x8a2020), 0), 0, 1.8, 0.56, body);
      put(box(1.26, 0.3, 1.16, skin(look.shirt, look.tint, 1), 0), 0, 2.85, 0, body);
      return { motion: "float", tagY: 3.3, bubbleY: 3.9 };
    }
    case "ghost": {
      const sheet = new THREE.MeshLambertMaterial({ color: 0xf4f4ff, transparent: true, opacity: 0.72 });
      put(ball(0.5, sheet, 12, 8), 0, 1.6, 0, body);
      put(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.62, 1, 12, 1, true), sheet), 0, 1.1, 0, body);
      const eye = skin(null, 0x101018);
      for (const s of [-1, 1]) put(box(0.12, 0.2, 0.04, eye, 0), 0.16 * s, 1.68, 0.46, body);
      put(ball(0.09, eye, 6, 4), 0, 1.42, 0.46, body);
      return { motion: "float", tagY: 2.35, bubbleY: 2.9 };
    }
    case "ufo": {
      const saucer = put(ball(1, skin("paint", 0xb0b8c8, 1), 18, 8), 0, 3.2, 0, body);
      saucer.scale.set(1.1, 0.22, 1.1);
      put(ball(0.45, new THREE.MeshPhongMaterial({ color: 0x80ffd0, transparent: true, opacity: 0.6, shininess: 100 }), 12, 8), 0, 3.42, 0, body);
      const lights = put(new THREE.Group(), 0, 3.2, 0, body);
      for (let i = 0; i < 8; i++) {
        const l = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xff4040 : 0xffff60 }));
        l.position.set(Math.cos((i / 8) * Math.PI * 2) * 1.05, 0, Math.sin((i / 8) * Math.PI * 2) * 1.05);
        lights.add(l);
      }
      const beam = put(new THREE.Mesh(new THREE.ConeGeometry(0.8, 3, 14, 1, true), new THREE.MeshBasicMaterial({ color: 0xc0ffe0, transparent: true, opacity: 0.12, side: THREE.DoubleSide })), 0, 1.6, 0, body);
      beam.userData.noPick = true;
      return { motion: "float", spinners: [lights], tagY: 4, bubbleY: 4.5 };
    }
    case "bird": {
      const feathers = skin(look.shirt, look.tint, 1);
      put(ball(0.3, feathers), 0, 0, 0, body).scale.set(0.8, 0.8, 1.3);
      put(ball(0.2, feathers), 0, 0.18, 0.35, body);
      put(new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 4), skin(null, 0xffa020)), 0, 0.16, 0.6, body).rotation.x = Math.PI / 2;
      const eye = skin(null, 0x101010);
      for (const s of [-1, 1]) put(ball(0.04, eye, 5, 4), 0.11 * s, 0.24, 0.48, body);
      const wingL = put(new THREE.Group(), -0.2, 0.05, 0, body);
      const wingR = put(new THREE.Group(), 0.2, 0.05, 0, body);
      put(box(0.7, 0.04, 0.4, feathers, 0), -0.35, 0, 0, wingL);
      put(box(0.7, 0.04, 0.4, feathers, 0), 0.35, 0, 0, wingR);
      return { motion: "circle", wings: [wingL, wingR], tagY: 0.7, bubbleY: 1.1 };
    }
    case "penguin": {
      const black = skin("felt", 0x1a1a22, 1);
      put(ball(0.45, black, 12, 10), 0, 0.75, 0, body).scale.set(1, 1.5, 0.9);
      put(ball(0.36, skin(null, 0xf8f8f8), 12, 10), 0, 0.68, 0.14, body).scale.set(0.95, 1.4, 0.8);
      put(ball(0.3, black), 0, 1.55, 0, body);
      put(new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.25, 6), skin(null, 0xffa020)), 0, 1.5, 0.33, body).rotation.x = Math.PI / 2;
      const eye = skin(null, 0xffffff);
      for (const s of [-1, 1]) put(ball(0.05, eye, 5, 4), 0.11 * s, 1.62, 0.25, body);
      const armL = put(new THREE.Group(), -0.42, 1.05, 0, body);
      const armR = put(new THREE.Group(), 0.42, 1.05, 0, body);
      armL.add(box(0.08, 0.55, 0.25, black));
      armR.add(box(0.08, 0.55, 0.25, black));
      const feet = skin(null, 0xffa020);
      const legL = put(new THREE.Group(), -0.16, 0.08, 0.1, body);
      const legR = put(new THREE.Group(), 0.16, 0.08, 0.1, body);
      legL.add(box(0.18, 0.06, 0.3, feet, 0));
      legR.add(box(0.18, 0.06, 0.3, feet, 0));
      return { motion: "waddle", armL, armR, legL, legR, tagY: 2.1, bubbleY: 2.6 };
    }
    case "duck": {
      // a rubber duck, and a large one
      const yellow = new THREE.MeshPhongMaterial({ color: 0xffd820, shininess: 60, specular: 0x666666 });
      put(ball(0.55, yellow, 12, 10), 0, 0.5, 0, body).scale.set(1, 0.8, 1.25);
      put(ball(0.36, yellow), 0, 1.1, 0.35, body);
      put(box(0.3, 0.1, 0.32, skin(null, 0xff7a10), 0), 0, 1.04, 0.72, body);
      const eye = skin(null, 0x101010);
      for (const s of [-1, 1]) put(ball(0.05, eye, 5, 4), 0.17 * s, 1.2, 0.62, body);
      const tail = put(new THREE.Group(), 0, 0.7, -0.62, body);
      tail.add(new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.35, 5), yellow)).rotation.x = -2.2;
      return { motion: "waddle", tail, tagY: 1.8, bubbleY: 2.3 };
    }
    case "snowman": {
      const snow = skin("plaster", 0xffffff, 1);
      put(ball(0.6, snow, 12, 10), 0, 0.55, 0, body);
      put(ball(0.42, snow, 12, 10), 0, 1.35, 0, body);
      put(ball(0.3, snow, 12, 10), 0, 1.95, 0, body);
      put(new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.32, 6), skin(null, 0xff7020)), 0, 1.95, 0.42, body).rotation.x = Math.PI / 2;
      const coal = skin(null, 0x101010);
      for (const s of [-1, 1]) put(ball(0.04, coal, 5, 4), 0.1 * s, 2.05, 0.27, body);
      for (const y of [1.2, 1.4, 1.6]) put(ball(0.045, coal, 5, 4), 0, y, 0.4, body);
      put(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.35, 10), coal), 0, 2.35, 0, body);
      put(new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.04, 12), coal), 0, 2.18, 0, body);
      const armL = put(new THREE.Group(), -0.4, 1.4, 0, body);
      const armR = put(new THREE.Group(), 0.4, 1.4, 0, body);
      armL.add(box(0.04, 0.7, 0.04, skin("planks", 0x806040))).rotation.z = 1.1;
      armR.add(box(0.04, 0.7, 0.04, skin("planks", 0x806040))).rotation.z = -1.1;
      return { motion: "slide", tagY: 2.8, bubbleY: 3.3 };
    }
    case "eyewalker": {
      // an eyeball on legs, with a real iris
      const g = put(new THREE.Group(), 0, 1.2, 0, body);
      g.add(ball(0.5, new THREE.MeshPhongMaterial({ color: 0xf2ece4, shininess: 60 }), 14, 10));
      const irisMat = new THREE.MeshPhongMaterial({ color: 0x806040, shininess: 90 });
      photo("sd_eye", 1, 128).then((t) => {
        t.repeat.set(0.56, 0.84);
        t.offset.set(0.22, 0.08);
        irisMat.map = t;
        irisMat.color.set(0xffffff);
        irisMat.needsUpdate = true;
      });
      const cap = new THREE.SphereGeometry(0.505, 16, 6, 0, Math.PI * 2, 0, 0.5);
      cap.rotateX(Math.PI / 2);
      const p = cap.attributes.position;
      const uv = cap.attributes.uv;
      const ir = 0.505 * Math.sin(0.5);
      for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / (2 * ir) + 0.5, p.getY(i) / (2 * ir) + 0.5);
      g.add(new THREE.Mesh(cap, irisMat));
      const legMat = skin(null, 0xc06050);
      const legL = put(new THREE.Group(), -0.18, 0.78, 0, body);
      const legR = put(new THREE.Group(), 0.18, 0.78, 0, body);
      legL.add(box(0.07, 0.78, 0.07, legMat));
      legR.add(box(0.07, 0.78, 0.07, legMat));
      for (const leg of [legL, legR]) put(box(0.16, 0.05, 0.24, legMat, -0.8), 0, 0, 0.05, leg);
      return { motion: "walk", legL, legR, tagY: 2, bubbleY: 2.5 };
    }
  }
}

/** What each kind says, besides the server's small talk. */
export const KIND_LINES: Partial<Record<Kind, string[]>> = {
  fish: ["glub glub", "blub", "i am a fish", "how did i get up here", "anyone got water"],
  shark: ["dun dun", "dun dun dun dun", "nom", "im a vegetarian shark", "fish are friends"],
  bird: ["tweet", "TWEET TWEET", "caw", "i can see ur house from here"],
  duck: ["quack", "QUACK", "quack quack", "*squeak*", "i was in someones bath"],
  penguin: ["waddle waddle", "its too warm here", "*slides*", "anyone got fish"],
  ufo: ["take me to ur leader", "beep boop", "we come in peace", "nice planet"],
  ghost: ["boooo", "ooOOoooOO", "i died of lag", "dont be scared lol"],
  snowman: ["its cold up here", "dont touch my nose", "im melting", "brrr"],
  eyewalker: ["i see u", "*stares*", "i have been watching", "blink"],
  tvhead: ["please stand by", "channel 3", "*static*", "we will return after these messages"],
  alien: ["greetings earthling", "zorp", "ur avatars are so primitive", "phone home"],
  robot: ["BEEP", "01101000 01101001", "does not compute"],
};
