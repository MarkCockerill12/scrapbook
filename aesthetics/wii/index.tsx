"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCanvas } from "@/components/CanvasStage";
import { AESTHETICS, type Aesthetic } from "@/lib/registry";
import { sbGet, sbSet } from "@/lib/storage";
import { useShell } from "@/lib/store";
import { thumbFor } from "@/lib/thumbs";
import { GalaxyView } from "./GalaxyView";
import { MiiParade } from "./MiiParade";
import { WiiPointer } from "./Pointer";
import { back, bootJingle, discWhir, pointerTick, select, startLoop } from "./sound";
import styles from "./styles.module.css";

/**
 * Channel 14 — Wii Menu.
 *
 * Fiction: *The Channel Menu*. This page is meta on purpose — it is a Wii-style menu
 * for the whole site, and a legitimate second entry point alongside the world map.
 * Every other channel is a tile here.
 *
 * The demo argument: a console menu is a MATERIAL, not a layout. White plastic with
 * a cool edge, a blue light that lands on things, a pointer with mass, and sound on
 * every crossing. Take those away and the same grid is a web dashboard.
 *
 * No assets. Miis and the planetoid are canvas; everything else is CSS.
 */

const PER_PAGE = 12;
const SLOT_BOX = { x0: 650, x1: 950, y0: 838, y1: 868 };

type SystemTile = {
  kind: "disc" | "mii" | "galaxy" | "map";
  name: string;
  accent: string;
  tagline: string;
};

const SYSTEM: SystemTile[] = [
  { kind: "disc", name: "Disc Channel", accent: "#9fb6c4", tagline: "no disc inserted" },
  { kind: "mii", name: "Mii Parade", accent: "#7fc4ec", tagline: "they keep arriving" },
  { kind: "galaxy", name: "Galaxy", accent: "#3f6fd8", tagline: "grab it and spin it" },
  { kind: "map", name: "Map Channel", accent: "#d8b25c", tagline: "open the scrapbook" },
];

type Tile =
  | { type: "system"; system: SystemTile }
  | { type: "channel"; aesthetic: Aesthetic }
  | { type: "empty" };

const SLUG = "wii";

function useClock(): { time: string; date: string } | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  if (!now) return null;
  return {
    time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }),
    date: now.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" }),
  };
}

