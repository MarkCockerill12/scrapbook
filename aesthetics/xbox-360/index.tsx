"use client";
/* eslint-disable @next/next/no-img-element -- canvas-space photos, pre-optimised WebP */

import { useMusic } from "@/lib/music";
import { dash } from "./music";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cutN, img } from "@/lib/assets";
import { AESTHETICS, getAesthetic } from "@/lib/registry";
import { sbGet, sbSet } from "@/lib/storage";
import { useShell } from "@/lib/store";
import { thumbFor } from "@/lib/thumbs";
import { ACHIEVEMENTS, MAX_GS, useAchievements } from "./achievements";
import { Boot } from "./Boot";
import { GAMERPICS, Gamerpic, Guide } from "./Guide";
import { HitLayer } from "./HitLayer";
import { ARCADE, GAMES, Library, Loading } from "./Library";
import { MontagePlayer } from "./MontagePlayer";
import { Original } from "./Original";
import { Quickscope } from "./Quickscope";
import { bladeSwoosh, blip, drop, guideOpen, redRing } from "./sound";
import x from "./extras.module.css";
import mt from "./metro.module.css";
import styles from "./styles.module.css";

/**
 * Channel 04 — Xbox 360.
 *
 * Fiction: *xX_no_scope_420_Xx's console*, some evening in late 2011.
 *
 * Fifth build (2026-10). Mark: "you keep ruining xbox 360… look at what it currently
 * looks like… incorporate original xbox ideas too. revamp it." He picked the last
 * dashboard the console ever had — the 2011 one — for its bones: hubs you move
 * between, a grid of tiles with one big one in the middle, sheets that open over it.
 * Then (sixth pass): "a better theme, more ideas from the original xbox and its
 * layout". So the skin and the layout are 2001: a black-and-acid-green room, the orb
 * with its rings behind a menu of slanted plates down the left, cut-cornered glass.
 *
 * The 2001 console is in here too, where it actually was on a 360: under Games, as
 * "Xbox Originals". That tile drops you into the first dashboard — black, acid
 * green, the orb — and its Memory screen shows your real saves in blocks.
 *
 * The achievements are real: they read the shell's genuine `visited` list, persist
 * under `sb:xbox-360:achievements`, and are the site's exploration reward.
 */

const A = "xbox-360";

const THEMES = [
  { id: "default", name: "Xbox 360 Default", cover: 0 },
  { id: "halo", name: "Halo 3 Premium Theme", cover: 1 },
  { id: "gears", name: "Gears of War", cover: 2 },
  { id: "cod", name: "Modern Warfare", cover: 3 },
  { id: "reach", name: "Halo: Reach", cover: 11 },
  { id: "portal", name: "Portal 2", cover: 16 },
];

const HUBS = ["home", "social", "games", "video", "channels", "settings"] as const;
type Hub = (typeof HUBS)[number];
type Sheet = "library" | "arcade" | "achievements" | "snipez" | "montage" | "themes" | "gamerpic" | "system" | null;

interface Friend {
  tag: string;
  playing: string | null;
  state: string;
  pic: number;
}

const FRIENDS: Friend[] = [
  { tag: "MLGxDoritos99", playing: "frutiger-aero", state: "In a lobby", pic: 1 },
  { tag: "sn1per_pete", playing: "bbs", state: "300 baud", pic: 2 },
  { tag: "GamerTag2007", playing: "vista", state: "Solitaire", pic: 3 },
  { tag: "420BlazeItGuy", playing: "deep-sea", state: "Depth 1,840m", pic: 4 },
  { tag: "HALO_M0M", playing: "neon", state: "Customising", pic: 5 },
  { tag: "n0scope_nathan", playing: "matrix", state: "Unauthorised session", pic: 0 },
  { tag: "xX_QuickScope_Xx", playing: null, state: "Away — 2h", pic: 2 },
  { tag: "TrueSkill_Andy", playing: null, state: "Offline", pic: 4 },
];

/** Hotspots on the controller photo, as % of the cutout's box. */
const hot = (l: number, t: number, d = 11): CSSProperties => ({
  left: `${l - d / 2}%`,
  top: `${t - d / 2}%`,
  width: `${d}%`,
  height: `${d * 1.1}%`,
});
const PAD = { guide: hot(54, 30, 12), a: hot(80, 42, 9), b: hot(89, 35, 9), x: hot(73, 34, 9), y: hot(82, 25, 9) };

