"use client";

import { useEffect, useState } from "react";
import { CanvasStage } from "@/components/CanvasStage";
import { AESTHETICS, type Aesthetic } from "@/lib/registry";
import { useShell } from "@/lib/store";
import { thumbFor } from "@/lib/thumbs";

/**
 * The map. Tier 2 of the nav: zoom out from a channel to the whole roster.
 *
 * It's the open scrapbook itself — a desk, a spread, and every channel taped down as
 * a photo with a handwritten label. This is the one surface where the SITE has a
 * personality rather than borrowing an aesthetic's, so it leans all the way into the
 * name.
 *
 * Runs on the same 1600x900 scaled canvas as the pages, so the spread composes
 * identically everywhere instead of reflowing into a responsive grid — a scrapbook
 * that re-columns on a phone stops reading as an object.
 *
 * Each photo well is a real screenshot of the channel (scripts/thumbs.mjs), falling
 * back to an accent gradient only for channels not built yet. The label font is a
 * system-cursive fallback until a hand font is self-hosted.
 */

const HAND = '"Segoe Script", "Bradley Hand", "Comic Sans MS", cursive';

/* 8 × 4 = 32 slots: room for the roster to keep growing past the original 23. */
const GRID = {
  cols: 8,
  startX: 124,
  startY: 200,
  colW: 170,
  rowH: 152,
  cardW: 150,
  cardH: 90,
};

/** Deterministic scatter — seeded off the index so server and client agree. */
function scatter(i: number) {
  return {
    rotate: (((i * 53) % 11) - 5) * 0.7,
    dx: (((i * 29) % 7) - 3) * 2,
    dy: (((i * 17) % 5) - 2) * 2,
  };
}

