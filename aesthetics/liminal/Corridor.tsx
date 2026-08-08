"use client";

import { useEffect, useRef, type RefObject } from "react";
import styles from "./styles.module.css";

/**
 * Eight segments of corridor in real CSS 3D — floor, ceiling, two walls and a tube
 * per segment, inside one `preserve-3d` world that translates on Z.
 *
 * The loop is the whole trick and it is nothing more than modulo: segments live at
 * FIXED z positions, and the world is translated by `travel % DEPTH`. Cross one
 * segment's worth of ground and the world snaps back by exactly one segment while
 * the content shifts along by one index, which is invisible because every segment is
 * geometrically identical. The corridor is therefore infinite in both directions and
 * costs 40 DOM nodes.
 *
 * Travel arrives as a ref and is read inside rAF. Routing it through React state
 * would re-render 40 absolutely-positioned quads sixty times a second to change one
 * transform.
 */

export const WIDTH = 560;
export const HEIGHT = 440;
export const DEPTH = 560;
export const SEGMENTS = 9;

/**
 * How far INTO the corridor the camera stands.
 *
 * Without this the whole thing sits at z<=0, which in CSS 3D means the near opening
 * renders exactly 1:1 — a 560x440 rectangle floating in the middle of a 1600x900
 * frame, like a tunnel decal on a black wall. The viewer is at z = +perspective, so
 * pushing the world forward by a segment puts the first walls level with the camera,
 * where they magnify past the frame edges and you are finally *inside* the corridor.
 */
const BASE = DEPTH;

export type LightState = "on" | "off" | "flicker";

export interface SegmentInfo {
  light: LightState;
  door: "left" | "right" | null;
  doorIsNew: boolean;
}

/**
 * Only the floor is photographic.
 *
 * The harvested wall, ceiling and door grabs were a street, a whole room and a stone
 * lion — the "categories not scenes" failure documented in ASSETS_NEEDED, in its
 * purest form. A drawn wall beats a photograph of the wrong wall, so those three
 * surfaces are CSS. `raw/liminal/lim_carpet_01` is genuine commercial carpet and is
 * the one grab worth keeping.
 */
export interface Textures {
  floor: string;
}

function quadStyle(
  w: number,
  h: number,
  transform: string,
  background?: string,
): React.CSSProperties {
  return {
    width: w,
    height: h,
    marginLeft: -w / 2,
    marginTop: -h / 2,
    transform,
    backgroundImage: background ? `url(${background})` : undefined,
  };
}

export function Corridor({
  travelRef,
  segments,
  textures,
  baseIndex,
  onDoor,
}: {
  travelRef: RefObject<number>;
  /** One entry per slot, slot 0 nearest. Supplied by the page, keyed on baseIndex. */
  segments: SegmentInfo[];
  textures: Textures;
  baseIndex: number;
  onDoor: (globalIndex: number) => void;
}) {
  const worldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const step = () => {
      const world = worldRef.current;
      if (world) {
        // Positive modulo: travel goes negative when you walk backwards, and a
        // negative offset would jerk the whole corridor a full segment forward.
        const offset = ((travelRef.current % DEPTH) + DEPTH) % DEPTH;
        world.style.transform = `translateZ(${(BASE + offset).toFixed(2)}px)`;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [travelRef]);

  return (
    <div className={styles.scene}>
      <div ref={worldRef} className={styles.world}>
        {segments.map((seg, i) => {
          const z = -(i * DEPTH + DEPTH / 2);
          const dim = styles[`d${i}` as keyof typeof styles] as string;
          const cls = `${styles.quad} ${dim} ${seg.light === "off" ? styles.dark : ""}`;
          const g = baseIndex + i;

          return (
            <div key={i} style={{ transformStyle: "preserve-3d" }}>
              {/* floor */}
              <div
                className={cls}
                style={quadStyle(
                  WIDTH,
                  DEPTH,
                  `translateY(${HEIGHT / 2}px) translateZ(${z}px) rotateX(90deg)`,
                  textures.floor,
                )}
              />
              {/* ceiling */}
              <div
                className={`${cls} ${styles.ceilingSurface}`}
                style={quadStyle(
                  WIDTH,
                  DEPTH,
                  `translateY(${-HEIGHT / 2}px) translateZ(${z}px) rotateX(-90deg)`,
                )}
              />
              {/* left wall */}
              <div
                className={`${cls} ${styles.wallSurface}`}
                style={quadStyle(
                  DEPTH,
                  HEIGHT,
                  `translateX(${-WIDTH / 2}px) translateZ(${z}px) rotateY(90deg)`,
                )}
              />
              {/* right wall */}
              <div
                className={`${cls} ${styles.wallSurface}`}
                style={quadStyle(
                  DEPTH,
                  HEIGHT,
                  `translateX(${WIDTH / 2}px) translateZ(${z}px) rotateY(-90deg)`,
                )}
              />

              {/* the tube, 3px below the ceiling so it doesn't z-fight with it */}
              <div
                className={`${styles.tube} ${dim} ${
                  seg.light === "off" ? styles.tubeOut : ""
                } ${seg.light === "flicker" ? styles.tubeFlicker : ""}`}
                style={quadStyle(
                  74,
                  DEPTH * 0.55,
                  `translateY(${-HEIGHT / 2 + 3}px) translateZ(${z}px) rotateX(-90deg)`,
                )}
              />

              {seg.door && (
                <button
                  type="button"
                  aria-label="Open the door"
                  className={`${styles.door} ${dim} ${seg.doorIsNew ? styles.doorNew : ""}`}
                  onClick={() => onDoor(g)}
                  style={quadStyle(
                    190,
                    300,
                    `translateX(${(seg.door === "left" ? -1 : 1) * (WIDTH / 2 - 3)}px) ` +
                      `translateY(${HEIGHT / 2 - 150}px) translateZ(${z}px) ` +
                      `rotateY(${seg.door === "left" ? 90 : -90}deg)`,
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
