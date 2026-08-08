"use client";

import { create } from "zustand";
import {
  readConsent,
  sbGet,
  sbSet,
  writeConsent,
  type ConsentState,
} from "@/lib/storage";

/**
 * Shell state. Deliberately small — this is chrome-level only.
 *
 * Per-aesthetic state does NOT belong here. Each page owns its own state and
 * persists it through lib/storage directly, namespaced to its slug. Putting page
 * state in a global store is how 23 isolated pages quietly become one coupled app.
 */

export type TransitionPhase = "idle" | "out" | "in";

interface ShellState {
  hydrated: boolean;
  consent: ConsentState;
  muted: boolean;
  /** Slugs the visitor has landed on. Drives map "seen" markers and unlock eggs. */
  visited: string[];
  mapOpen: boolean;
  phase: TransitionPhase;
  /** Slug we're travelling to, so the transition can theme itself to the destination. */
  travellingTo: string | null;

  hydrate: () => void;
  decideConsent: (granted: boolean) => void;
  setMuted: (muted: boolean) => void;
  toggleMute: () => void;
  markVisited: (slug: string) => void;
  setMapOpen: (open: boolean) => void;
  beginTransition: (toSlug: string) => void;
  setPhase: (phase: TransitionPhase) => void;
}

export const useShell = create<ShellState>((set, get) => ({
  hydrated: false,
  consent: "undecided",
  muted: true, // always muted until the visitor asks otherwise
  visited: [],
  mapOpen: false,
  phase: "idle",
  travellingTo: null,

  hydrate: () => {
    if (get().hydrated) return;
    const consent = readConsent();
    set({
      hydrated: true,
      consent,
      muted: sbGet<boolean>(null, "muted", true),
      visited: sbGet<string[]>(null, "visited", []),
    });
  },

  decideConsent: (granted) => {
    const consent: ConsentState = granted ? "granted" : "denied";
    writeConsent(consent);
    set({ consent });
    // Re-commit anything gathered before the decision so a "yes" doesn't lose it.
    if (granted) {
      sbSet(null, "muted", get().muted);
      sbSet(null, "visited", get().visited);
    }
  },

  setMuted: (muted) => {
    sbSet(null, "muted", muted);
    set({ muted });
  },

  toggleMute: () => get().setMuted(!get().muted),

  markVisited: (slug) => {
    const { visited } = get();
    if (visited.includes(slug)) return;
    const next = [...visited, slug];
    sbSet(null, "visited", next);
    set({ visited: next });
  },

  setMapOpen: (mapOpen) => set({ mapOpen }),

  beginTransition: (toSlug) => set({ phase: "out", travellingTo: toSlug }),

  setPhase: (phase) =>
    set(phase === "idle" ? { phase, travellingTo: null } : { phase }),
}));
