import * as THREE from "three";

/**
 * The thing in the corridor.
 *
 * Second body (2026-10). The first one was a tall thin person, and a person is a
 * known quantity. Mark: "less humanoid, more creepy and shrouded and unfamiliar, like
 * we don't know what kind of monster it is, and make it look right at you when you're
 * under the table."
 *
 * So there is no body to read any more. There is a shroud — a tall, ragged, folded
 * mass with a hollow where a face would go — and it does not walk, it is hauled:
 * too many arms come out from under the cloth, far too long, and take the wall and
 * the carpet a hand at a time. When it has found you it does not crouch like a
 * person. The whole mass folds over until the hollow is level with the gap under the
 * table, and the hollow turns, exactly, to where you are.
 *
 * Built facing +z (towards the camera).
 */

export interface Figure {
  root: THREE.Group;
  body: THREE.Group;
  shroud: THREE.Mesh;
  hood: THREE.Group;
  eyes: THREE.MeshBasicMaterial;
  arms: { shoulder: THREE.Group; elbow: THREE.Group; side: number; high: number }[];
  dispose: () => void;
}

const TALL = 356;
const HOOD_Y = 312;
/** the cloth leans forward as it rises; the hollow has to sit proud of it */
const HOOD_Z = 66;

function hash(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function buildFigure(): Figure {
  const cloth = new THREE.MeshStandardMaterial({ color: 0x050404, roughness: 1, metalness: 0, side: THREE.DoubleSide });
  const limbMat = new THREE.MeshStandardMaterial({ color: 0x0a0807, roughness: 0.8 });
  const voidMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const eyes = new THREE.MeshBasicMaterial({ color: 0xfff2d0, transparent: true, opacity: 0, toneMapped: false });
  const geos: THREE.BufferGeometry[] = [];

  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  // ---- the shroud: a lathe, then ruined ----------------------------------
  const profile: THREE.Vector2[] = [];
  const P: [number, number][] = [
    [78, 0],
    [70, 30],
    [58, 90],
    [47, 170],
    [42, 235],
    [50, 280],
    [56, 310],
    [48, 338],
    [22, 354],
    [0, TALL],
  ];
  for (const [r, y] of P) profile.push(new THREE.Vector2(r, y));
  const lathe = new THREE.LatheGeometry(new THREE.SplineCurve(profile).getPoints(40), 56);
  const pos = lathe.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const ang = Math.atan2(z, x);
    const low = 1 - Math.min(1, y / TALL);
    // long vertical folds, deeper towards the hem; flattened front to back
    const fold = 1 + (Math.sin(ang * 9 + y * 0.012) * 0.1 + Math.sin(ang * 4 - y * 0.02) * 0.08) * (0.35 + low);
    const lean = y * y * 0.00042;
    pos.setXYZ(i, x * fold, y, z * fold * 0.78 + lean);
  }
  // a hem that has been dragged along carpet for a very long time
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) < 1) {
      const ang = Math.atan2(pos.getZ(i), pos.getX(i));
      pos.setY(i, hash(Math.round(ang * 9)) * 26);
    }
  }
  lathe.computeVertexNormals();
  geos.push(lathe);
  const shroud = new THREE.Mesh(lathe, cloth);
  shroud.castShadow = true;
  body.add(shroud);

  // strips of it hanging loose
  for (let k = 0; k < 9; k++) {
    const g = new THREE.PlaneGeometry(9 + hash(k) * 14, 70 + hash(k + 20) * 120, 1, 4);
    geos.push(g);
    const strip = new THREE.Mesh(g, cloth);
    const a = (k / 9) * Math.PI * 2 + hash(k + 5);
    strip.position.set(Math.cos(a) * 62, 60 + hash(k + 9) * 60, Math.sin(a) * 50);
    strip.rotation.set(hash(k + 3) * 0.3, -a + Math.PI / 2, hash(k + 7) * 0.4 - 0.2);
    strip.castShadow = true;
    body.add(strip);
  }

  // ---- the hollow ---------------------------------------------------------
  const hood = new THREE.Group();
  hood.position.set(0, HOOD_Y, HOOD_Z);
  const cowlG = new THREE.SphereGeometry(52, 28, 20, 0, Math.PI * 2, 0, Math.PI * 0.72);
  cowlG.rotateX(-Math.PI / 2);
  // the opening faces +z; rag the rim
  const cp = cowlG.attributes.position;
  for (let i = 0; i < cp.count; i++) {
    const z = cp.getZ(i);
    if (z > 20) {
      const a = Math.atan2(cp.getY(i), cp.getX(i));
      cp.setZ(i, z + hash(Math.round(a * 7)) * 22);
    }
  }
  cowlG.computeVertexNormals();
  geos.push(cowlG);
  const cowl = new THREE.Mesh(cowlG, cloth);
  cowl.scale.set(0.86, 1.18, 1);
  cowl.castShadow = true;
  hood.add(cowl);
  const pitG = new THREE.CircleGeometry(40, 24);
  geos.push(pitG);
  const pit = new THREE.Mesh(pitG, voidMat);
  pit.position.z = 6;
  pit.scale.set(0.86, 1.18, 1);
  hood.add(pit);
  // not two eyes. more than that, and not in a row.
  const eyeG = new THREE.SphereGeometry(1, 10, 8);
  geos.push(eyeG);
  const EYES: [number, number, number][] = [
    [-11, 10, 2.6],
    [9, 14, 2.1],
    [-3, -4, 1.5],
    [15, -9, 1.2],
    [-18, -13, 1.1],
    [3, -22, 0.9],
    [-7, 26, 0.8],
  ];
  for (const [x, y, r] of EYES) {
    const e = new THREE.Mesh(eyeG, eyes);
    e.position.set(x, y, 8);
    e.scale.setScalar(r);
    hood.add(e);
  }
  body.add(hood);

  // ---- the arms: too many, too long ---------------------------------------
  const limb = (len: number, r0: number, r1: number) => {
    const g = new THREE.CylinderGeometry(r1, r0, len, 7);
    g.translate(0, -len / 2, 0);
    geos.push(g);
    const m = new THREE.Mesh(g, limbMat);
    m.castShadow = true;
    return m;
  };
  const arms: Figure["arms"] = [];
  const SPEC: [number, number, number, number][] = [
    // side, height it leaves the cloth, upper length, fore length
    [-1, 236, 130, 170],
    [1, 244, 124, 182],
    [-1, 150, 110, 150],
    [1, 162, 118, 140],
    [1, 96, 90, 120],
  ];
  for (const [side, high, upper, fore] of SPEC) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 34, high, 14);
    shoulder.add(limb(upper, 5, 3.4));
    const elbow = new THREE.Group();
    elbow.position.y = -upper;
    elbow.add(limb(fore, 3.4, 2));
    for (let k = 0; k < 5; k++) {
      const finger = limb(40 + hash(k + high) * 26, 1.5, 0.5);
      finger.position.set((k - 2) * 2.6, -fore + 2, 0);
      finger.rotation.set(0.25 + hash(k * 3 + high) * 0.4, 0, (k - 2) * 0.16);
      elbow.add(finger);
    }
    shoulder.add(elbow);
    body.add(shoulder);
    arms.push({ shoulder, elbow, side, high });
  }

  return {
    root,
    body,
    shroud,
    hood,
    eyes,
    arms,
    dispose: () => {
      geos.forEach((g) => g.dispose());
      cloth.dispose();
      limbMat.dispose();
      voidMat.dispose();
      eyes.dispose();
    },
  };
}

