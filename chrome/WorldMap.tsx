"use client";

import { useEffect, useRef, useState } from "react";
import { AESTHETICS, type Aesthetic } from "@/lib/registry";
import { useShell } from "@/lib/store";

/**
 * The map. Tier 2 of the nav: zoom out from a single channel to the whole roster and
 * jump straight to any of them without cycling.
 *
 * ART DIRECTION IS PROVISIONAL. See OPEN_QUESTIONS.md #6 — this is the one surface
 * the site is allowed a personality of its own, and it's the thing people will
 * screenshot. Current treatment is a star-chart/graticule placeholder: deliberately
 * neutral, laid out so the pin positions and interactions survive a full repaint.
 */
export function WorldMap() {
  const open = useShell((s) => s.mapOpen);
  const setMapOpen = useShell((s) => s.setMapOpen);
  const begin = useShell((s) => s.beginTransition);
  const visited = useShell((s) => s.visited);

  const [hovered, setHovered] = useState<Aesthetic | null>(null);
  const fieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMapOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setMapOpen]);

  // Gentle parallax so the field feels like a space you're above rather than a list.
  useEffect(() => {
    if (!open) return;
    const el = fieldRef.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      const dx = (e.clientX / window.innerWidth - 0.5) * 2;
      const dy = (e.clientY / window.innerHeight - 0.5) * 2;
      el.style.setProperty("--px", `${dx * 14}px`);
      el.style.setProperty("--py", `${dy * 14}px`);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [open]);

  if (!open) return null;

  const travel = (slug: string) => {
    setMapOpen(false);
    begin(slug);
  };

  return (
    <div className="fixed inset-0 z-[8500] bg-[#05070c] font-mono text-white">
      {/* graticule */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #6ea8ff 1px, transparent 1px), linear-gradient(to bottom, #6ea8ff 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 45%, rgba(70,110,190,.22), transparent 62%)",
        }}
      />

      <header className="absolute left-8 top-7 z-10">
        <h1 className="text-sm uppercase tracking-[0.42em] text-white/85">
          Scrap&thinsp;Book
        </h1>
        <p className="mt-1.5 text-[11px] tracking-[0.2em] text-white/35">
          {AESTHETICS.length} channels · {visited.length} visited
        </p>
      </header>

      <button
        type="button"
        onClick={() => setMapOpen(false)}
        className="absolute right-8 top-7 z-10 rounded-lg border border-white/15 px-3.5 py-2 text-[11px] uppercase tracking-[0.2em] text-white/60 transition hover:bg-white/10 hover:text-white"
      >
        Close · esc
      </button>

      {/* the field */}
      <div
        ref={fieldRef}
        className="absolute inset-x-[7%] inset-y-[16%]"
        style={{ transform: "translate(var(--px, 0), var(--py, 0))" }}
      >
        {AESTHETICS.map((a) => {
          const seen = visited.includes(a.slug);
          const isHovered = hovered?.slug === a.slug;
          return (
            <button
              key={a.slug}
              type="button"
              onClick={() => travel(a.slug)}
              onPointerEnter={() => setHovered(a)}
              onPointerLeave={() => setHovered((h) => (h?.slug === a.slug ? null : h))}
              onFocus={() => setHovered(a)}
              className="group absolute -translate-x-1/2 -translate-y-1/2 outline-none"
              style={{ left: `${a.map.x}%`, top: `${a.map.y}%` }}
            >
              <span
                className="block rounded-full transition-all duration-200 group-hover:scale-[1.6] group-focus-visible:scale-[1.6]"
                style={{
                  width: isHovered ? 16 : 11,
                  height: isHovered ? 16 : 11,
                  background: a.accent,
                  opacity: seen ? 1 : 0.5,
                  boxShadow: `0 0 ${isHovered ? 30 : 14}px ${a.accent}`,
                }}
              />
              <span
                className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap text-[10px] uppercase tracking-[0.16em] transition-opacity duration-200"
                style={{ opacity: isHovered ? 1 : 0.4 }}
              >
                <span className="tabular-nums text-white/40">
                  {String(a.channel).padStart(2, "0")}
                </span>{" "}
                <span className="text-white/85">{a.name}</span>
              </span>
              {a.status === "planned" && (
                <span
                  className="pointer-events-none absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed"
                  style={{ borderColor: `${a.accent}55` }}
                />
              )}
            </button>
          );
        })}
      </div>

      <footer className="absolute inset-x-0 bottom-8 flex justify-center">
        <div className="min-h-[52px] text-center">
          {hovered ? (
            <>
              <p className="text-base tracking-[0.16em] text-white/90">
                {hovered.name}
              </p>
              <p className="mt-1 text-[11px] tracking-[0.12em] text-white/45">
                {hovered.tagline}
              </p>
              {hovered.status === "planned" && (
                <p className="mt-1.5 text-[9px] uppercase tracking-[0.3em] text-amber-300/60">
                  Not yet built
                </p>
              )}
            </>
          ) : (
            <p className="text-[11px] uppercase tracking-[0.3em] text-white/25">
              Select a channel
            </p>
          )}
        </div>
      </footer>
    </div>
  );
}
