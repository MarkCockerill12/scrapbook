"use client";

import { unlock } from "@/lib/audio";
import { useShell } from "@/lib/store";

/**
 * Shown once, on first visit, then never again.
 *
 * Deliberately NOT themed per aesthetic and deliberately not restyled by any page —
 * it's the one moment the site speaks plainly, before the performance starts. Every
 * other surface can lie about what decade it is; this one shouldn't.
 */
export function ConsentModal() {
  const hydrated = useShell((s) => s.hydrated);
  const consent = useShell((s) => s.consent);
  const decide = useShell((s) => s.decideConsent);

  if (!hydrated || consent !== "undecided") return null;

  return (
    <div className="fixed inset-0 z-[9500] grid place-items-center bg-black/75 p-6 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#101318] p-7 text-white shadow-2xl">
        <h2 className="text-lg font-medium tracking-tight">Before you go in</h2>

        <div className="mt-4 space-y-3 text-sm leading-relaxed text-white/65">
          <p>
            Some pages here remember things — a guestbook you sign, a drawing you
            leave, coins you collect, how many times you&apos;ve visited. That&apos;s
            kept in your browser&apos;s local storage. Nothing is sent anywhere and
            there&apos;s no tracking.
          </p>
          <p>
            Say no and everything still works, it just forgets when you close the tab.
          </p>
          <p className="text-white/45">
            There&apos;s sound on most pages. It starts muted — the speaker button in
            the corner turns it on.
          </p>
        </div>

        <div className="mt-6 flex gap-2.5">
          <button
            type="button"
            onClick={() => {
              unlock();
              decide(true);
            }}
            className="flex-1 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-white/85"
          >
            Let it remember
          </button>
          <button
            type="button"
            onClick={() => decide(false)}
            className="flex-1 rounded-xl border border-white/15 px-4 py-2.5 text-sm text-white/75 transition hover:bg-white/5 hover:text-white"
          >
            No thanks
          </button>
        </div>
      </div>
    </div>
  );
}
