"use client";

import { useEffect, useRef } from "react";
import { unlock } from "@/lib/audio";
import { useShell } from "@/lib/store";

/**
 * Shown on first visit, and it is a door, not a notice: nothing behind it can be
 * clicked, keyed or tabbed to until it has been acknowledged. There is no "no" on it —
 * carrying on is the acceptance, and the card says so.
 *
 * Deliberately NOT themed per aesthetic and deliberately not restyled by any page —
 * it's the one moment the site speaks plainly, before the performance starts. Every
 * other surface can lie about what decade it is; this one shouldn't.
 */
export function ConsentModal() {
  const hydrated = useShell((s) => s.hydrated);
  const consent = useShell((s) => s.consent);
  const decide = useShell((s) => s.decideConsent);
  const card = useRef<HTMLDivElement>(null);

  const open = hydrated && consent !== "granted";

  // The overlay already eats the pointer. This eats the keyboard: pages and the dial
  // listen on window, so keys are stopped on the way down, and Tab stays on the card.
  useEffect(() => {
    if (!open) return;
    const buttons = () => Array.from(card.current?.querySelectorAll("button") ?? []);
    buttons()[0]?.focus();

    const swallow = (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.type !== "keydown") return;
      const inside = card.current?.contains(document.activeElement) ?? false;
      if (e.key === "Tab") {
        e.preventDefault();
        const all = buttons();
        const at = all.indexOf(document.activeElement as HTMLButtonElement);
        all[(at + (e.shiftKey ? -1 : 1) + all.length) % all.length]?.focus();
      } else if (!inside) {
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", swallow, true);
    window.addEventListener("keyup", swallow, true);
    window.addEventListener("keypress", swallow, true);
    return () => {
      window.removeEventListener("keydown", swallow, true);
      window.removeEventListener("keyup", swallow, true);
      window.removeEventListener("keypress", swallow, true);
    };
  }, [open]);

  if (!open) return null;

  const accept = () => {
    unlock();
    decide(true);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sb-consent-title"
      // a click on the dimmed part mustn't take focus off the card
      onMouseDown={(e) => e.target === e.currentTarget && e.preventDefault()}
      className="fixed inset-0 z-[9500] grid place-items-center bg-black/75 p-6 backdrop-blur-sm"
    >
      <div ref={card} className="w-full max-w-md rounded-2xl border border-white/10 bg-[#101318] p-7 text-white shadow-2xl">
        <h2 id="sb-consent-title" className="text-lg font-medium tracking-tight">
          Before you go in
        </h2>

        <div className="mt-4 space-y-3 text-sm leading-relaxed text-white/65">
          <p>
            Some pages here remember things — a guestbook you sign, a drawing you
            leave, coins you collect, how many times you&apos;ve visited. That&apos;s
            kept in your browser&apos;s local storage. Nothing is sent anywhere and
            there&apos;s no tracking.
          </p>
          <p>By continuing, you accept that.</p>
          <p className="text-white/45">
            There&apos;s sound on most pages, and it&apos;s on. The speaker button in
            the corner turns it off.
          </p>
        </div>

        <button
          type="button"
          onClick={accept}
          className="mt-6 w-full rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-white/85"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