export default function Wii() {
  const { toCanvasSpace } = useCanvas();
  const begin = useShell((s) => s.beginTransition);
  const setMapOpen = useShell((s) => s.setMapOpen);
  const muted = useShell((s) => s.muted);
  const visited = useShell((s) => s.visited);

  const [page, setPage] = useState(0);
  const [disc, setDisc] = useState(false);
  const [booting, setBooting] = useState(false);
  const [board, setBoard] = useState(false);
  const [hs, setHs] = useState(false);
  const clock = useClock();

  /** First-seen stamps, so the message board carries real dates rather than fake ones. */
  const [stamps, setStamps] = useState<Record<string, number>>({});
  useEffect(() => {
    const stored = sbGet<Record<string, number>>(SLUG, "stamps", {});
    let dirty = false;
    const next = { ...stored };
    for (const slug of visited) {
      if (!next[slug]) {
        next[slug] = Date.now();
        dirty = true;
      }
    }
    if (dirty) sbSet(SLUG, "stamps", next);
    setStamps(next);
  }, [visited]);

  // Menu music. Gated on mute so we aren't running a timer for silence.
  useEffect(() => {
    if (muted) return;
    return startLoop();
  }, [muted]);

  const tiles = useMemo<Tile[]>(() => {
    const list: Tile[] = [
      ...SYSTEM.map((system) => ({ type: "system" as const, system })),
      ...AESTHETICS.map((aesthetic) => ({ type: "channel" as const, aesthetic })),
    ];
    const pages = Math.ceil(list.length / PER_PAGE);
    while (list.length < pages * PER_PAGE) list.push({ type: "empty" });
    return list;
  }, []);

  const pageCount = Math.ceil(tiles.length / PER_PAGE);
  const shown = tiles.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);

  const insertDisc = useCallback(() => {
    if (disc) return;
    setDisc(true);
    discWhir();
  }, [disc]);

  /** Boot whatever is on the disc: a channel the visitor hasn't seen, if there is one. */
  const bootDisc = useCallback(() => {
    if (!disc || booting) return;
    setBooting(true);
    bootJingle();
    const unseen = AESTHETICS.filter((a) => a.status === "live" && !visited.includes(a.slug));
    const pool = unseen.length ? unseen : AESTHETICS.filter((a) => a.status === "live");
    const target = pool[(Math.random() * pool.length) | 0];
    window.setTimeout(() => begin(target.slug), 1450);
  }, [disc, booting, visited, begin]);

  // --- easter egg: shake the pointer at the disc slot -----------------------
  const shake = useRef({ dir: 0, count: 0, at: 0, lastX: 0 });
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const p = toCanvasSpace(e.clientX, e.clientY);
      const over =
        p.x > SLOT_BOX.x0 && p.x < SLOT_BOX.x1 && p.y > SLOT_BOX.y0 && p.y < SLOT_BOX.y1;
      const s = shake.current;
      if (!over) {
        s.count = 0;
        s.lastX = p.x;
        return;
      }
      const dx = p.x - s.lastX;
      s.lastX = p.x;
      if (Math.abs(dx) < 5) return;
      const dir = Math.sign(dx);
      const now = performance.now();
      if (now - s.at > 900) s.count = 0;
      if (dir !== s.dir) {
        s.dir = dir;
        s.at = now;
        s.count += 1;
        if (s.count >= 6) {
          s.count = 0;
          setHs(true);
        }
      }
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [toCanvasSpace]);

  const openChannel = (a: Aesthetic) => {
    select();
    begin(a.slug);
  };

  return (
    <div className={styles.root}>
      <div className={styles.hint}>
        point and click · shake the pointer over the disc slot
      </div>

      <div className={styles.grid}>
        {shown.map((tile, i) => {
          if (tile.type === "empty") {
            return <div key={`e${i}`} className={styles.empty} />;
          }

          if (tile.type === "system") {
            const s = tile.system;
            const art = { "--accent": s.accent } as React.CSSProperties;

            if (s.kind === "galaxy") {
              // Not a button: the whole screen is a drag surface.
              return (
                <div key={s.kind} className={styles.tile} style={art}>
                  <div className={styles.screen}>
                    <GalaxyView />
                  </div>
                  <div className={styles.label}>{s.name}</div>
                </div>
              );
            }

            return (
              <button
                key={s.kind}
                type="button"
                className={styles.tile}
                style={art}
                onPointerEnter={pointerTick}
                onClick={() => {
                  if (s.kind === "map") {
                    select();
                    setMapOpen(true);
                  } else if (s.kind === "disc") {
                    if (disc) bootDisc();
                    else insertDisc();
                  } else {
                    pointerTick();
                  }
                }}
              >
                <div className={styles.screen}>
                  {s.kind === "mii" ? (
                    <MiiParade />
                  ) : (
                    <>
                      <div className={styles.screenArt} />
                      <div className={styles.screenNo}>
                        {s.kind === "disc" ? (disc ? "◎" : "—") : "★"}
                      </div>
                      <div className={styles.screenTag}>
                        {s.kind === "disc"
                          ? disc
                            ? "disc ready — click to boot"
                            : s.tagline
                          : s.tagline}
                      </div>
                    </>
                  )}
                </div>
                <div className={styles.label}>{s.name}</div>
              </button>
            );
          }

          const a = tile.aesthetic;
          const seen = visited.includes(a.slug);
          return (
            <button
              key={a.slug}
              type="button"
              className={`${styles.tile} ${a.status === "planned" ? styles.pending : ""}`}
              style={{ "--accent": a.accent } as React.CSSProperties}
              onPointerEnter={pointerTick}
              onClick={() => openChannel(a)}
            >
              <div className={styles.screen}>
                <div
                  className={styles.screenArt}
                  style={thumbFor(a.slug) ? { backgroundImage: `url(${thumbFor(a.slug)})` } : undefined}
                />
                <div className={styles.screenNo}>{String(a.channel).padStart(2, "0")}</div>
                <div className={styles.screenTag}>
                  {a.status === "planned" ? "not yet installed" : a.tagline}
                </div>
              </div>
              <div className={styles.label}>
                {!seen && <span className={styles.newDot} />}
                {a.name}
              </div>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className={styles.pager}
        style={{ left: 58 }}
        disabled={page === 0}
        aria-label="Previous page"
        onClick={() => {
          setPage((p) => Math.max(0, p - 1));
          back();
        }}
      >
        ‹
      </button>
      <button
        type="button"
        className={styles.pager}
        style={{ right: 58 }}
        disabled={page >= pageCount - 1}
        aria-label="Next page"
        onClick={() => {
          setPage((p) => Math.min(pageCount - 1, p + 1));
          pointerTick();
        }}
      >
        ›
      </button>

      <div className={styles.pageDots}>
        {Array.from({ length: pageCount }, (_, i) => (
          <span
            key={i}
            className={`${styles.pageDot} ${i === page ? styles.pageDotOn : ""}`}
          />
        ))}
      </div>

      <div className={styles.bar}>
        <button
          type="button"
          className={styles.barButton}
          style={{ left: 360 }}
          onPointerEnter={pointerTick}
          onClick={() => {
            select();
            setMapOpen(true);
          }}
        >
          <span className={styles.barButtonMark}>❖</span>
          <span className={styles.barButtonText}>ScrapBook</span>
        </button>

        {clock && (
          <div className={styles.clock}>
            <div className={styles.clockTime}>{clock.time}</div>
            <div className={styles.clockDate}>{clock.date}</div>
          </div>
        )}

        <button
          type="button"
          className={styles.slot}
          aria-label={disc ? "Boot the disc" : "Insert a disc"}
          onPointerEnter={pointerTick}
          onClick={() => (disc ? bootDisc() : insertDisc())}
        >
          <span className={styles.slotMouth} />
          <span className={`${styles.slotLed} ${disc ? styles.slotLedOn : ""}`} />
        </button>

        <button
          type="button"
          className={styles.barButton}
          /*
           * 360, not the 96 the symmetry wants: the shell's dial is fixed to the
           * bottom-right of the VIEWPORT and lands over roughly the last 320x60 of
           * the canvas at 1.0x. See TECHNICAL_SPECS "chrome exclusion zone".
           */
          style={{ right: 360 }}
          onPointerEnter={pointerTick}
          onClick={() => {
            select();
            setBoard(true);
          }}
        >
          <span className={styles.barButtonMark}>✉</span>
          <span className={styles.barButtonText}>Message Board</span>
        </button>
      </div>

      {board && (
        <div className={styles.panel} role="dialog" aria-label="Message board">
          <div className={styles.panelHead}>
            <div className={styles.panelTitle}>Message Board</div>
            <div className={styles.panelSub}>
              {visited.length} of {AESTHETICS.length} channels have written to you
            </div>
          </div>
          <div className={styles.letters}>
            {visited.length === 0 && (
              <div className={styles.letterMeta}>
                No letters yet. Visit a channel and it will write to you.
              </div>
            )}
            {visited.map((slug) => {
              const a = AESTHETICS.find((x) => x.slug === slug);
              if (!a) return null;
              const at = stamps[slug];
              return (
                <div
                  key={slug}
                  className={styles.letter}
                  style={{ "--accent": a.accent } as React.CSSProperties}
                >
                  <span className={styles.letterMark} />
                  <span>
                    <span className={styles.letterName}>{a.name}</span>
                    <span className={styles.letterMeta}>
                      Ch {String(a.channel).padStart(2, "0")} ·{" "}
                      {at ? new Date(at).toLocaleDateString() : "just now"}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            className={styles.panelClose}
            onClick={() => {
              back();
              setBoard(false);
            }}
          >
            Back
          </button>
        </div>
      )}

      {booting && (
        <div className={styles.boot}>
          <div className={styles.bootMark}>Wii</div>
        </div>
      )}

      {hs && (
        <button
          type="button"
          className={styles.hs}
          onClick={() => {
            back();
            setHs(false);
          }}
        >
          <div className={styles.hsTitle}>WARNING — HEALTH AND SAFETY</div>
          <div className={styles.hsBody}>
            Before playing, read the Operations Manual for important information about your
            health and safety.
            <br />
            <br />
            Make sure there is nothing breakable, and nobody else, within arm&apos;s reach.
            You are about to look at twenty-three completely unrelated websites in a row.
          </div>
          <div className={styles.hsHint}>click to continue</div>
        </button>
      )}

      <WiiPointer />
    </div>
  );
}
