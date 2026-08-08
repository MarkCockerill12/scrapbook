"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { CanvasMode } from "@/lib/registry";

/**
 * The scaled canvas.
 *
 * Every aesthetic is authored against a fixed pixel canvas (1600x900 by default) and
 * transform-scaled to fit whatever screen it lands on. This is what makes
 * single-viewport pages viable on phones: composition survives pixel-identically and
 * no page needs breakpoints of its own.
 *
 * Page CSS therefore uses raw px against the design canvas. Never vw/vh, never
 * media queries, inside /aesthetics.
 *
 * IMPORTANT: pointer events arrive in client space, which is scaled. Anything doing
 * drag or physics maths MUST convert first via useCanvas().toCanvasSpace() or it will
 * drift by a factor of `scale`.
 */

interface CanvasContextValue {
  scale: number;
  width: number;
  height: number;
  mode: CanvasMode;
  /** Client (viewport) point -> canvas coordinates. */
  toCanvasSpace: (clientX: number, clientY: number) => { x: number; y: number };
  /** Client distance -> canvas distance. For deltas, where origin is irrelevant. */
  toCanvasDelta: (d: number) => number;
}

const CanvasContext = createContext<CanvasContextValue | null>(null);

export function useCanvas(): CanvasContextValue {
  const ctx = useContext(CanvasContext);
  if (!ctx) {
    throw new Error("useCanvas must be used inside a <CanvasStage>");
  }
  return ctx;
}

export interface CanvasStageProps {
  children: ReactNode;
  width?: number;
  height?: number;
  mode?: CanvasMode;
  /** Colour painted behind/around the canvas. A design opportunity, not dead space. */
  letterbox?: string;
  className?: string;
}

export function CanvasStage({
  children,
  width = 1600,
  height = 900,
  mode = "fit",
  letterbox = "#000",
  className,
}: CanvasStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const measure = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const next =
        mode === "width" ? vw / width : Math.min(vw / width, vh / height);
      // Guard against 0 during odd resize frames — a 0 scale makes toCanvasSpace divide by zero.
      setScale(next > 0 ? next : 1);
    };

    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, [width, height, mode]);

  // Scroll is off globally (globals.css) and granted only to pages whose concept is
  // the scroll. Owning it here means a page can never forget to hand it back.
  useLayoutEffect(() => {
    if (mode !== "width") return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "auto";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mode]);

  const toCanvasSpace = useCallback(
    (clientX: number, clientY: number) => {
      const rect = stageRef.current?.getBoundingClientRect();
      if (!rect || !scale) return { x: 0, y: 0 };
      return {
        x: (clientX - rect.left) / scale,
        y: (clientY - rect.top) / scale,
      };
    },
    [scale],
  );

  const toCanvasDelta = useCallback((d: number) => (scale ? d / scale : d), [scale]);

  const value = useMemo<CanvasContextValue>(
    () => ({ scale, width, height, mode, toCanvasSpace, toCanvasDelta }),
    [scale, width, height, mode, toCanvasSpace, toCanvasDelta],
  );

  // scale === 0 means we haven't measured yet. Rendering at the wrong size for one
  // frame is a visible pop, so hold the frame until the first measurement lands.
  const measured = scale > 0;

  const outerStyle: CSSProperties =
    mode === "width"
      ? {
          background: letterbox,
          width: "100%",
          height: measured ? height * scale : "100vh",
          overflow: "hidden",
        }
      : {
          background: letterbox,
          position: "fixed",
          inset: 0,
          display: "grid",
          placeItems: "center",
          overflow: "hidden",
        };

  const innerStyle: CSSProperties = {
    width,
    height,
    transform: `scale(${measured ? scale : 1})`,
    transformOrigin: mode === "width" ? "top left" : "center center",
    position: "relative",
    flexShrink: 0,
    visibility: measured ? "visible" : "hidden",
  };

  return (
    <CanvasContext.Provider value={value}>
      <div style={outerStyle} className={className} data-canvas-outer="">
        <div ref={stageRef} style={innerStyle} data-canvas="">
          {children}
        </div>
      </div>
    </CanvasContext.Provider>
  );
}
