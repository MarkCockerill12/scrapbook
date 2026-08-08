"use client";

import {
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

/**
 * Tilt toward the cursor in 3D.
 *
 * Used wherever something should feel like a physical object catching the light —
 * polaroids, trading cards, glossy Frutiger panels, PS1 memory-card icons.
 *
 * Behaviour only. The optional glare is a plain white radial the page can style or
 * ignore; everything else (borders, shadows, frames) belongs to the page.
 *
 * Note this reads offsets from the element's own rect, so it's already scale-correct
 * without going through toCanvasDelta — the rect is measured in the same client space
 * as the pointer.
 */

export interface TiltableProps {
  children: ReactNode;
  /** Max rotation in degrees at the edges. */
  max?: number;
  /** Perspective distance in px. Lower = more dramatic. */
  perspective?: number;
  /** Scale while hovered. */
  hoverScale?: number;
  /** Overlay a specular sweep that tracks the cursor. */
  glare?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function Tiltable({
  children,
  max = 12,
  perspective = 700,
  hoverScale = 1.03,
  glare = false,
  className,
  style,
}: TiltableProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 50 });
  const [active, setActive] = useState(false);

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return;

    // -0.5 .. 0.5 across the element
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;

    setTilt({
      rx: -py * max * 2,
      ry: px * max * 2,
      gx: (px + 0.5) * 100,
      gy: (py + 0.5) * 100,
    });
  };

  const reset = () => {
    setActive(false);
    setTilt({ rx: 0, ry: 0, gx: 50, gy: 50 });
  };

  return (
    <div
      ref={ref}
      className={className}
      onPointerEnter={() => setActive(true)}
      onPointerMove={onPointerMove}
      onPointerLeave={reset}
      style={{
        position: "relative",
        transformStyle: "preserve-3d",
        transform: `perspective(${perspective}px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale(${active ? hoverScale : 1})`,
        transition: active
          ? "transform 90ms linear"
          : "transform 420ms cubic-bezier(.2,.9,.3,1)",
        ...style,
      }}
    >
      {children}
      {glare && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            opacity: active ? 1 : 0,
            transition: "opacity 260ms ease",
            background: `radial-gradient(circle at ${tilt.gx}% ${tilt.gy}%, rgba(255,255,255,.42), rgba(255,255,255,0) 58%)`,
            mixBlendMode: "screen",
          }}
        />
      )}
    </div>
  );
}
