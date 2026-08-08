"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AESTHETICS, getAesthetic } from "@/lib/registry";
import { useShell } from "@/lib/store";
import { ACHIEVEMENTS, MAX_GS, useAchievements } from "./achievements";
import { HitLayer } from "./HitLayer";
import { MontagePlayer } from "./MontagePlayer";
import { Quickscope } from "./Quickscope";
import { bladeSwoosh, blip, drop, redRing } from "./sound";
import styles from "./styles.module.css";

/**
 * Channel 04 — Xbox 360.
 *
 * Fiction: *xX_no_scope_420_Xx's montage upload page*, living inside a blades
 * dashboard that never got updated to the NXE.
 *
 * The demo argument: the blades UI is a stack of lit glass sheets, not a row of
 * tabs. Blades overlap in Z and shadow each other, every surface is glossy and lit
 * from above, the green is environmental rather than decorative, and the selected
 * row *inverts* to bright-with-dark-text. Get those four right and a plain list
 * becomes unmistakably 2006.
 *
 * The achievements are real: they read the shell's genuine `visited` list, persist
 * under `sb:xbox-360:achievements`, and are the site's exploration reward.
 *
 * No assets. The montage clip is canvas; everything else is CSS.
 */

interface Blade {
  id: string;
  name: string;
  sub: string;
  color: string;
}

const BLADES: Blade[] = [
  { id: "marketplace", name: "Marketplace", sub: "23 channels available", color: "#6ab023" },
  { id: "live", name: "Xbox Live", sub: "friends list", color: "#8fd400" },
  { id: "games", name: "Games", sub: "achievements · snipez 360", color: "#4a8a12" },
  { id: "media", name: "Media", sub: "my montage", color: "#2b7fd4" },
  { id: "system", name: "System", sub: "console settings", color: "#8b969d" },
];

interface Friend {
  tag: string;
  playing: string | null;
  state: string;
  hue: number;
}

const FRIENDS: Friend[] = [
  { tag: "MLGxDoritos99", playing: "frutiger-aero", state: "In a lobby", hue: 96 },
  { tag: "sn1per_pete", playing: "bbs", state: "300 baud", hue: 186 },
  { tag: "GamerTag2007", playing: "win98", state: "Employee Portal", hue: 214 },
  { tag: "420BlazeItGuy", playing: "deep-sea", state: "Depth 1,840m", hue: 168 },
  { tag: "HALO_M0M", playing: "neon", state: "Customising", hue: 312 },
  { tag: "xX_QuickScope_Xx", playing: null, state: "Away — 2h", hue: 40 },
  { tag: "TrueSkill_Andy", playing: null, state: "Offline", hue: 0 },
  { tag: "n0scope_nathan", playing: "matrix", state: "Unauthorised session", hue: 120 },
];