const smooth = (v: number) => {
  const k = Math.max(0, Math.min(1, v));
  return k * k * (3 - 2 * k);
};
const RAD = Math.PI / 180;
const rest = new THREE.Quaternion();
const want = new THREE.Quaternion();
const probe = new THREE.Object3D();
const hoodWorld = new THREE.Vector3();

/**
 * Put it where it is at `t` seconds into what it is doing. `eye` is where you are.
 * Returns the index of the haul it is on while going past, else null.
 */
export function poseFigure(f: Figure, mode: "pass" | "rush", t: number, anchor: number, floorY: number, eye: THREE.Vector3): number | null {
  let z = 0;
  let x = 0;
  let walk = 0;
  let phase = 0;
  let turn = 0;
  let look = 0;
  let fold = 0;
  let reach = 0;
  let haul: number | null = null;

  if (mode === "pass") {
    // It comes down the corridor a pull at a time, stops level with the table, and
    // for a while does nothing. Then it folds.
    const STEP = 0.86;
    const STRIDE = 186;
    const arrive = 2.2;
    const stepsIn = 7;
    const stopAt = arrive + stepsIn * STEP;
    const wait = 5.2;
    const from = -stepsIn * STRIDE - 30;
    const surge = (u: number) => {
      const n = Math.floor(u);
      const fr = u - n;
      return n + (fr < 0.55 ? 0 : 0.5 - 0.5 * Math.cos(((fr - 0.55) / 0.45) * Math.PI));
    };
    x = -200;
    if (t < arrive) {
      z = from;
    } else if (t < stopAt) {
      const u = (t - arrive) / STEP;
      z = from + surge(u) * STRIDE;
      phase = u;
      walk = 1;
      haul = Math.floor(u);
    } else if (t < stopAt + wait) {
      z = -30;
      phase = stepsIn;
      const w = (t - stopAt) / wait;
      const out = 1 - smooth((w - 0.86) / 0.14);
      turn = smooth((w - 0.1) / 0.16) * out;
      fold = smooth((w - 0.24) / 0.22) * out;
      look = smooth((w - 0.3) / 0.14) * out;
    } else {
      const u = (t - stopAt - wait) / STEP;
      z = -30 + surge(u) * STRIDE;
      phase = stepsIn + u;
      walk = 1;
      haul = stepsIn + Math.floor(u);
    }
    f.root.visible = t >= arrive;
  } else {
    // It has seen you. It does not haul. It simply arrives.
    const k = Math.min(1, t / 0.95);
    z = -2300 + (2300 - 150) * k * k;
    phase = t * 6;
    walk = 1.3;
    reach = k;
    look = 1;
  }

  const beat = phase - Math.floor(phase);
  const s = Math.sin(phase * Math.PI);

  f.root.position.set(x, floorY, anchor + z);
  f.root.rotation.y = turn * 86 * RAD;

  // the mass: sways as it is dragged, and folds forward from the hem
  f.body.rotation.x = (4 + walk * 9 * Math.max(0, Math.sin(beat * Math.PI)) + fold * 30 + reach * 20) * RAD;
  f.body.rotation.z = (s * 3.4 * walk + Math.sin(t * 0.9) * 1.1) * RAD;
  f.shroud.scale.set(1 + fold * 0.22, 1 - fold * 0.34, 1 + fold * 0.12);
  f.shroud.rotation.y = Math.sin(t * 0.4) * 0.05;
  // the top of it droops further than the cloth does, on whatever is in there
  f.hood.position.set(0, HOOD_Y - fold * 130, HOOD_Z + fold * 34);

  // the arms take turns; each plants, drags, and comes forward again
  f.arms.forEach((arm, i) => {
    const off = (i * 0.37) % 1;
    const p = (phase + off) % 1;
    const pull = walk * Math.sin(p * Math.PI * 2);
    const spread = arm.side * (0.5 + (arm.high < 130 ? 0.5 : 0.22) + fold * 0.5);
    arm.shoulder.rotation.z = spread + pull * 0.08 * arm.side;
    arm.shoulder.rotation.x = -(0.5 + pull * 0.5 + reach * 1.5 + fold * (i < 2 ? 1.1 : 0.3));
    arm.elbow.rotation.x = -(0.5 + Math.max(0, -pull) * 0.6 + Math.sin(t * 0.7 + i) * 0.05) + fold * (i < 2 ? 0.9 : 0.2) + reach * 0.4;
    arm.elbow.rotation.z = -arm.side * (0.5 + fold * 0.2);
  });

  // the hollow: slack until it has you, then it is pointed at you and it stays
  f.root.updateMatrixWorld(true);
  rest.set(0, 0, 0, 1);
  probe.position.copy(f.hood.getWorldPosition(hoodWorld));
  probe.lookAt(eye);
  // world orientation -> the hood's local frame
  const parentWorld = new THREE.Quaternion();
  f.body.getWorldQuaternion(parentWorld);
  want.copy(parentWorld).invert().multiply(probe.quaternion);
  f.hood.quaternion.copy(rest).slerp(want, look);
  // while it holds, a very small search: it is listening
  if (look > 0.9 && mode === "pass") f.hood.rotateZ(Math.sin(t * 1.7) * 0.05);

  f.eyes.opacity = mode === "rush" ? Math.min(1, reach * 2) : smooth((look - 0.5) / 0.5);
  return haul;
}
