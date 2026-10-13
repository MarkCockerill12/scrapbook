"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { sbGet, sbSet } from "@/lib/storage";
import { useShell } from "@/lib/store";
import { achievementChime } from "./sound";

/**
 * A real achievement system.
 *
 * The joke only lands if the achievements are genuine — if "visit ten channels" pops
 * because you actually visited ten channels, weeks apart, and the gamerscore was
 * still there when you came back. So they persist, they read the shell's real
 * `visited` list, and nothing here is on a timer.
 *
 * Unlocks are idempotent: re-entering the page recomputes every condition and only
 * the genuinely new ones queue a toast.
 */

export interface Achievement {
  id: string;
  name: string;
  how: string;
  gs: number;
}

const SLUG = "xbox-360";
const KEY = "achievements";

export const ACHIEVEMENTS: Achievement[] = [
  { id: "boot", name: "Welcome to the Dashboard", how: "Open the console", gs: 5 },
  { id: "blades", name: "Hub Hopper", how: "View all six hubs", gs: 10 },
  { id: "hits", name: "Hitmarker", how: "Land 25 hitmarkers", gs: 10 },
  { id: "montage", name: "Montage Parodius", how: "Switch on montage mode", gs: 15 },
  { id: "trickshot", name: "Trickshot", how: "Hit a target inside 300ms", gs: 30 },
  { id: "sightseer", name: "Sightseer", how: "Visit 5 channels", gs: 20 },
  { id: "tourist", name: "Frequent Flyer", how: "Visit 10 channels", gs: 40 },
  { id: "completionist", name: "Completionist", how: "Visit every channel", gs: 100 },
  { id: "noscope", name: "360 No-Scope", how: "Spin, then hit without scoping", gs: 50 },
];

const BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

export const MAX_GS = ACHIEVEMENTS.reduce((n, a) => n + a.gs, 0);

export function useAchievements() {
  const visited = useShell((s) => s.visited);
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const [queue, setQueue] = useState<Achievement[]>([]);
  const [toast, setToast] = useState<Achievement | null>(null);
  /** Mirrors `unlocked` for use inside callbacks without re-creating them. */
  const have = useRef<Set<string>>(new Set());

  useEffect(() => {
    const stored = sbGet<string[]>(SLUG, KEY, []);
    have.current = new Set(stored);
    setUnlocked(stored);
  }, []);

  const unlock = useCallback((id: string) => {
    if (have.current.has(id)) return;
    const a = BY_ID.get(id);
    if (!a) return;
    have.current.add(id);
    const next = [...have.current];
    sbSet(SLUG, KEY, next);
    setUnlocked(next);
    setQueue((q) => [...q, a]);
  }, []);

  // Conditions that depend only on how much of the site has been seen. Recomputed on
  // entry so a channel visited days ago still counts.
  useEffect(() => {
    unlock("boot");
    if (visited.length >= 5) unlock("sightseer");
    if (visited.length >= 10) unlock("tourist");
    if (visited.length >= 23) unlock("completionist");
  }, [visited.length, unlock]);

  // One toast at a time, in order, each holding for its full run.
  useEffect(() => {
    if (toast || queue.length === 0) return;
    const [next, ...rest] = queue;
    setQueue(rest);
    setToast(next);
    achievementChime();
    const id = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(id);
  }, [toast, queue]);

  const score = unlocked.reduce((n, id) => n + (BY_ID.get(id)?.gs ?? 0), 0);

  return { unlocked, unlock, toast, score };
}
