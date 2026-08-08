"use client";

import { useEffect, useMemo, useRef, useState, type WheelEvent as ReactWheelEvent } from "react";
import { one } from "@/lib/assets";
import { AESTHETICS } from "@/lib/registry";
import { useShell } from "@/lib/store";
import {
  Corridor,
  DEPTH,
  SEGMENTS,
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
 * Nothing on this page moves except in response to you. The corridor is real CSS 3D
 * on real photographs of real carpet, and it loops by modulo, so it is genuinely
 * infinite in both directions — including backwards, which is where the exit is.
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

const OSD_START = Date.UTC(1997, 7, 12, 3, 14, 0) / 1000;

export default function Liminal() {
  const begin = useShell((s) => s.beginTransition);
  const setMapOpen = useShell((s) => s.setMapOpen);
  const muted = useShell((s) => s.muted);

  const travel = useRef(0);
  const velocity = useRef(0);
  const lastStep = useRef(0);
  const idleSince = useRef(performance.now());
  const furthest = useRef(0);

  const [baseIndex, setBaseIndex] = useState(0);
  /** How many segments ahead the motion sensors still bother to light. */
  const [reach, setReach] = useState(SEGMENTS);
  const [exit, setExit] = useState(false);
  const [clock, setClock] = useState(OSD_START);

  const textures = useMemo(
    () => ({ floor: one(SLUG, "lim_carpet", 0)?.src ?? "" }),
    [],
  );

  useEffect(() => {
    if (muted) return;
    return startRoomTone();
  }, [muted]);

  // The tape's own clock, which does not agree with yours.
  useEffect(() => {
    const id = window.setInterval(() => setClock((c) => c + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

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
    const tick = () => {
      travel.current += velocity.current;
      velocity.current *= 0.9;
      if (Math.abs(velocity.current) < 0.02) velocity.current = 0;

      if (travel.current > furthest.current) furthest.current = travel.current;

      const g = Math.floor(travel.current / DEPTH);
      setBaseIndex((b) => (b === g ? b : g));
      setExit(travel.current <= -DEPTH * 4);

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
    velocity.current = Math.max(-26, Math.min(26, velocity.current + e.deltaY * 0.16));
  };

  const segments = useMemo<SegmentInfo[]>(() => {
    return Array.from({ length: SEGMENTS }, (_, i) => {
      const g = baseIndex + i;

      let light: LightState = "on";
      if (hash(g * 3 + 1) < 0.12) light = "off";
      else if (hash(g * 7 + 2) < 0.14) light = "flicker";
      // The motion sensors only cover so far, and less the longer you stand still.
      if (i >= reach) light = "off";

      // 0.34, not 0.22: at the lower rate the two doors in view were usually in the
      // far, heavily-dimmed slots, so a visitor could walk for a minute without ever
      // seeing that doors exist — and they are the page's only way out.
      const natural = hash(g * 11 + 5) < 0.34;
      // A door that wasn't there: only on ground you have already walked past.
      const revisited = travel.current < furthest.current - DEPTH * 5;
      const appeared = !natural && revisited && hash(g * 17 + 3) < 0.3;

      return {
        light,
        door: natural || appeared ? (hash(g * 13) > 0.5 ? "left" : "right") : null,
        doorIsNew: appeared,
      };
    });
  }, [baseIndex, reach]);

  const openDoor = (g: number) => {
    creak();
    const target = segments[g - baseIndex]?.doorIsNew
      ? (AESTHETICS.find((a) => a.slug === "deep-sea") ?? LIVE[0])
      : LIVE[Math.floor(hash(g * 23) * LIVE.length)];
    window.setTimeout(() => begin(target.slug), 620);
  };

  const t = new Date(clock * 1000);
  const two = (n: number) => String(n).padStart(2, "0");

  return (
    <div
      className={styles.root}
      onWheel={onWheel}
      onPointerMove={wake}
      role="presentation"
    >
      <Corridor
        travelRef={travel}
        segments={segments}
        textures={textures}
        baseIndex={baseIndex}
        onDoor={openDoor}
      />

      <div className={styles.haze} />
      <div className={styles.fog} />

      <div className={styles.vhs}>
        <div className={styles.scanlines} />
        <div className={styles.tracking} />
        <div className={`${styles.osd} ${styles.osdTopLeft}`}>
          <span className={styles.rec} />
          REC
        </div>
        <div className={`${styles.osd} ${styles.osdBottomRight}`}>
          SP {two(t.getUTCHours())}:{two(t.getUTCMinutes())}:{two(t.getUTCSeconds())}
          <br />
          12 AUG 1997
        </div>
      </div>

      <div className={styles.hint}>
        scroll to walk · keep going · the doors open
      </div>

      {exit && (
        <div className={styles.exit}>
          <div className={styles.exitSign}>EXIT</div>
          <div className={styles.exitSub}>
            you walked back further than there was corridor
          </div>
          <button
            type="button"
            className={styles.exitButton}
            onClick={() => setMapOpen(true)}
          >
            leave
          </button>
        </div>
      )}
    </div>
  );
}