/** One tile. `c`/`r` are grid column / row spans, 1-based "start / span". */
function Tile({
  c,
  r,
  label,
  sub,
  art,
  tone = "green",
  onClick,
  children,
  delay = 0,
}: {
  c: string;
  r: string;
  label: string;
  sub?: string;
  art?: string | null;
  tone?: "green" | "dark" | "grey" | "lime" | "white";
  onClick?: () => void;
  children?: ReactNode;
  delay?: number;
}) {
  return (
    <button type="button" className={mt.tile} data-tone={tone} style={{ gridColumn: c, gridRow: r, animationDelay: `${delay * 28}ms` }} onClick={onClick} onPointerEnter={() => blip()}>
      {art && <img className={mt.art} src={art} alt="" draggable={false} />}
      {children}
      <span className={mt.label}>
        <b>{label}</b>
        {sub && <small>{sub}</small>}
      </span>
    </button>
  );
}

export default function Xbox360() {
  const rootRef = useRef<HTMLDivElement>(null);
  const begin = useShell((s) => s.beginTransition);
  const visited = useShell((s) => s.visited);
  const { unlocked, unlock, toast, score } = useAchievements();

  const [hub, setHub] = useState(0);
  const [dir, setDir] = useState(1);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [og, setOg] = useState(false);
  const [montage, setMontage] = useState(false);
  const [rrod, setRrod] = useState(false);
  const [seen, setSeen] = useState<Set<Hub>>(() => new Set<Hub>(["home"]));
  const [booting, setBooting] = useState(true);
  const [guide, setGuide] = useState(false);
  const [loading, setLoading] = useState<(typeof GAMES)[number] | null>(null);
  const [theme, setTheme] = useState(0);
  const [gpic, setGpic] = useState(0);
  const [rumble, setRumble] = useState(0);
  const [tray, setTray] = useState(false);
  const [page, setPage] = useState(0);
  const [clock, setClock] = useState("--:--");
  useMusic(dash, 50, !booting && !montage && !rrod, 1);
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
    tick();
    const id = window.setInterval(tick, 20000);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    setTheme(sbGet(A, "theme", 0));
    setGpic(sbGet(A, "gpic", 0));
  }, []);
  const endBoot = useCallback(() => setBooting(false), []);

  const openGuide = useCallback(() => {
    setGuide(true);
    guideOpen();
  }, []);

  const go = useCallback((i: number) => {
    const next = Math.max(0, Math.min(HUBS.length - 1, i));
    setHub((h) => {
      if (next === h) return h;
      setDir(next > h ? 1 : -1);
      bladeSwoosh();
      return next;
    });
    setSheet(null);
    setSeen((s) => new Set(s).add(HUBS[next]));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Home" || e.key.toLowerCase() === "g") openGuide();
      else if (e.key === "Escape") {
        setSheet(null);
        setOg(false);
      } else if (e.key === "ArrowRight") go(hub + 1);
      else if (e.key === "ArrowLeft") go(hub - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openGuide, go, hub]);

  useEffect(() => {
    if (seen.size >= HUBS.length) unlock("blades");
  }, [seen, unlock]);

  const open = (s: Sheet) => {
    setSheet(s);
    bladeSwoosh();
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
    window.setTimeout(() => setRrod(false), 7000);
  };

  /* Most-recently-visited first, backfilled with live channels so the row is never
     half-empty on a first visit. */
  const recent = useMemo(() => {
    const seenLive = [...visited]
      .reverse()
      .map((s) => getAesthetic(s))
      .filter((a): a is NonNullable<typeof a> => !!a && a.status === "live" && a.slug !== A);
    const fill = AESTHETICS.filter((a) => a.status === "live" && a.slug !== A && !seenLive.some((s) => s.slug === a.slug));
    return [...seenLive, ...fill].slice(0, 6);
  }, [visited]);

  const live = useMemo(() => AESTHETICS.filter((a) => a.status === "live"), []);
  const PER = 10;
  const pages = Math.ceil(live.length / PER);
  const cover = (n: number) => img(A, "x360_cover", n)?.src ?? null;
  const name = HUBS[hub];
  const hero = recent[0];

  return (
    <div ref={rootRef} className={`${mt.root} ${montage ? styles.montage : ""}`}>
      {THEMES[theme].cover > 0 && <img className={mt.themeBg} src={cover(THEMES[theme].cover) ?? ""} alt="" />}
      <div className={mt.glow} />
      {/* the orb, behind the menu: the first dashboard's whole idea */}
      <div className={mt.core}>
        <i />
        <i />
        <i />
        <b />
      </div>
      <header className={mt.brand}>
        <b>XBOX</b>
        <em>360</em>
        <span>{clock}</span>
      </header>

      {/* ---- the hubs, along the top */}
      <nav className={mt.hubs} aria-label="Dashboard">
        {HUBS.map((h, i) => (
          <button key={h} type="button" data-on={i === hub || undefined} onClick={() => go(i)}>
            {h}
          </button>
        ))}
      </nav>

      <button type="button" className={mt.gamer} onClick={openGuide} aria-label="Open the guide">
        <div>
          <b>xX_no_scope_420_Xx</b>
          <span>
            <i>G</i> {score} <em>/ {MAX_GS}</em>
          </span>
        </div>
        <Gamerpic pic={gpic} size={58} />
      </button>

      {/* ---- the grid for this hub */}
      <div className={mt.grid} key={name} data-dir={dir}>
        {name === "home" && (
          <>
            <Tile c="1 / span 1" r="1 / span 1" label={tray ? "Close Tray" : "Open Tray"} tone="grey" onClick={() => { setTray((t) => !t); drop(); }}>
              <i className={mt.disc} data-out={tray || undefined} />
            </Tile>
            <Tile c="1 / span 1" r="2 / span 1" label="My Pins" sub={`${recent.length} channels`} delay={1} onClick={() => go(4)} />
            <Tile c="1 / span 1" r="3 / span 1" label="Achievements" sub={`${score} G`} tone="lime" delay={2} onClick={() => open("achievements")} />
            {hero && (
              <Tile c="2 / span 3" r="1 / span 2" label={hero.name} sub={`channel ${String(hero.channel).padStart(2, "0")} · continue`} art={thumbFor(hero.slug)} tone="dark" delay={1} onClick={() => begin(hero.slug)} />
            )}
            {recent.slice(1, 4).map((a, i) => (
              <Tile key={a.slug} c={`${2 + i} / span 1`} r="3 / span 1" label={a.name} art={thumbFor(a.slug)} tone="dark" delay={3 + i} onClick={() => begin(a.slug)} />
            ))}
            <Tile c="5 / span 1" r="1 / span 1" label="SNIPEZ 360" sub="arcade" art={cover(3)} tone="dark" delay={2} onClick={() => { go(2); open("snipez"); }} />
            <Tile c="5 / span 1" r="2 / span 1" label="Xbox Originals" sub="the 2001 dashboard" tone="white" delay={3} onClick={() => setOg(true)}>
              <i className={mt.orb} />
            </Tile>
            <Tile c="5 / span 1" r="3 / span 1" label="Montage" sub={montage ? "mode: ON" : "MONTAGE_FINAL_v7"} delay={4} onClick={() => { go(3); open("montage"); }} />
          </>
        )}

        {name === "social" && (
          <>
            <Tile c="1 / span 1" r="1 / span 2" label="Friends" sub={`${FRIENDS.filter((f) => f.playing).length} online`} tone="lime">
              <span className={mt.big}>{FRIENDS.filter((f) => f.playing).length}</span>
            </Tile>
            <Tile c="1 / span 1" r="3 / span 1" label="Party" sub="start a party" delay={1} onClick={openGuide} />
            {FRIENDS.map((f, i) => {
              const game = f.playing ? getAesthetic(f.playing) : undefined;
              return (
                <Tile
                  key={f.tag}
                  c={`${2 + (i % 4)} / span 1`}
                  r={`${1 + Math.floor(i / 4)} / span 1`}
                  label={f.tag}
                  sub={game ? `playing ${game.name}` : f.state}
                  art={game ? thumbFor(game.slug) : null}
                  tone={game ? "dark" : "grey"}
                  delay={1 + i}
                  onClick={() => game && begin(game.slug)}
                >
                  <span className={mt.pic}>
                    <Gamerpic pic={f.pic} size={46} />
                  </span>
                </Tile>
              );
            })}
            <Tile c="2 / span 2" r="3 / span 1" label="Messages" sub="1 new: “1v1 me rust quickscopes only”" delay={8} />
            <Tile c="4 / span 2" r="3 / span 1" label="Beacons & Activity" sub="nobody has set a beacon since 2012" tone="grey" delay={9} />
          </>
        )}

        {name === "games" && (
          <>
            <Tile c="1 / span 1" r="1 / span 1" label="My Games" sub={`${GAMES.length} discs`} onClick={() => open("library")} />
            <Tile c="1 / span 1" r="2 / span 1" label="Arcade" sub={`${ARCADE.length} games`} delay={1} onClick={() => open("arcade")} />
            <Tile c="1 / span 1" r="3 / span 1" label="Achievements" sub={`${unlocked.length} of ${ACHIEVEMENTS.length}`} tone="lime" delay={2} onClick={() => open("achievements")} />
            <Tile c="2 / span 3" r="1 / span 2" label="Halo 3" sub="disc in tray · play" art={cover(1)} tone="dark" delay={1} onClick={() => setLoading(GAMES[0])} />
            {[2, 3, 11].map((n, i) => (
              <Tile key={n} c={`${2 + i} / span 1`} r="3 / span 1" label={GAMES[[1, 2, 10][i]]?.title ?? "Game"} art={cover(n)} tone="dark" delay={3 + i} onClick={() => setLoading(GAMES[[1, 2, 10][i]] ?? GAMES[0])} />
            ))}
            <Tile c="5 / span 1" r="1 / span 1" label="SNIPEZ 360" sub="hold right mouse to scope" art={cover(3)} tone="dark" delay={2} onClick={() => open("snipez")} />
            <Tile c="5 / span 1" r="2 / span 2" label="Xbox Originals" sub="the first dashboard, 2001" tone="white" delay={3} onClick={() => setOg(true)}>
              <i className={mt.orb} />
            </Tile>
          </>
        )}

        {name === "video" && (
          <>
            <Tile c="1 / span 1" r="1 / span 1" label="My Video Apps" sub="1 app" tone="grey" />
            <Tile c="1 / span 1" r="2 / span 1" label={montage ? "Montage: ON" : "Montage: OFF"} sub="colour grading" tone={montage ? "lime" : "green"} delay={1} onClick={toggleMontage} />
            <Tile c="1 / span 1" r="3 / span 1" label="clip_003.wmv" sub="corrupt" tone="grey" delay={2} />
            <Tile c="2 / span 3" r="1 / span 3" label="MONTAGE_FINAL_v7.wmv" sub="uploaded 2010 · 4 views · 1 like (mine)" art={cover(3)} tone="dark" delay={1} onClick={() => open("montage")}>
              <i className={mt.play} />
            </Tile>
            <Tile c="5 / span 1" r="1 / span 2" label="intro" sub="do not delete" art={cover(11)} tone="dark" delay={2} onClick={() => open("montage")} />
            <Tile c="5 / span 1" r="3 / span 1" label="Zune" sub="sign in" tone="grey" delay={3} />
          </>
        )}

        {name === "channels" && (
          <>
            {live.slice(page * PER, page * PER + PER).map((a, i) => (
              <Tile
                key={a.slug}
                c={`${1 + (i % 5)} / span 1`}
                r={`${1 + Math.floor(i / 5)} / span 1`}
                label={a.name}
                sub={visited.includes(a.slug) ? "owned" : "free · 0 MS points"}
                art={thumbFor(a.slug)}
                tone="dark"
                delay={i}
                onClick={() => begin(a.slug)}
              />
            ))}
            <Tile c="1 / span 2" r="3 / span 1" label={`Marketplace · page ${page + 1} of ${pages}`} sub={`${live.length} channels, all free today`} tone="grey" />
            <Tile c="3 / span 1" r="3 / span 1" label="‹ previous" tone="green" onClick={() => { setPage((p) => (p + pages - 1) % pages); blip(); }} />
            <Tile c="4 / span 1" r="3 / span 1" label="next ›" tone="green" onClick={() => { setPage((p) => (p + 1) % pages); blip(); }} />
            <Tile c="5 / span 1" r="3 / span 1" label="Redeem Code" sub="25 characters" tone="lime" />
          </>
        )}

        {name === "settings" && (
          <>
            <Tile c="1 / span 1" r="1 / span 1" label="System" sub="console information" tone="grey" onClick={() => open("system")} />
            <Tile c="1 / span 1" r="2 / span 1" label="Profile" sub="gamer picture" delay={1} onClick={() => open("gamerpic")}>
              <span className={mt.pic}>
                <Gamerpic pic={gpic} size={46} />
              </span>
            </Tile>
            <Tile c="1 / span 1" r="3 / span 1" label="Turn Off" sub="red ring not included" tone="grey" delay={2} onClick={triggerRrod} />
            <Tile c="2 / span 3" r="1 / span 2" label="Themes" sub={THEMES[theme].name} art={THEMES[theme].cover ? cover(THEMES[theme].cover) : cover(1)} tone="dark" delay={1} onClick={() => open("themes")} />
            <Tile c="2 / span 1" r="3 / span 1" label="Preferences" sub="vibration: yes" delay={3} onClick={() => setRumble((r) => r + 1)} />
            <Tile c="3 / span 1" r="3 / span 1" label="Kinect" sub="no sensor found" tone="grey" delay={4} />
            <Tile c="4 / span 1" r="3 / span 1" label="Storage" sub="20 GB · 19.2 GB of screenshots" tone="grey" delay={5} onClick={() => open("system")} />
            <Tile c="5 / span 1" r="1 / span 2" label="Xbox Originals" sub="settings from 2001" tone="white" delay={2} onClick={() => setOg(true)}>
              <i className={mt.orb} />
            </Tile>
            <Tile c="5 / span 1" r="3 / span 1" label={montage ? "Grading: ON" : "Grading: OFF"} sub="display" tone={montage ? "lime" : "green"} delay={3} onClick={toggleMontage} />
          </>
        )}
      </div>

      {/* ---- whatever a tile opened */}
      {sheet && (
        <section className={mt.sheet} key={sheet}>
          <header>
            <button type="button" onClick={() => { setSheet(null); blip(); }} aria-label="Back">
              <i>B</i> back
            </button>
            <h2>
              {
                {
                  library: "my games",
                  arcade: "xbox live arcade",
                  achievements: "achievements",
                  snipez: "snipez 360",
                  montage: "montage_final_v7.wmv",
                  themes: "themes",
                  gamerpic: "gamer picture",
                  system: "console information",
                }[sheet]
              }
            </h2>
          </header>
          <div className={mt.sheetBody}>
            {(sheet === "library" || sheet === "arcade") && (
              <div style={{ height: 470 }}>
                <Library key={sheet} list={sheet === "library" ? GAMES : ARCADE} onPlay={setLoading} />
              </div>
            )}
            {sheet === "snipez" && <Quickscope onTrickshot={() => unlock("trickshot")} onNoScope={triggerRrod} />}
            {sheet === "montage" && (
              <div className={mt.cinema}>
                <MontagePlayer montage={montage} />
                <button type="button" className={mt.cta} data-on={montage || undefined} onClick={toggleMontage}>
                  {montage ? "Montage mode: ON" : "Montage mode: OFF"}
                </button>
              </div>
            )}
            {sheet === "achievements" && (
              <div className={mt.achs}>
                {ACHIEVEMENTS.map((a) => {
                  const on = unlocked.includes(a.id);
                  return (
                    <div key={a.id} data-on={on || undefined}>
                      <i>{on ? "🏆" : ""}</i>
                      <div>
                        <b>{on ? a.name : "Locked achievement"}</b>
                        <span>{a.how}</span>
                      </div>
                      <em>{a.gs} G</em>
                    </div>
                  );
                })}
              </div>
            )}
            {sheet === "themes" && (
              <div className={mt.pickGrid}>
                {THEMES.map((t, i) => (
                  <button key={t.id} type="button" data-on={i === theme || undefined} onClick={() => { setTheme(i); sbSet(A, "theme", i); blip(); }}>
                    {t.cover > 0 && <img src={cover(t.cover) ?? ""} alt="" />}
                    <span>{t.name}</span>
                  </button>
                ))}
              </div>
            )}
            {sheet === "gamerpic" && (
              <div className={x.picks}>
                {GAMERPICS.map((_, i) => (
                  <button key={i} type="button" className={i === gpic ? x.pickOn : ""} onClick={() => { setGpic(i); sbSet(A, "gpic", i); blip(); }}>
                    <Gamerpic pic={i} size={96} />
                  </button>
                ))}
              </div>
            )}
            {sheet === "system" && (
              <dl className={mt.info}>
                <dt>Dashboard</dt>
                <dd>2.0.14699.0</dd>
                <dt>Channels visited</dt>
                <dd>
                  {visited.length} of {AESTHETICS.length}
                </dd>
                <dt>Achievements</dt>
                <dd>
                  {unlocked.length} of {ACHIEVEMENTS.length} · {score} G
                </dd>
                <dt>Storage</dt>
                <dd>20 GB hard drive, 19.2 GB of screenshots</dd>
                <dt>Warranty</dt>
                <dd>expired</dd>
                <dt>Temperature</dt>
                <dd style={{ color: "#ff8a5b" }}>elevated</dd>
                <dt>Red ring of death status</dt>
                <dd style={{ color: "#ff5a4a" }}>yeah it&apos;ll happen eventually</dd>
              </dl>
            )}
          </div>
        </section>
      )}

      <footer className={mt.legend}>
        <span>
          <i data-k="a">A</i> select
        </span>
        <span>
          <i data-k="b">B</i> back
        </span>
        <span>
          <i data-k="lb">◂ ▸</i> change hub
        </span>
        <span>
          <i data-k="g">✕</i> guide (G)
        </span>
      </footer>

      {montage && (
        <>
          <div className={styles.dirt} />
          <div className={styles.vignette} />
        </>
      )}

      {/* your controller, on the floor in front of the telly — its buttons work */}
      <div className={`${x.pad} ${rumble ? x.rumble : ""}`} key={rumble}>
        <img src={cutN(A, "x360_hw", 1)?.src ?? ""} alt="Xbox 360 controller" />
        <button type="button" className={x.padBtn} style={PAD.guide} onClick={openGuide} aria-label="Guide button" />
        <button type="button" className={x.padBtn} style={PAD.a} onClick={() => go(hub + 1)} aria-label="A" />
        <button type="button" className={x.padBtn} style={PAD.b} onClick={() => (sheet ? setSheet(null) : go(hub - 1))} aria-label="B" />
        <button type="button" className={x.padBtn} style={PAD.y} onClick={() => open("achievements")} aria-label="Y" />
        <button type="button" className={x.padBtn} style={PAD.x} onClick={toggleMontage} aria-label="X" />
      </div>

      <HitLayer
        hostRef={rootRef}
        onCount={(n) => {
          if (n >= 25) unlock("hits");
          if (n % 5 === 0) setRumble((r) => r + 1);
        }}
      />

      {toast && (
        <div className={mt.toast}>
          <i />
          <div>
            <small>Achievement unlocked</small>
            <b>
              {toast.gs} G — {toast.name}
            </b>
          </div>
        </div>
      )}

      {rrod && (
        <div className={x.rrodPhoto}>
          <img src={img(A, "x360_hw", 10)?.src ?? ""} alt="Red Ring of Death" />
          <p>
            E74 — general hardware failure
            <br />
            three red lights · towel trick not recommended
          </p>
        </div>
      )}

      {og && <Original onClose={() => setOg(false)} unlocked={unlocked.length} visited={visited.length} score={score} />}
      {guide && <Guide onClose={() => setGuide(false)} onBlade={(i) => go([4, 1, 2, 3, 5][i] ?? 0)} score={score} pic={gpic} />}
      {loading && <Loading game={loading} onDone={() => setLoading(null)} />}
      {booting && <Boot onDone={endBoot} />}
    </div>
  );
}
