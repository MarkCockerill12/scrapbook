"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AESTHETICS, neighbour, type Aesthetic } from "@/lib/registry";
import { useShell } from "@/lib/store";

/**
 * The dial. Tier 1 of the two-tier nav: left/right walks adjacent channels.
 *
 * This and the map are the only UI that survives across all 23 aesthetics, so its
 * form and position never change — it is the visitor's anchor. The single
 * concession to the current page is the accent glow.
 */
export function Dial({ current }: { current: Aesthetic }) {
  const router = useRouter();
  const begin = useShell((s) => s.beginTransition);
  const phase = useShell((s) => s.phase);
  const setMapOpen = useShell((s) => s.setMapOpen);
  const mapOpen = useShell((s) => s.mapOpen);
  const muted = useShell((s) => s.muted);
  const toggleMute = useShell((s) => s.toggleMute);

  const busy = phase !== "idle";

  // Adjacent channels are one keypress away, so pay for them up front.
  useEffect(() => {
    router.prefetch(`/${neighbour(current.slug, 1).slug}`);
    router.prefetch(`/${neighbour(current.slug, -1).slug}`);
  }, [current.slug, router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      // Pages have real text inputs — a guestbook, a BBS prompt, a notepad. Never
      // steal arrow keys from someone who is typing.
      if (
        target &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }
      if (useShell.getState().phase !== "idle") return;

      if (e.key === "ArrowRight") begin(neighbour(current.slug, 1).slug);
      else if (e.key === "ArrowLeft") begin(neighbour(current.slug, -1).slug);
      else if (e.key.toLowerCase() === "m") setMapOpen(!useShell.getState().mapOpen);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current.slug, begin, setMapOpen]);

  if (mapOpen) return null;

  const step = (dir: number) => {
    if (busy) return;
    begin(neighbour(current.slug, dir).slug);
  };

  return (
    <div className="fixed bottom-5 right-5 z-[8000] select-none font-mono">
      <div
        className="flex items-stretch gap-1 rounded-2xl border border-white/15 bg-black/65 p-1.5 shadow-2xl backdrop-blur-md"
        style={{ boxShadow: `0 0 28px -8px ${current.accent}` }}
      >
        <DialButton label="Previous channel" onClick={() => step(-1)} disabled={busy}>
          ‹
        </DialButton>

        <button
          type="button"
          onClick={() => setMapOpen(true)}
          className="group min-w-[168px] rounded-xl px-3 py-1.5 text-left transition hover:bg-white/10"
          title="Zoom out to the map  (M)"
        >
          <div className="flex items-baseline gap-2">
            <span
              className="text-lg leading-none tabular-nums"
              style={{ color: current.accent }}
            >
              {String(current.channel).padStart(2, "0")}
            </span>
            <span className="truncate text-[11px] uppercase tracking-[0.18em] text-white/80">
              {current.name}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="text-[9px] uppercase tracking-[0.2em] text-white/35">
              {current.channel} / {AESTHETICS.length}
            </span>
            <span className="text-[9px] uppercase tracking-[0.2em] text-white/25 group-hover:text-white/50">
              · zoom out
            </span>
          </div>
        </button>

        <DialButton label="Next channel" onClick={() => step(1)} disabled={busy}>
          ›
        </DialButton>

        <DialButton
          label={muted ? "Unmute" : "Mute"}
          onClick={toggleMute}
          disabled={false}
        >
          <span className="text-sm">{muted ? "🔇" : "🔊"}</span>
        </DialButton>
      </div>
    </div>
  );
}

function DialButton({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="grid w-9 place-items-center rounded-xl text-xl leading-none text-white/75 transition hover:bg-white/10 hover:text-white disabled:opacity-30"
    >
      {children}
    </button>
  );
}
