"use client";

import { animate } from "animejs";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { channelChange, duckScene } from "@/lib/audio";
import { getAesthetic } from "@/lib/registry";
import { useShell } from "@/lib/store";

const OUT_MS = 300;
const IN_MS = 420;

/**
 * The channel change.
 *
 * Owns the whole hop: covers the screen in interference, performs the route push
 * underneath the cover, then clears. Nothing else calls router.push for a channel
 * change — funnelling it here is what stops a half-loaded page ever being visible.
 *
 * The cover duration is also our asset budget. If a destination needs longer to load
 * its fonts and hero imagery, extend the static rather than letting the page pop in
 * unstyled — a beat of noise reads as intentional, a flash of unstyled content
 * destroys the illusion.
 */
export function Transition() {
  const router = useRouter();
  const pathname = usePathname();

  const phase = useShell((s) => s.phase);
  const travellingTo = useShell((s) => s.travellingTo);
  const setPhase = useShell((s) => s.setPhase);

  const overlayRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  /** Path we were on when the hop started, so we know when the swap has landed. */
  const departedFrom = useRef<string | null>(null);

  const destination = travellingTo ? getAesthetic(travellingTo) : undefined;

  // --- static noise -------------------------------------------------------
  useEffect(() => {
    if (phase === "idle") {
      cancelAnimationFrame(rafRef.current);
      return;
    }
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { alpha: false });
    if (!canvas || !ctx) return;

    // Deliberately tiny and scaled up with pixelated rendering — real CRT snow is
    // chunky, and painting 1920x1080 random pixels per frame is not free.
    const W = (canvas.width = 320);
    const H = (canvas.height = 180);
    const image = ctx.createImageData(W, H);
    const buf = image.data;

    const draw = () => {
      for (let i = 0; i < buf.length; i += 4) {
        const v = (Math.random() * 255) | 0;
        buf[i] = v;
        buf[i + 1] = v;
        buf[i + 2] = v;
        buf[i + 3] = 255;
      }
      ctx.putImageData(image, 0, 0);
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => cancelAnimationFrame(rafRef.current);
  }, [phase]);

  // --- phase: out ---------------------------------------------------------
  useEffect(() => {
    if (phase !== "out" || !travellingTo) return;
    const el = overlayRef.current;
    if (!el) return;

    departedFrom.current = pathname;
    const target = `/${travellingTo}`;
    // the page being left goes quiet under the static, and the tuner is heard moving
    duckScene(OUT_MS / 1000);
    channelChange();

    const anim = animate(el, {
      opacity: [0, 1],
      duration: OUT_MS,
      ease: "outQuad",
    });

    let done = false;
    const push = () => {
      if (done) return;
      done = true;
      if (pathname === target) {
        // Already here (re-selected the current channel) — no navigation will fire,
        // so advance ourselves or the overlay sticks forever.
        setPhase("in");
      } else {
        router.push(target);
      }
    };

    anim.then(push);
    // Belt and braces: if the animation never settles (tab backgrounded, reduced
    // motion, anime.js promise not firing) the overlay must not trap the visitor.
    const bail = window.setTimeout(push, OUT_MS + 400);

    return () => {
      window.clearTimeout(bail);
    };
    // pathname intentionally excluded: we capture it once at the start of the hop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, travellingTo, router, setPhase]);

  // --- the route swap landed -> phase: in ---------------------------------
  useEffect(() => {
    if (phase !== "out") return;
    if (departedFrom.current === null) return;
    if (pathname === departedFrom.current) return;
    setPhase("in");
  }, [pathname, phase, setPhase]);

  // --- phase: in ----------------------------------------------------------
  useEffect(() => {
    if (phase !== "in") return;
    const el = overlayRef.current;
    if (!el) return;

    const anim = animate(el, {
      opacity: [1, 0],
      duration: IN_MS,
      ease: "inQuad",
    });

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      departedFrom.current = null;
      setPhase("idle");
    };
    anim.then(finish);
    const bail = window.setTimeout(finish, IN_MS + 400);
    return () => window.clearTimeout(bail);
  }, [phase, setPhase]);

  const active = phase !== "idle";

  return (
    <div
      ref={overlayRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[9000] opacity-0"
      style={{ display: active ? "block" : "none" }}
    >
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        style={{ imageRendering: "pixelated" }}
      />
      {/* roll bar sweeping down, the way a mistuned CRT does */}
      <div className="sb-rollbar absolute inset-x-0 h-[18vh] bg-gradient-to-b from-transparent via-white/25 to-transparent" />
      {/* scanlines over the top of the snow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "repeating-linear-gradient(to bottom, rgba(0,0,0,.35) 0 1px, transparent 1px 3px)",
        }}
      />
      {destination && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-center font-mono tracking-[0.35em] text-white/85">
          <div className="text-4xl tabular-nums">
            CH {String(destination.channel).padStart(2, "0")}
          </div>
          <div className="mt-2 text-xs tracking-[0.3em] text-white/55">
            {destination.name.toUpperCase()}
          </div>
        </div>
      )}
    </div>
  );
}
