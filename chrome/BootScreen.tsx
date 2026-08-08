"use client";

import { animate, createTimeline } from "animejs";
import { useEffect, useRef } from "react";
import { AESTHETICS } from "@/lib/registry";
import { useShell } from "@/lib/store";

const HOLD_MS = 3200;

/**
 * The title sequence. The site's own moment, before any aesthetic takes over.
 *
 * A CRT powering on: the picture collapses out of a single horizontal line, the name
 * settles, then it hands over to the map. Skippable with any key or click — it plays
 * on every arrival at the root, so it has to be short and it has to be escapable.
 *
 * Also serves as the audio-unlock gesture when the visitor skips it by clicking; the
 * browser needs a real user gesture before anything is allowed to make noise.
 */
export function BootScreen() {
  const booted = useShell((s) => s.booted);
  const setBooted = useShell((s) => s.setBooted);

  const rootRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    if (booted) return;
    const root = rootRef.current;
    const line = lineRef.current;
    const body = bodyRef.current;
    if (!root || !line || !body) return;

    const finish = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      animate(root, {
        opacity: [1, 0],
        duration: 460,
        ease: "inQuad",
      }).then(() => setBooted(true));
    };

    const tl = createTimeline()
      // 1. the beam: a hairline stabbing out horizontally
      .add(line, {
        scaleX: [0, 1],
        opacity: [0, 1],
        duration: 340,
        ease: "outExpo",
      })
      // 2. the picture opening up out of the line, past the edges of the frame — it
      //    has to overshoot the viewport or it reads as a highlight bar rather than a
      //    tube coming on.
      .add(line, {
        scaleY: [1, 1400],
        scaleX: [1, 1.45],
        opacity: [1, 0.05],
        duration: 320,
        ease: "outQuad",
      })
      // 3. the name settling in
      .add(
        body,
        {
          opacity: [0, 1],
          scale: [1.06, 1],
          duration: 620,
          ease: "outExpo",
        },
        "-=120",
      );

    const hold = window.setTimeout(finish, HOLD_MS);

    const skip = () => finish();
    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", skip);

    return () => {
      window.clearTimeout(hold);
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
      tl.pause();
    };
  }, [booted, setBooted]);

  if (booted) return null;

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[9200] grid place-items-center overflow-hidden bg-black"
    >
      {/* the CRT beam */}
      <div
        ref={lineRef}
        className="absolute left-1/2 top-1/2 h-px w-[72vw] -translate-x-1/2 -translate-y-1/2 bg-white opacity-0"
        style={{ boxShadow: "0 0 22px 3px rgba(255,255,255,.75)" }}
      />

      <div ref={bodyRef} className="relative z-10 px-8 text-center opacity-0">
        <h1 className="font-mono text-[clamp(2rem,7vw,4.6rem)] leading-none tracking-[0.34em] text-white">
          SCRAP<span className="text-white/40">BOOK</span>
        </h1>
        <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.42em] text-white/40">
          {AESTHETICS.length} channels
        </p>
        <p className="mt-14 font-mono text-[10px] uppercase tracking-[0.3em] text-white/25">
          Press any key
        </p>
      </div>

      {/* scanlines + vignette, so the title sits inside a tube rather than on a page */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "repeating-linear-gradient(to bottom, rgba(0,0,0,.30) 0 1px, transparent 1px 3px)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 42%, rgba(0,0,0,.85) 100%)",
        }}
      />
    </div>
  );
}