export default function Xbox360() {
  const rootRef = useRef<HTMLDivElement>(null);
  const begin = useShell((s) => s.beginTransition);
  const visited = useShell((s) => s.visited);
  const { unlocked, unlock, toast, score } = useAchievements();

  const [blade, setBlade] = useState(1);
  const [row, setRow] = useState<Record<string, number>>({});
  const [montage, setMontage] = useState(false);
  const [rrod, setRrod] = useState(false);
  const [seen, setSeen] = useState<Set<string>>(() => new Set(["live"]));

  const current = BLADES[blade];
  const selected = row[current.id] ?? 0;

  useEffect(() => {
    if (seen.size >= BLADES.length) unlock("blades");
  }, [seen, unlock]);

  const openBlade = (i: number) => {
    if (i === blade) return;
    setBlade(i);
    bladeSwoosh();
    setSeen((s) => new Set(s).add(BLADES[i].id));
  };

  const pick = (i: number) => {
    setRow((r) => ({ ...r, [current.id]: i }));
    blip();
  };

  const toggleMontage = () => {
    const next = !montage;
    setMontage(next);
    if (next) {
      drop();
      unlock("montage");
    }
  };

  const triggerRrod = () => {
    unlock("noscope");
    setRrod(true);
    redRing();
    window.setTimeout(() => setRrod(false), 6000);
  };

  // Blade x-extents: everything left of the active blade stays a strip, everything
  // right of it stacks against the right edge. That stacking IS the blades metaphor.
  const geometry = useMemo(() => {
    const STRIP = 46;
    return BLADES.map((_, i) => ({
      stripX: i < blade ? i * STRIP : 1600 - (BLADES.length - i) * STRIP,
      isLeft: i < blade,
    }));
  }, [blade]);

  const panelLeft = blade * 46;
  const panelRight = (BLADES.length - 1 - blade) * 46;

  /* Most-recently-visited first, backfilled with live channels so the row is never
     half-empty on a first visit. */
  const recent = useMemo(() => {
    const seenLive = [...visited]
      .reverse()
      .map((s) => getAesthetic(s))
      .filter((a): a is NonNullable<typeof a> => !!a && a.status === "live");
    const fill = AESTHETICS.filter(
      (a) => a.status === "live" && !seenLive.some((s) => s.slug === a.slug),
    );
    return [...seenLive, ...fill].slice(0, 7);
  }, [visited]);

  return (
    <div
      ref={rootRef}
      className={`${styles.root} ${montage ? styles.montage : ""}`}
      style={{ "--bladeC": current.color } as React.CSSProperties}
    >
      <div className={styles.swoosh} />

      {BLADES.map((b, i) =>
        i === blade ? null : (
          <button
            key={b.id}
            type="button"
            className={styles.strip}
            style={
              { left: geometry[i].stripX, "--bladeC": b.color } as React.CSSProperties
            }
            onClick={() => openBlade(i)}
          >
            <span className={styles.stripLabel}>{b.name}</span>
          </button>
        ),
      )}

      <section
        className={styles.blade}
        style={{ left: panelLeft, right: panelRight }}
        key={current.id}
      >
        <header className={styles.head}>
          <div>
            <h1 className={styles.bladeName}>{current.name}</h1>
            <div className={styles.bladeSub}>{current.sub}</div>
          </div>

          <div className={styles.gamertag}>
            <div className={styles.gpic}>☠</div>
            <div>
              <div className={styles.gname}>xX_no_scope_420_Xx</div>
              <div className={styles.grow}>
                <span className={styles.gsBadge}>
                  G {score}
                  <span style={{ opacity: 0.45 }}>/ {MAX_GS}</span>
                </span>
                <span className={styles.rep}>★★★★☆</span>
              </div>
            </div>
          </div>
        </header>

        <div className={styles.body}>
          {current.id === "marketplace" && (
            <Marketplace selected={selected} onPick={pick} onGo={begin} visited={visited} />
          )}
          {current.id === "live" && <Live selected={selected} onPick={pick} onGo={begin} />}
          {current.id === "games" && (
            <Games
              selected={selected}
              onPick={pick}
              unlocked={unlocked}
              onTrickshot={() => unlock("trickshot")}
              onNoScope={triggerRrod}
            />
          )}
          {current.id === "media" && (
            <Media montage={montage} onToggle={toggleMontage} selected={selected} onPick={pick} />
          )}
          {current.id === "system" && (
            <System
              visited={visited.length}
              score={score}
              unlockedCount={unlocked.length}
              montage={montage}
              onToggle={toggleMontage}
              selected={selected}
              onPick={pick}
            />
          )}
        </div>
        <div className={styles.recent}>
          <div className={styles.recentTitle}>Recently played</div>
          <div className={styles.recentRow}>
            {recent.map((a) => (
              <button
                key={a.slug}
                type="button"
                className={styles.recentCard}
                style={{ "--cardC": a.accent } as React.CSSProperties}
                onClick={() => begin(a.slug)}
              >
                <span className={styles.recentArt} />
                <span className={styles.recentNo}>
                  {String(a.channel).padStart(2, "0")}
                </span>
                <span className={styles.recentName}>{a.name}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className={styles.hints}>
        <span>
          <span className={styles.hintKey} style={{ background: "#8fd400" }}>
            A
          </span>
          select
        </span>
        <span>click a blade edge to switch</span>
        <span>right-drag in SNIPEZ to scope</span>
      </div>

      {montage && (
        <>
          <div className={styles.dirt} />
          <div className={styles.vignette} />
        </>
      )}

      <HitLayer
        hostRef={rootRef}
        onCount={(n) => {
          if (n >= 25) unlock("hits");
        }}
      />

      {toast && (
        <div className={styles.toast}>
          <div className={`${styles.achOrb} ${styles.achOrbOn}`} />
          <div>
            <div className={styles.toastTitle}>Achievement Unlocked</div>
            <div className={styles.toastName}>{toast.name}</div>
          </div>
          <div className={styles.toastGs}>{toast.gs} G</div>
        </div>
      )}

      {rrod && (
        <div className={styles.rrod}>
          <div className={styles.ring} />
          <div className={styles.rrodText}>
            E74 — system error
            <br />
            three red lights · towel not included
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- marketplace */

function Marketplace({
  selected,
  onPick,
  onGo,
  visited,
}: {
  selected: number;
  onPick: (i: number) => void;
  onGo: (slug: string) => void;
  visited: string[];
}) {
  const a = AESTHETICS[Math.min(selected, AESTHETICS.length - 1)];
  return (
    <>
      <div className={styles.menu}>
        {AESTHETICS.map((x, i) => (
          <button
            key={x.slug}
            type="button"
            className={`${styles.item} ${i === selected ? styles.itemOn : ""}`}
            onClick={() => onPick(i)}
          >
            <span>{x.name}</span>
            <span className={styles.itemMeta}>
              {x.status === "live" ? (visited.includes(x.slug) ? "owned" : "free") : "coming soon"}
            </span>
          </button>
        ))}
      </div>
      <div className={styles.detail}>
        <div className={styles.detailTitle}>{a.name}</div>
        <div className={styles.detailSub}>
          Channel {String(a.channel).padStart(2, "0")} · {a.tags.join(" · ")}
        </div>
        <div className={styles.detailBody}>
          {a.tagline}
          <br />
          <br />
          {a.status === "live"
            ? "Full version. No trial. Downloads instantly because it is a web page."
            : "Not yet released. The developer keeps saying it is nearly done."}
        </div>
        <button
          type="button"
          className={styles.action}
          disabled={a.status !== "live"}
          style={a.status !== "live" ? { opacity: 0.4 } : undefined}
          onClick={() => a.status === "live" && onGo(a.slug)}
        >
          {a.status === "live" ? "Download — 0 MS Points" : "Unavailable"}
        </button>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------------- live */

function Live({
  selected,
  onPick,
  onGo,
}: {
  selected: number;
  onPick: (i: number) => void;
  onGo: (slug: string) => void;
}) {
  const f = FRIENDS[Math.min(selected, FRIENDS.length - 1)];
  const game = f.playing ? getAesthetic(f.playing) : undefined;
  return (
    <>
      <div className={styles.menu}>
        {FRIENDS.map((x, i) => (
          <button
            key={x.tag}
            type="button"
            className={`${styles.item} ${i === selected ? styles.itemOn : ""}`}
            onClick={() => onPick(i)}
          >
            <span>{x.tag}</span>
            <span className={styles.itemMeta}>{x.playing ? "online" : x.state}</span>
          </button>
        ))}
      </div>
      <div className={styles.detail}>
        <div className={styles.detailTitle}>{f.tag}</div>
        <div className={`${styles.detailSub} ${f.playing ? styles.online : ""}`}>
          {f.playing ? `Playing ${game?.name}` : f.state}
        </div>
        <div className={styles.detailBody}>
          {f.state}
          {f.playing
            ? ". Session is open — you can drop straight in."
            : ". Last seen a very long time ago."}
        </div>
        {f.playing && game && (
          <button type="button" className={styles.action} onClick={() => onGo(game.slug)}>
            Join Session
          </button>
        )}
      </div>
    </>
  );
}

/* --------------------------------------------------------------------- games */

function Games({
  selected,
  onPick,
  unlocked,
  onTrickshot,
  onNoScope,
}: {
  selected: number;
  onPick: (i: number) => void;
  unlocked: string[];
  onTrickshot: () => void;
  onNoScope: () => void;
}) {
  const items = ["Achievements", "SNIPEZ 360"];
  return (
    <>
      <div className={styles.menu}>
        {items.map((x, i) => (
          <button
            key={x}
            type="button"
            className={`${styles.item} ${i === selected ? styles.itemOn : ""}`}
            onClick={() => onPick(i)}
          >
            <span>{x}</span>
            <span className={styles.itemMeta}>
              {i === 0 ? `${unlocked.length}/${ACHIEVEMENTS.length}` : "arcade"}
            </span>
          </button>
        ))}
      </div>
      <div className={styles.detail}>
        {selected === 1 ? (
          <>
            <div className={styles.detailTitle}>SNIPEZ 360</div>
            <div className={styles.detailSub}>
              hold right mouse to scope · sweep a full circle then hit unscoped
            </div>
            <div style={{ marginTop: 14 }}>
              <Quickscope onTrickshot={onTrickshot} onNoScope={onNoScope} />
            </div>
          </>
        ) : (
          <>
            <div className={styles.detailTitle}>Achievements</div>
            <div className={styles.detailSub}>
              {unlocked.length} of {ACHIEVEMENTS.length} · these persist
            </div>
            <div className={styles.achList} style={{ marginTop: 14 }}>
              {ACHIEVEMENTS.map((a) => {
                const on = unlocked.includes(a.id);
                return (
                  <div
                    key={a.id}
                    className={`${styles.ach} ${on ? "" : styles.achLocked}`}
                  >
                    <div className={`${styles.achOrb} ${on ? styles.achOrbOn : ""}`} />
                    <div>
                      <div className={styles.achName}>{on ? a.name : "Locked"}</div>
                      <div className={styles.achHow}>{a.how}</div>
                    </div>
                    <div className={styles.achGs}>{a.gs} G</div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
}

/* --------------------------------------------------------------------- media */

function Media({
  montage,
  onToggle,
  selected,
  onPick,
}: {
  montage: boolean;
  onToggle: () => void;
  selected: number;
  onPick: (i: number) => void;
}) {
  const items = ["MONTAGE_FINAL_v7.wmv", "clip_003.wmv", "intro (do not delete)"];
  return (
    <>
      <div className={styles.menu}>
        {items.map((x, i) => (
          <button
            key={x}
            type="button"
            className={`${styles.item} ${i === selected ? styles.itemOn : ""}`}
            onClick={() => onPick(i)}
          >
            <span>{x}</span>
            <span className={styles.itemMeta}>{i === 0 ? "18s" : "corrupt"}</span>
          </button>
        ))}
        <button
          type="button"
          className={`${styles.action} ${montage ? "" : styles.actionGhost}`}
          style={{ marginTop: 18 }}
          onClick={onToggle}
        >
          {montage ? "Montage mode: ON" : "Montage mode: OFF"}
        </button>
      </div>
      <div className={styles.detail}>
        <div className={styles.detailTitle}>{items[Math.min(selected, 2)]}</div>
        <div className={styles.detailSub}>uploaded 2010 · 4 views · 1 like (mine)</div>
        <div style={{ marginTop: 14 }}>
          <MontagePlayer montage={montage} />
        </div>
      </div>
    </>
  );
}

/* -------------------------------------------------------------------- system */

function System({
  visited,
  score,
  unlockedCount,
  montage,
  onToggle,
  selected,
  onPick,
}: {
  visited: number;
  score: number;
  unlockedCount: number;
  montage: boolean;
  onToggle: () => void;
  selected: number;
  onPick: (i: number) => void;
}) {
  const items = ["Console Information", "Display", "Storage"];
  return (
    <>
      <div className={styles.menu}>
        {items.map((x, i) => (
          <button
            key={x}
            type="button"
            className={`${styles.item} ${i === selected ? styles.itemOn : ""}`}
            onClick={() => onPick(i)}
          >
            <span>{x}</span>
            <span className={styles.itemMeta}>{i === 2 ? "20 GB" : ""}</span>
          </button>
        ))}
      </div>
      <div className={styles.detail}>
        <div className={styles.detailTitle}>{items[Math.min(selected, 2)]}</div>
        <div className={styles.detailSub}>dashboard 2.0.1888.0</div>
        <div className={styles.detailBody}>
          Channels visited: <b>{visited}</b> of {AESTHETICS.length}
          <br />
          Achievements: <b>{unlockedCount}</b> of {ACHIEVEMENTS.length} · <b>{score} G</b>
          <br />
          Storage: 20 GB hard drive, 19.2 GB of it screenshots
          <br />
          Warranty: expired
          <br />
          Temperature: <b style={{ color: "#ff8a5b" }}>elevated</b>
        </div>
        <button
          type="button"
          className={`${styles.action} ${montage ? "" : styles.actionGhost}`}
          onClick={onToggle}
        >
          {montage ? "Disable colour grading" : "Enable colour grading"}
        </button>
      </div>
    </>
  );
}
