"use client";

import { useEffect, useMemo, useRef, useState, type WheelEvent as ReactWheelEvent } from "react";
import { count, src } from "@/lib/assets";
import { noiseLoop, tone, unlock } from "@/lib/audio";
import { AESTHETICS } from "@/lib/registry";
import { useShell } from "@/lib/store";
import {
  Corridor,
  DEPTH,
  SEGMENTS,
  TH,
  TX,
  HEIGHT,
  camLocalZ,
  segmentZ,
  type Cam,
  type Entity,
  type LightState,
  type SegmentInfo,
} from "./Corridor";
import { creak, startRoomTone, step, strike, thump } from "./sound";
import styles from "./styles.module.css";

/**
 * Channel 05 — Liminal.
 *
 * Fiction: *You are not supposed to be in here.* There is no stated purpose. That is
 * the horror.
 *
 * The demo argument: dread is made of stillness and repetition, not of jump scares.
 * Nothing on this page moves except in response to you. The corridor is a lit WebGL
 * room built from scans of real carpet, and it loops by modulo, so it is genuinely
 * infinite in both directions.
 *
 * Assets: `raw/liminal/` — wall, carpet, ceiling tile and door photographs.
 */

const SLUG = "liminal";

/** Deterministic per-segment noise, so the corridor is the same every time you walk it. */
function hash(n: number): number {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

const LIVE = AESTHETICS.filter((a) => a.status === "live");

/**
 * The rare event. Once you have walked a fair way, something may come down the
 * corridor behind the lights. You are told to hide; keep moving and a table turns up
 * that you can get under. Do, and it walks past. Don't, and it doesn't.
 */
type Ev = "none" | "warn" | "table" | "hidden" | "safe" | "caught" | "dead";

export default function Liminal() {
  const begin = useShell((s) => s.beginTransition);
  const muted = useShell((s) => s.muted);

  const travel = useRef(0);
  const velocity = useRef(0);
  const lastStep = useRef(0);
  const idleSince = useRef(performance.now());
  const furthest = useRef(0);

  const [baseIndex, setBaseIndex] = useState(0);
  /** How many segments ahead the motion sensors still bother to light. */
  const [reach, setReach] = useState(SEGMENTS);
  const [ev, setEv] = useState<Ev>("none");
  const [table, setTable] = useState<number | null>(null);
  const evRef = useRef<Ev>("none");
  const cam = useRef<Cam>({ x: 0, y: 0, z: 0, yaw: 0, pitch: 0 });
  const camTarget = useRef<Cam>({ x: 0, y: 0, z: 0, yaw: 0, pitch: 0 });
  const [entity, setEntity] = useState<Entity | null>(null);
  const happened = useRef(false);
  const timers = useRef<number[]>([]);
  const go = (next: Ev) => {
    evRef.current = next;
    setEv(next);
  };
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  const textures = useMemo(
    () => ({
      // 2K photo-scanned surfaces (ambientCG, CC0), one tile per segment so nothing
      // is ever magnified past its own resolution.
      floor: src(SLUG, "lm_carpet", 6),
      floorN: src(SLUG, "lm_nrm", 1),
      wall: src(SLUG, "lm_wall", 3),
      wallN: src(SLUG, "lm_nrm", 2),
      ceiling: src(SLUG, "lm_ceil", 1),
      ceilingN: src(SLUG, "lm_nrm", 3),
      woodN: src(SLUG, "lm_nrm", 4),
      door: src(SLUG, "lm_door", 1),
      wood: src(SLUG, "lm_wood", 2),
      exit: src(SLUG, "lim_exit", 7),
      art: (slot: string, n: number) => src(SLUG, slot, n),
    }),
    [],
  );
  const [viewing, setViewing] = useState<{ slot: string; n: number } | null>(null);

  useEffect(() => {
    if (muted) return;
    return startRoomTone();
  }, [muted]);

  // ---- the event ----------------------------------------------------------
  const heartbeat = (n: number) => {
    for (let i = 0; i < n; i++) {
      tone({ freq: 58, toFreq: 40, duration: 0.16, gain: 0.3, delay: i * 0.86 });
      tone({ freq: 50, toFreq: 36, duration: 0.2, gain: 0.22, delay: i * 0.86 + 0.24 });
    }
  };

  const caught = () => {
    if (evRef.current === "hidden" || evRef.current === "caught" || evRef.current === "dead") return;
    clearTimers();
    go("caught");
    velocity.current = 0;
    // It comes from where you were looking: straight down the corridor, at you.
    setEntity({ mode: "rush", t0: performance.now(), anchor: camLocalZ(travel.current) });
    for (const f of [61, 87, 131, 233, 466, 1244]) tone({ freq: f, toFreq: f * 1.9, duration: 1.1, type: "sawtooth", gain: 0.2 });
    const hiss = noiseLoop({ gain: 0.4, lowpass: 9000, highpass: 900, attack: 0.02 });
    later(() => {
      hiss();
      go("dead");
      document.title = "it saw you";
      // The honest attempt. Browsers only allow this for tabs a script opened, so on
      // most visits it is refused — and the page plays dead instead.
      try {
        window.close();
      } catch {
        /* refused, as expected */
      }
    }, 900);
    later(() => {
      document.title = "ScrapBook";
      travel.current = 0;
      furthest.current = 0;
      setTable(null);
      setEntity(null);
      go("none");
    }, 7200);
  };

  const startEvent = () => {
    if (evRef.current !== "none") return;
    happened.current = true;
    go("warn");
    strike();
    heartbeat(13);
    // Stand there doing nothing and it still arrives.
    later(caught, 12500);
  };

  const hide = () => {
    if (evRef.current !== "table") return;
    clearTimers();
    go("hidden");
    velocity.current = 0;
    // Get down, get under, and turn to watch the corridor from between the legs.
    const base = Math.floor(travel.current / DEPTH);
    const tz = segmentZ(table ?? base, base);
    camTarget.current = {
      // well back under it, against the wall
      x: TX + 34,
      // the eye ends up 44px under the table top
      y: HEIGHT / 2 - TH + 44,
      z: camLocalZ(travel.current) - tz,
      yaw: -64,
      pitch: 7,
    };
    creak();
    heartbeat(15);
    setEntity({ mode: "pass", t0: performance.now(), anchor: tz });
    later(() => {
      go("safe");
      setEntity(null);
      camTarget.current = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 };
    }, 15200);
    later(() => go("none"), 19600);
    later(() => setTable(null), 60000);
  };

  // Rare, and never before you have had time to settle in. `?hide` forces it.
  useEffect(() => {
    if (evRef.current !== "none" || happened.current) return;
    const forced = typeof window !== "undefined" && window.location.search.includes("hide");
    const far = furthest.current / DEPTH;
    if ((forced && far > 1) || far > 46 || (far > 9 && hash(baseIndex * 53 + 7) < 0.06)) startEvent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseIndex]);

  // Something, a long way off, at intervals you can't predict.
  useEffect(() => {
    let id = 0;
    const schedule = () => {
      id = window.setTimeout(() => {
        thump();
        schedule();
      }, 20000 + Math.random() * 26000);
    };
    schedule();
    return () => window.clearTimeout(id);
  }, []);

  // --- the walk ------------------------------------------------------------
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      // everything below was tuned per 60 Hz frame; `f` is how many of those this was
      const f = Math.min(4, Math.max(0.2, (now - last) / 16.667));
      last = now;
      const ease = (k: number) => 1 - (1 - k) ** f;
      travel.current += velocity.current * f;
      velocity.current *= 0.9 ** f;
      const cc = cam.current;
      const ct = camTarget.current;
      // Down and across first; the head turns a little after the body has gone.
      cc.x += (ct.x - cc.x) * ease(0.055);
      cc.y += (ct.y - cc.y) * ease(0.07);
      cc.z += (ct.z - cc.z) * ease(0.055);
      cc.yaw += (ct.yaw - cc.yaw) * ease(0.04);
      cc.pitch += (ct.pitch - cc.pitch) * ease(0.04);
      if (Math.abs(velocity.current) < 0.02) velocity.current = 0;

      if (travel.current > furthest.current) furthest.current = travel.current;

      const g = Math.floor(travel.current / DEPTH);
      setBaseIndex((b) => (b === g ? b : g));

      // A footstep every half a segment, alternating feet.
      const s = Math.floor(travel.current / (DEPTH / 2));
      if (s !== lastStep.current) {
        if (velocity.current !== 0) step(s % 2 === 0);
        lastStep.current = s;
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // --- the lights give up if you stand still -------------------------------
  useEffect(() => {
    const id = window.setInterval(() => {
      const idle = performance.now() - idleSince.current;
      if (idle < 30000) {
        setReach((r) => (r === SEGMENTS ? r : SEGMENTS));
        return;
      }
      setReach((r) => {
        if (r <= 1) return r;
        strike();
        return r - 1;
      });
    }, 4000);
    return () => window.clearInterval(id);
  }, []);

  const wake = () => {
    idleSince.current = performance.now();
  };

  const onWheel = (e: ReactWheelEvent<HTMLDivElement>) => {
    wake();
    unlock();
    const now = evRef.current;
    if (now === "hidden" || now === "caught" || now === "dead") return;
    if (now === "warn") {
      // You ran — and there, two doors down, is somewhere to get under.
      setTable(Math.floor(travel.current / DEPTH) + 2);
      go("table");
      // A fresh, shorter fuse from the moment there is somewhere to hide.
      clearTimers();
      later(caught, 9000);
    }
    velocity.current = Math.max(-26, Math.min(26, velocity.current + e.deltaY * 0.16));
  };

  const segments = useMemo<SegmentInfo[]>(() => {
    // One extra segment BEHIND the camera's, so there is corridor there to turn and see.
    return Array.from({ length: SEGMENTS + 1 }, (_, slot) => {
      const i = slot - 1;
      const g = baseIndex + i;

      let light: LightState = "on";
      if (hash(g * 3 + 1) < 0.12) light = "off";
      else if (hash(g * 7 + 2) < 0.14) light = "flicker";
      // The motion sensors only cover so far, and less the longer you stand still.
      if (i >= reach) light = "off";
      // While it is coming the sensors stop trusting anything past arm's length.
      if (ev === "warn" || ev === "table") light = i < 4 ? "flicker" : "off";
      if (ev === "hidden") light = Math.abs(g - (table ?? g)) <= 1 ? (g === table ? "on" : "flicker") : "off";
      if (ev === "caught" || ev === "dead") light = "off";

      // 0.34, not 0.22: at the lower rate the two doors in view were usually in the
      // far, heavily-dimmed slots, so a visitor could walk for a minute without ever
      // seeing that doors exist — and they are the page's only way out.
      const natural = hash(g * 11 + 5) < 0.34;
      // A door that wasn't there: only on ground you have already walked past.
      const revisited = travel.current < furthest.current - DEPTH * 5;
      const appeared = !natural && revisited && hash(g * 17 + 3) < 0.3;

      const door = natural || appeared ? (hash(g * 13) > 0.5 ? "left" : "right") : null;
      const dest = LIVE[Math.floor(hash(g * 23) * LIVE.length)];
      // Photographs of other places like this one, on the wall without the door.
      const artSide: "left" | "right" =
        door === "left" ? "right" : door === "right" ? "left" : hash(g * 29) > 0.5 ? "left" : "right";
      const pool = hash(g * 31) < 0.72 ? "lim_art" : "lim_art2";
      const size = count(SLUG, pool);
      const art = hash(g * 37) < 0.8 && size ? { side: artSide, slot: pool, n: 1 + Math.floor(hash(g * 41) * size) } : null;

      return {
        light,
        door,
        doorIsNew: appeared,
        plaque: appeared ? "B2 · NO ACCESS" : `${String(dest.channel).padStart(3, "0")} · ${dest.name.toUpperCase()}`,
        art,
        exitSign: ((g % 4) + 4) % 4 === 1,
      };
    });
  }, [baseIndex, reach, ev, table]);

  const openDoor = (g: number) => {
    creak();
    const target = segments[g - baseIndex + 1]?.doorIsNew
      ? (AESTHETICS.find((a) => a.slug === "deep-sea") ?? LIVE[0])
      : LIVE[Math.floor(hash(g * 23) * LIVE.length)];
    window.setTimeout(() => begin(target.slug), 620);
  };


  return (
    <div
      className={styles.root}
      data-ev={ev}
      onWheel={onWheel}
      onPointerDown={() => unlock()}
      onPointerMove={wake}
      role="presentation"
    >
      <Corridor
        travelRef={travel}
        segments={segments}
        textures={textures}
        baseIndex={baseIndex}
        camRef={cam}
        table={table}
        onTable={hide}
        entity={entity}
        onFootfall={thump}
        onDoor={openDoor}
        onArt={(slot, n) => {
          creak();
          setViewing({ slot, n });
        }}
      />

      <div className={styles.haze} />

      <div className={styles.lens} />

      {(ev === "warn" || ev === "table" || ev === "hidden" || ev === "safe") && (
        <div className={styles.warn} key={ev}>
          {ev === "warn" && (
            <>
              <b>something is coming</b>
              <span>hide.</span>
            </>
          )}
          {ev === "table" && (
            <>
              <b>the table</b>
              <span>get under it. now.</span>
            </>
          )}
          {ev === "hidden" && <span>don&apos;t move.</span>}
          {ev === "safe" && <span>it&apos;s gone. for now.</span>}
        </div>
      )}

      <div className={styles.hint}>scroll to walk</div>

      {ev === "dead" && (
        <div className={styles.dead}>
          <div className={styles.snap}>
            <i />
            <h2>Aw, Snap!</h2>
            <p>Something went wrong while displaying this webpage.</p>
            <small>Error code: YOU_WERE_NOT_SUPPOSED_TO_BE_IN_HERE</small>
          </div>
          <p className={styles.deadLine}>it knows which tab you were in</p>
        </div>
      )}

      {viewing && (
        <button type="button" className={styles.viewer} onClick={() => setViewing(null)}>
          <img src={src(SLUG, viewing.slot, viewing.n)} alt="A photograph of an empty place" />
          <span>photograph · undated · it was hanging in the corridor — click to put it back</span>
        </button>
      )}

    </div>
  );
}
