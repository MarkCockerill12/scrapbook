"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { ConsentModal } from "@/chrome/ConsentModal";
import { Dial } from "@/chrome/Dial";
import { Transition } from "@/chrome/Transition";
import { WorldMap } from "@/chrome/WorldMap";
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

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const slug = pathname?.split("/").filter(Boolean)[0] ?? "";
  const current = getAesthetic(slug);

  useEffect(() => {
    if (current) markVisited(current.slug);
  }, [current, markVisited]);

  // Landing anywhere that isn't a channel (the root, a bad slug) should present the
  // map rather than a dead end.
  useEffect(() => {
    if (!current) setMapOpen(true);
  }, [current, setMapOpen]);

  return (
    <>
      <Transition />
      <WorldMap />
      <ConsentModal />
      {current && <Dial current={current} />}
    </>
  );
}

export { AESTHETICS };
