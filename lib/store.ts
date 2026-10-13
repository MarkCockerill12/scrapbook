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
  /** The visitor's own choice, off the speaker button. Sound is on unless they say so. */
  soundOff: boolean;
  /** The browser has let the audio context run, which takes a click or a key first. */
  audioReady: boolean;
  /** What pages read: silent by choice, or silent because the browser isn't ready yet.
   *  It flips to false the moment sound can actually start, so every page effect keyed
   *  on it starts its loops then, and not into a context that would swallow them. */
  muted: boolean;
  /** Slugs the visitor has landed on. Drives map "seen" markers and unlock eggs. */
  visited: string[];
  mapOpen: boolean;
  /** The title sequence has finished (or been skipped). Gates the map on the root route. */
  booted: boolean;
  phase: TransitionPhase;
  /** Slug we're travelling to, so the transition can theme itself to the destination. */
  travellingTo: string | null;

  hydrate: () => void;
  setBooted: (booted: boolean) => void;
  decideConsent: (granted: boolean) => void;
  setMuted: (muted: boolean) => void;
  setAudioReady: () => void;
  toggleMute: () => void;
  markVisited: (slug: string) => void;
  setMapOpen: (open: boolean) => void;
  beginTransition: (toSlug: string) => void;
  setPhase: (phase: TransitionPhase) => void;
}

export const useShell = create<ShellState>((set, get) => ({
  hydrated: false,
  consent: "undecided",
  soundOff: false,
  audioReady: false,
  muted: true, // until the first click or key; see `audioReady`
  visited: [],
  mapOpen: false,
  booted: false,
  phase: "idle",
  travellingTo: null,

  setBooted: (booted) => set({ booted }),

  hydrate: () => {
    if (get().hydrated) return;
    const consent = readConsent();
    set({
      hydrated: true,
      consent,
      soundOff: sbGet<boolean>(null, "sound-off", false),
      visited: sbGet<string[]>(null, "visited", []),
    });
  },

  decideConsent: (granted) => {
    const consent: ConsentState = granted ? "granted" : "denied";
    writeConsent(consent);
    set({ consent });
    // Re-commit anything gathered before the decision so a "yes" doesn't lose it.
    if (granted) {
      sbSet(null, "sound-off", get().soundOff);
      sbSet(null, "visited", get().visited);
    }
  },

  setMuted: (soundOff) => {
    sbSet(null, "sound-off", soundOff);
    set({ soundOff, muted: soundOff || !get().audioReady });
  },

  setAudioReady: () => {
    if (get().audioReady) return;
    set({ audioReady: true, muted: get().soundOff });
  },

  toggleMute: () => get().setMuted(!get().soundOff),

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
