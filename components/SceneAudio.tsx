"use client";

import { useLayoutEffect } from "react";
import { newScene } from "@/lib/audio";

/**
 * Gives each channel its own sound bus. A layout effect, so the swap has happened
 * before any effect in the page underneath starts a loop or a score.
 */
export function SceneAudio({ slug }: { slug: string }) {
  useLayoutEffect(() => {
    newScene();
  }, [slug]);
  return null;
}
