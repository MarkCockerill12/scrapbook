"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { BootScreen } from "@/chrome/BootScreen";
import { ConsentModal } from "@/chrome/ConsentModal";
import { Dial } from "@/chrome/Dial";
import { Transition } from "@/chrome/Transition";
import { WorldMap } from "@/chrome/WorldMap";
import { unlock } from "@/lib/audio";
import { AESTHETICS, getAesthetic } from "@/lib/registry";
import { useShell } from "@/lib/store";

/**
 * Mounts the persistent shell. Everything in /chrome hangs off this and nothing else
 * in the app should render nav UI.
 *
 * This is also the only place Tailwind is allowed to run — see the content globs in
 * the Tailwind config and rule R2 in ULTIMATE_CONTEXT.md. Aesthetic pages style
 * themselves with their own CSS Modules and tokens.
 */
export function ChromeRoot() {
  const pathname = usePathname();
  const hydrate = useShell((s) => s.hydrate);
  const markVisited = useShell((s) => s.markVisited);
  const setMapOpen = useShell((s) => s.setMapOpen);
  const booted = useShell((s) => s.booted);
  const setBooted = useShell((s) => s.setBooted);
  const audioReady = useShell((s) => s.audioReady);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Sound is on by default, but a browser won't start it without a click or a key.
  // The first one anywhere does it, and the listeners go once it has worked.
  useEffect(() => {
    if (audioReady) return;
    const wake = () => unlock();
    const kinds = ["pointerdown", "pointerup", "click", "keydown", "touchend"] as const;
    kinds.forEach((k) => window.addEventListener(k, wake, true));
    return () => kinds.forEach((k) => window.removeEventListener(k, wake, true));
  }, [audioReady]);

  const slug = pathname?.split("/").filter(Boolean)[0] ?? "";
  const current = getAesthetic(slug);

  useEffect(() => {
    if (current) markVisited(current.slug);
  }, [current, markVisited]);

  // Landing anywhere that isn't a channel (the root, a bad slug) should present the
  // map rather than a dead end — but not until the title sequence has cleared, or
  // the map pops up behind it.
  useEffect(() => {
    if (!current && booted) setMapOpen(true);
  }, [current, booted, setMapOpen]);

  // Arriving directly on a channel skips the title sequence entirely: it's the site's
  // introduction, and someone following a deep link has already been introduced.
  useEffect(() => {
    if (current && !booted) setBooted(true);
  }, [current, booted, setBooted]);

  return (
    <>
      <Transition />
      <WorldMap />
      {!current && <BootScreen />}
      <ConsentModal />
      {current && <Dial current={current} />}
    </>
  );
}

export { AESTHETICS };