export function WorldMap() {
  const open = useShell((s) => s.mapOpen);
  const setMapOpen = useShell((s) => s.setMapOpen);
  const begin = useShell((s) => s.beginTransition);
  const visited = useShell((s) => s.visited);
  const [hovered, setHovered] = useState<Aesthetic | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMapOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setMapOpen]);

  if (!open) return null;

  const travel = (slug: string) => {
    setMapOpen(false);
    begin(slug);
  };

  return (
    <div className="fixed inset-0 z-[8500]">
      <CanvasStage letterbox="#1d140d">
        {/* the desk */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 50% 34%, #4a3423 0%, #2c1e14 58%, #170f09 100%)",
          }}
        />
        {/* wood grain */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(92deg, rgba(0,0,0,.5) 0 2px, transparent 2px 7px), repeating-linear-gradient(88deg, rgba(255,220,170,.25) 0 1px, transparent 1px 13px)",
          }}
        />

        {/* the open spread */}
        <div
          className="absolute"
          style={{
            left: 84,
            top: 58,
            width: 1432,
            height: 784,
            background:
              "linear-gradient(178deg, #f4ead6 0%, #efe2c9 46%, #e8d9bd 100%)",
            boxShadow:
              "0 42px 80px -28px rgba(0,0,0,.85), 0 4px 0 rgba(255,255,255,.14) inset",
            borderRadius: 3,
          }}
        >
          {/* paper grain */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 22% 34%, rgba(150,120,80,.16) 0 2px, transparent 3px), radial-gradient(circle at 71% 66%, rgba(150,120,80,.13) 0 2px, transparent 3px)",
              backgroundSize: "37px 41px, 53px 47px",
            }}
          />
          {/* centre gutter */}
          <div
            className="pointer-events-none absolute inset-y-0"
            style={{
              left: "50%",
              width: 74,
              transform: "translateX(-50%)",
              background:
                "linear-gradient(90deg, transparent, rgba(60,38,18,.30) 42%, rgba(60,38,18,.42) 50%, rgba(60,38,18,.30) 58%, transparent)",
            }}
          />

          <h1
            className="absolute text-[38px] leading-none text-[#2f2418]"
            style={{ left: 54, top: 44, fontFamily: HAND, transform: "rotate(-1.4deg)" }}
          >
            Scrap<span className="text-[#8a5a2b]">book</span>
          </h1>
          <p
            className="absolute text-[15px] text-[#6b5539]"
            style={{ left: 58, top: 96, fontFamily: HAND, transform: "rotate(-0.8deg)" }}
          >
            {AESTHETICS.length} channels &middot; {visited.length} visited
          </p>

          <button
            type="button"
            onClick={() => setMapOpen(false)}
            className="absolute text-[15px] text-[#6b5539] underline decoration-[#b39264] decoration-wavy underline-offset-4 transition hover:text-[#2f2418]"
            style={{ right: 56, top: 52, fontFamily: HAND, transform: "rotate(1.2deg)" }}
          >
            close &middot; esc
          </button>
        </div>

        {/* the taped-in channels */}
        {AESTHETICS.map((a, i) => {
          const col = i % GRID.cols;
          const row = Math.floor(i / GRID.cols);
          const { rotate, dx, dy } = scatter(i);
          const seen = visited.includes(a.slug);
          const isHovered = hovered?.slug === a.slug;

          return (
            <button
              key={a.slug}
              type="button"
              onClick={() => travel(a.slug)}
              onPointerEnter={() => setHovered(a)}
              onPointerLeave={() =>
                setHovered((h) => (h?.slug === a.slug ? null : h))
              }
              onFocus={() => setHovered(a)}
              onBlur={() => setHovered((h) => (h?.slug === a.slug ? null : h))}
              className="group absolute text-left outline-none"
              style={{
                left: GRID.startX + col * GRID.colW + dx,
                top: GRID.startY + row * GRID.rowH + dy,
                width: GRID.cardW,
                transform: `rotate(${isHovered ? 0 : rotate}deg) translateY(${isHovered ? -7 : 0}px) scale(${isHovered ? 1.045 : 1})`,
                transformOrigin: "center center",
                transition: "transform 180ms cubic-bezier(.2,.9,.3,1)",
                zIndex: isHovered ? 50 : 10,
              }}
            >
              {/* the photo */}
              <div
                className="relative overflow-hidden"
                style={{
                  height: GRID.cardH,
                  // A real screenshot of the page; the accent gradient only shows for a
                  // channel that hasn't been built (and so has nothing to photograph).
                  background: thumbFor(a.slug)
                    ? `#14181f url("${thumbFor(a.slug)}") center / cover no-repeat`
                    : `linear-gradient(${118 + ((i * 47) % 80)}deg, ${a.accent} 0%, ${a.accent}44 62%, #14181f 100%)`,
                  border: "5px solid #fbf6ea",
                  boxShadow: isHovered
                    ? "0 16px 26px -8px rgba(0,0,0,.6)"
                    : "0 6px 12px -5px rgba(0,0,0,.5)",
                }}
              >
                <span
                  className="absolute left-1.5 top-1 font-mono text-[11px] tabular-nums text-white/85"
                  style={{ textShadow: "0 1px 3px rgba(0,0,0,.7)" }}
                >
                  {String(a.channel).padStart(2, "0")}
                </span>

                {seen && (
                  <span
                    aria-hidden
                    className="absolute font-mono text-[8px] uppercase tracking-[0.16em]"
                    style={{
                      right: 5,
                      top: 6,
                      color: "#e2503a",
                      border: "1.5px solid #e2503a",
                      borderRadius: 2,
                      padding: "1px 3px",
                      opacity: 0.85,
                      transform: "rotate(-9deg)",
                      textShadow: "0 1px 2px rgba(0,0,0,.5)",
                    }}
                  >
                    seen
                  </span>
                )}

                {a.status === "planned" && (
                  <span
                    className="absolute bottom-1 left-1.5 font-mono text-[7px] uppercase tracking-[0.2em] text-white/40"
                    aria-hidden
                  >
                    not built
                  </span>
                )}
              </div>

              {/* tape — translucent, so the photo edge reads through it */}
              <span
                aria-hidden
                className="absolute"
                style={{
                  left: -13,
                  top: -8,
                  width: 54,
                  height: 17,
                  background:
                    "linear-gradient(180deg, rgba(255,250,228,.42), rgba(238,228,196,.30))",
                  borderLeft: "1px solid rgba(255,255,255,.28)",
                  borderRight: "1px solid rgba(255,255,255,.28)",
                  boxShadow: "0 1px 4px rgba(90,60,25,.22)",
                  transform: `rotate(${-36 + (i % 3) * 7}deg)`,
                }}
              />

              <span
                className="mt-2 block truncate text-[15px] leading-tight text-[#2f2418]"
                style={{ fontFamily: HAND }}
              >
                {a.name}
              </span>
            </button>
          );
        })}

        {/* margin note — the hovered channel's tagline, scribbled in the empty slot */}
        <div
          className="pointer-events-none absolute"
          style={{
            left: GRID.startX + (GRID.cols - 1) * GRID.colW - 30,
            top: GRID.startY + 3 * GRID.rowH + 6,
            width: 190,
          }}
        >
          {hovered ? (
            <p
              className="text-[17px] leading-snug text-[#6b5539]"
              style={{ fontFamily: HAND, transform: "rotate(-2.2deg)" }}
            >
              &ldquo;{hovered.tagline}&rdquo;
            </p>
          ) : (
            <p
              className="text-[15px] leading-snug text-[#a08b68]"
              style={{ fontFamily: HAND, transform: "rotate(-2deg)" }}
            >
              pick one &rarr;
            </p>
          )}
        </div>
      </CanvasStage>
    </div>
  );
}
