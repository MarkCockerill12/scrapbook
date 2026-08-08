"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { one } from "@/lib/assets";

/**
 * A single image out of a manifest slot, sized against the design canvas.
 *
 * Pages ask for a slot ("jdm_polaroid", pick 7) rather than a file, so a collage can
 * be laid out before a single grab has arrived and fill in as they land. Until then
 * it renders a placeholder at the right dimensions — which means layout work is never
 * blocked on asset delivery, and nothing reflows when the real image shows up.
 *
 * Deliberately unstyled beyond geometry. Frames, tape, shadows and borders belong to
 * the page; this only knows how to find the right pixels and put them in the right
 * box.
 */

export interface CutoutProps {
  aesthetic: string;
  /** Manifest slot id, e.g. "jdm_polaroid". See IMAGE_MANIFEST.md. */
  slot: string;
  /** Which image within the slot. Wraps, so this is safe before all images exist. */
  pick?: number;
  /** Canvas px. Give one and the other is derived from the image's aspect ratio. */
  width?: number;
  height?: number;
  alt?: string;
  /** Above-the-fold imagery should not lazy-load — the whole page is one screen. */
  priority?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function Cutout({
  aesthetic,
  slot,
  pick = 0,
  width,
  height,
  alt = "",
  priority = false,
  className,
  style,
}: CutoutProps) {
  const entry = one(aesthetic, slot, pick);

  if (!entry) {
    // No grabs for this slot yet. Occupy the exact space the real image will, so the
    // composition is reviewable now and doesn't shift later.
    return (
      <div
        className={className}
        aria-hidden
        style={{
          width: width ?? 200,
          height: height ?? 140,
          background:
            "repeating-linear-gradient(45deg, rgba(255,255,255,.07) 0 8px, rgba(255,255,255,.02) 8px 16px)",
          border: "1px dashed rgba(255,255,255,.22)",
          display: "grid",
          placeItems: "center",
          fontFamily: "ui-monospace, monospace",
          fontSize: 9,
          letterSpacing: ".08em",
          color: "rgba(255,255,255,.4)",
          textAlign: "center",
          padding: 4,
          overflow: "hidden",
          ...style,
        }}
        data-missing-slot={slot}
      >
        {slot}
      </div>
    );
  }

  const ratio = entry.width / entry.height;
  const w = width ?? (height ? Math.round(height * ratio) : entry.width);
  const h = height ?? Math.round(w / ratio);

  return (
    <Image
      src={entry.src}
      alt={alt}
      width={w}
      height={h}
      priority={priority}
      loading={priority ? undefined : "lazy"}
      className={className}
      style={{
        display: "block",
        width: w,
        height: h,
        objectFit: "contain",
        ...style,
      }}
    />
  );
}
