import type { Aesthetic } from "@/lib/registry";

/**
 * Stands in for a channel that's on the roster but not built yet.
 *
 * Styled as chrome, not as the aesthetic — faking a half-built page in its own style
 * would make it hard to tell "unfinished" from "finished and bad" during review.
 */
export function ChannelOffline({ aesthetic }: { aesthetic: Aesthetic }) {
  return (
    <div className="grid h-full w-full place-items-center bg-[#07090d] font-mono text-white">
      <div className="max-w-lg px-8 text-center">
        <p
          className="text-7xl leading-none tabular-nums"
          style={{ color: aesthetic.accent }}
        >
          {String(aesthetic.channel).padStart(2, "0")}
        </p>
        <h1 className="mt-6 text-2xl tracking-[0.22em] text-white/90">
          {aesthetic.name.toUpperCase()}
        </h1>
        <p className="mt-3 text-sm tracking-[0.1em] text-white/40">
          {aesthetic.tagline}
        </p>

        <div className="mx-auto mt-9 h-px w-24 bg-white/15" />

        <p className="mt-7 text-[11px] uppercase tracking-[0.34em] text-amber-300/60">
          No signal
        </p>
        <p className="mt-3 text-xs leading-relaxed text-white/30">
          This channel is on the roster but hasn&apos;t been built. Pages ship one at a
          time, finished.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {aesthetic.tags.map((t) => (
            <span
              key={t}
              className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/35"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
