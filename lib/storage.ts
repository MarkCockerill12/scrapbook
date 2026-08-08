/**
 * Persistence with a consent gate.
 *
 * Pages persist real things — guestbook entries, visitor counters, notepad scribbles,
 * high scores, coins collected. All of it routes through here so a single decision
 * governs the lot.
 *
 * If the visitor declines, everything still works for the length of the session; it
 * just lives in memory and evaporates on reload. The decision itself is kept in
 * sessionStorage in that case, so we don't nag them again this visit but leave
 * nothing behind afterwards.
 */

export type ConsentState = "granted" | "denied" | "undecided";

const CONSENT_KEY = "sb:consent";
const PREFIX = "sb:";

/** Used when consent is denied, and on the server. */
const memory = new Map<string, string>();

const hasWindow = () => typeof window !== "undefined";

export function readConsent(): ConsentState {
  if (!hasWindow()) return "undecided";
  try {
    if (window.localStorage.getItem(CONSENT_KEY) === "granted") return "granted";
    if (window.sessionStorage.getItem(CONSENT_KEY) === "denied") return "denied";
  } catch {
    // Private browsing / storage disabled entirely. Treat as denied — memory only.
    return "denied";
  }
  return "undecided";
}

export function writeConsent(state: Exclude<ConsentState, "undecided">): void {
  if (!hasWindow()) return;
  try {
    if (state === "granted") {
      window.sessionStorage.removeItem(CONSENT_KEY);
      window.localStorage.setItem(CONSENT_KEY, "granted");
    } else {
      // Deliberately session-scoped: declining should not leave a durable trace.
      window.localStorage.removeItem(CONSENT_KEY);
      window.sessionStorage.setItem(CONSENT_KEY, "denied");
    }
  } catch {
    /* nothing we can do; memory fallback covers it */
  }
}

function durable(): boolean {
  return hasWindow() && readConsent() === "granted";
}

function fullKey(aesthetic: string | null, key: string): string {
  return aesthetic ? `${PREFIX}${aesthetic}:${key}` : `${PREFIX}${key}`;
}

export function sbGet<T>(aesthetic: string | null, key: string, fallback: T): T {
  const k = fullKey(aesthetic, key);
  let raw: string | null = null;
  if (durable()) {
    try {
      raw = window.localStorage.getItem(k);
    } catch {
      raw = null;
    }
  }
  if (raw === null) raw = memory.get(k) ?? null;
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function sbSet<T>(aesthetic: string | null, key: string, value: T): void {
  const k = fullKey(aesthetic, key);
  const raw = JSON.stringify(value);
  // Always mirror into memory so reads are consistent within the session regardless
  // of whether the durable write succeeded.
  memory.set(k, raw);
  if (!durable()) return;
  try {
    window.localStorage.setItem(k, raw);
  } catch {
    /* quota or disabled — memory copy still stands */
  }
}

export function sbRemove(aesthetic: string | null, key: string): void {
  const k = fullKey(aesthetic, key);
  memory.delete(k);
  if (!hasWindow()) return;
  try {
    window.localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}

/** Wipes everything ScrapBook has written. Offered in the consent modal. */
export function sbClearAll(): void {
  memory.clear();
  if (!hasWindow()) return;
  try {
    const doomed: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k?.startsWith(PREFIX)) doomed.push(k);
    }
    doomed.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}
