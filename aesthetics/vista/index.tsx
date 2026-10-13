"use client";
/* eslint-disable @next/next/no-img-element -- canvas-space photos, pre-optimised WebP */

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { useCanvas } from "@/components/CanvasStage";
import { cut, img } from "@/lib/assets";
import { chime, droplet, noiseLoop, unlock } from "@/lib/audio";
import { useMusic } from "@/lib/music";
import { sbGet, sbSet } from "@/lib/storage";
import { useShell } from "@/lib/store";
import { AquaTank, Computer, Gallery, MediaPlayer, Messenger, Personalize, Welcome, useNudge } from "./apps";
import { Bubbles, type BubblesHandle } from "./Bubbles";
import { A, CONTACTS, GALLERY, TINTS, TRACKS, WALLPAPERS, type AppId, type TintId, type WallpaperId } from "./data";
import { ClockGadget, CpuGadget, SlideshowGadget, WEATHER_ORDER, WeatherGadget, type Weather } from "./Gadgets";
import { Icon, type IconName } from "./Icons";
import { scoreFor, signInChime, startupSound, trackBpm } from "./music";
import { APP_META, StartMenu, Taskbar } from "./Shell";
import { AeroWindow, type WinState } from "./Window";
import styles from "./styles.module.css";

/**
 * Channel 01 — Frutiger Aero.
 *
 * Fiction: Windows Vista, a 2007 desktop that never shipped — Vista's glass, Windows 7's
 * superbar, a Zune in the drive bay and a green hill for a wallpaper. The whole
 * aesthetic in one working machine: eco-optimism, water, grass, sky, glass and
 * gloss, all of it clickable.
 *
 * The wallpaper is real photography and real Frutiger Aero stock art (Aesthetics
 * Wiki); the interface is rebuilt in CSS/SVG because UI chrome is geometry
 * (OPEN_QUESTIONS #15). Glass tint defaults to leaf green.
 *
 * Single viewport, no scroll.
 */

const W = 1600;
const H = 900;
const DESK_H = 852;

const DEFAULT_WINS: Record<AppId, WinState> = {
  welcome: { x: 150, y: 44, w: 520, h: 392, z: 3, min: false, max: false },
  media: { x: 700, y: 470, w: 590, h: 300, z: 4, min: false, max: false },
  messenger: { x: 1076, y: 36, w: 272, h: 404, z: 2, min: false, max: false },
  gallery: { x: 240, y: 90, w: 760, h: 500, z: 1, min: false, max: false },
  personalize: { x: 330, y: 70, w: 580, h: 470, z: 1, min: false, max: false },
  aquarium: { x: 420, y: 250, w: 520, h: 340, z: 1, min: false, max: false },
  computer: { x: 210, y: 150, w: 580, h: 340, z: 1, min: false, max: false },
};

const DESKTOP_ICONS: { id: AppId | "recycle"; label: string; icon: IconName }[] = [
  { id: "computer", label: "Computer", icon: "computer" },
  { id: "recycle", label: "Recycle Bin", icon: "recycle" },
  { id: "aquarium", label: "Aquarium", icon: "aquarium" },
  { id: "messenger", label: "Messenger", icon: "messenger" },
  { id: "media", label: "Media Player", icon: "media" },
  { id: "gallery", label: "Photos", icon: "gallery" },
  { id: "personalize", label: "Personalize", icon: "personalize" },
];

const ICON_POS = (i: number) => ({ x: 20, y: 22 + i * 100 });

const BODY: Partial<Record<AppId, "light" | "dark" | "glass">> = { media: "dark", aquarium: "dark" };

export default function Vista() {
  const { toCanvasSpace } = useCanvas();
  const muted = useShell((s) => s.muted);
  const setMuted = useShell((s) => s.setMuted);
  const begin = useShell((s) => s.beginTransition);

  // ---------------------------------------------------------------- personalisation
  const [wall, setWall] = useState<WallpaperId>("serenity");
  const [prevWall, setPrevWall] = useState<WallpaperId | null>(null);
  const [tint, setTint] = useState<TintId>("leaf");
  const [glass, setGlass] = useState(0.4);
  const [transparency, setTransparency] = useState(true);
  // Persisted settings load after mount so the server render and first client render agree.
  useEffect(() => {
    setWall(sbGet(A, "wall", "serenity"));
    setTint(sbGet(A, "tint", "leaf"));
    setGlass(sbGet(A, "glass", 0.4));
    setTransparency(sbGet(A, "transparency", true));
    setWeather(sbGet(A, "weather", "sunny"));
  }, []);
  const changeWall = (w: WallpaperId) => {
    if (w === wall) return;
    setPrevWall(wall);
    setWall(w);
    sbSet(A, "wall", w);
  };

  // ---------------------------------------------------------------- windows
  const [wins, setWins] = useState<Record<AppId, WinState>>(DEFAULT_WINS);
  const [openIds, setOpenIds] = useState<AppId[]>(["messenger", "welcome", "media"]);
  const [active, setActive] = useState<AppId | null>("media");
  const zTop = useRef(10);

  const focus = useCallback((id: AppId) => {
    zTop.current += 1;
    const z = zTop.current;
    setWins((w) => ({ ...w, [id]: { ...w[id], z, min: false } }));
    setActive(id);
  }, []);

  const launch = useCallback(
    (id: AppId) => {
      setOpenIds((o) => (o.includes(id) ? o : [...o, id]));
      focus(id);
      droplet(1.1);
    },
    [focus],
  );

  const close = (id: AppId) => {
    setOpenIds((o) => o.filter((x) => x !== id));
    setWins((w) => ({ ...w, [id]: { ...DEFAULT_WINS[id] } }));
    if (id === "media") setPlaying(false);
  };

  const onTask = (id: AppId) => {
    const w = wins[id];
    if (active === id && !w.min) setWins((all) => ({ ...all, [id]: { ...all[id], min: true } }));
    else focus(id);
  };

  // ---------------------------------------------------------------- media
  const [playing, setPlaying] = useState(false);
  const [track, setTrack] = useState(0);
  const energy = useRef(0);
  const score = useMemo(() => scoreFor(TRACKS[track].id, (e) => (energy.current = Math.max(energy.current, e))), [track]);
  useMusic(playing ? score : null, trackBpm(TRACKS[track].id), playing);
  const togglePlay = () => {
    if (!playing && muted) {
      unlock();
      setMuted(false);
    }
    setPlaying((p) => !p);
  };

  // ---------------------------------------------------------------- weather
  const [weather, setWeather] = useState<Weather>("sunny");
  const cycleWeather = () => {
    const next = WEATHER_ORDER[(WEATHER_ORDER.indexOf(weather) + 1) % WEATHER_ORDER.length];
    setWeather(next);
    sbSet(A, "weather", next);
    chime(next !== "rain");
  };
  useEffect(() => {
    if (weather !== "rain" || muted) return;
    return noiseLoop({ gain: 0.05, lowpass: 5000, highpass: 900, attack: 1.2 });
  }, [weather, muted]);
  const drops = useMemo(
    () => Array.from({ length: 46 }, (_, i) => ({ x: (i * 97) % 1600, y: (i * 53) % 820, r: 4 + ((i * 7) % 9), d: 3 + (i % 6) })),
    [],
  );

  // ---------------------------------------------------------------- overlays
  const [startOpen, setStartOpen] = useState(false);
  const [saver, setSaver] = useState(false);
  const [slideshow, setSlideshow] = useState<number | null>(null);
  const [flip, setFlip] = useState<AppId[] | null>(null);
  const [booting, setBooting] = useState(true);
  const [shutdown, setShutdown] = useState(false);
  const [toast, setToast] = useState<{ i: number; key: number } | null>(null);
  const [nudging, nudge] = useNudge();
  const bubbles = useRef<BubblesHandle>(null);
  const idle = useRef(0);

  // Boot splash, then contacts sign in one by one.
  useEffect(() => {
    const t1 = window.setTimeout(() => {
      setBooting(false);
      startupSound();
    }, 1500);
    const timers = [0, 1, 2].map((k) =>
      window.setTimeout(() => {
        setToast({ i: k === 2 ? 2 : k, key: Date.now() });
        signInChime();
      }, 3200 + k * 7000),
    );
    const clear = window.setTimeout(() => setToast(null), 3200 + 3 * 7000);
    return () => [t1, clear, ...timers].forEach((t) => window.clearTimeout(t));
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 5200);
    return () => window.clearTimeout(t);
  }, [toast]);

  // Idle → Bubbles screen saver.
  useEffect(() => {
    const id = window.setInterval(() => {
      idle.current += 1;
      if (idle.current === 50 && !slideshow) setSaver(true);
    }, 1000);
    return () => window.clearInterval(id);
  }, [slideshow]);

  // Slide show: auto-advance.
  useEffect(() => {
    if (slideshow === null) return;
    const id = window.setInterval(() => setSlideshow((s) => (s === null ? s : (s + 1) % GALLERY.length)), 4200);
    return () => window.clearInterval(id);
  }, [slideshow]);

  // Flip 3D keyboard.
  useEffect(() => {
    if (!flip) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFlip(null);
      if (e.key === "Tab" || e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        setFlip((f) => (f ? [...f.slice(1), f[0]] : f));
      }
    };
    const onWheel = (e: WheelEvent) => setFlip((f) => (f ? (e.deltaY > 0 ? [...f.slice(1), f[0]] : [f[f.length - 1], ...f.slice(0, -1)]) : f));
    window.addEventListener("keydown", onKey);
    window.addEventListener("wheel", onWheel);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wheel", onWheel);
    };
  }, [flip]);

  const startFlip = () => {
    const vis = openIds.filter((id) => !wins[id].min).sort((a, b) => wins[b].z - wins[a].z);
    if (!vis.length) return;
    setStartOpen(false);
    setFlip(vis);
    chime(true);
  };

  const flipStyleFor = (id: AppId): CSSProperties | undefined => {
    if (!flip) return undefined;
    const k = flip.indexOf(id);
    if (k < 0) return undefined;
    const w = wins[id];
    return {
      // Vista stacks recede up and to the right, the front window largest.
      left: 380 + k * 95 - w.w * 0.1,
      top: 300 - k * 62 - w.h * 0.12,
      zIndex: 7000 - k,
      transform: `perspective(1600px) rotateY(-32deg) scale(${0.78 - k * 0.04})`,
      opacity: 1 - k * 0.08,
    };
  };

  // ---------------------------------------------------------------- desktop pointer
  const [sel, setSel] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const wake = () => {
    idle.current = 0;
    if (saver) setSaver(false);
  };

  const onDeskDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    setStartOpen(false);
    const p = toCanvasSpace(e.clientX, e.clientY);
    setSel({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
    setSelected(new Set());
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onDeskMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!sel) return;
    const p = toCanvasSpace(e.clientX, e.clientY);
    const next = { ...sel, x1: p.x, y1: p.y };
    setSel(next);
    const [l, r] = [Math.min(next.x0, next.x1), Math.max(next.x0, next.x1)];
    const [t, b] = [Math.min(next.y0, next.y1), Math.max(next.y0, next.y1)];
    const hit = new Set<string>();
    DESKTOP_ICONS.forEach((ic, i) => {
      const q = ICON_POS(i);
      if (q.x + 76 > l && q.x < r && q.y + 80 > t && q.y < b) hit.add(ic.id);
    });
    setSelected(hit);
  };
  const onDeskUp = () => {
    if (!sel) return;
    if (Math.hypot(sel.x1 - sel.x0, sel.y1 - sel.y0) < 5) {
      bubbles.current?.burst(sel.x0, sel.y0);
      droplet(0.8 + Math.random() * 0.5);
    }
    setSel(null);
  };

  const onRootMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    wake();
    const p = toCanvasSpace(e.clientX, e.clientY);
    bubbles.current?.pointer(p.x, p.y);
    ptr.current = p;
  };
  const ptr = useRef({ x: 800, y: 400 });

  const openIcon = (id: AppId | "recycle") => {
    if (id === "recycle") {
      chime(false);
      bubbles.current?.burst(60, 150, 24);
      return;
    }
    launch(id);
  };

  const launchAny = (a: AppId | "flip" | "screensaver") => {
    if (a === "flip") startFlip();
    else if (a === "screensaver") {
      idle.current = -2;
      setSaver(true);
    } else launch(a);
  };

  const visit = (slug: string) => {
    setStartOpen(false);
    begin(slug);
  };

  const doShutdown = () => {
    setStartOpen(false);
    setShutdown(true);
    setPlaying(false);
    window.setTimeout(() => {
      setShutdown(false);
      setBooting(true);
      window.setTimeout(() => {
        setBooting(false);
        startupSound();
      }, 1600);
    }, 2600);
  };

  const tintRgb = TINTS.find((t) => t.id === tint)?.rgb ?? TINTS[0].rgb;
  const wp = WALLPAPERS.find((w) => w.id === wall) ?? WALLPAPERS[0];
  const pwp = prevWall ? WALLPAPERS.find((w) => w.id === prevWall) : null;

  const renderApp = (id: AppId) => {
    const s = wins[id];
    switch (id) {
      case "welcome":
        return <Welcome onLaunch={launchAny} />;
      case "media":
        return (
          <MediaPlayer
            playing={playing}
            track={track}
            energy={energy}
            onToggle={togglePlay}
            onSkip={(d) => setTrack((x) => (x + d + TRACKS.length) % TRACKS.length)}
            onPick={(i) => {
              setTrack(i);
              if (!playing) togglePlay();
            }}
          />
        );
      case "messenger":
        return <Messenger onNudge={nudge} onVisit={visit} />;
      case "gallery":
        return <Gallery onSlideshow={(i) => setSlideshow(i)} />;
      case "personalize":
        return (
          <Personalize
            wall={wall}
            tint={tint}
            glass={glass}
            transparency={transparency}
            onWall={changeWall}
            onTint={(x) => {
              setTint(x);
              sbSet(A, "tint", x);
            }}
            onGlass={(g) => {
              setGlass(g);
              sbSet(A, "glass", g);
            }}
            onTransparency={(on) => {
              setTransparency(on);
              sbSet(A, "transparency", on);
            }}
          />
        );
      case "aquarium":
        return <AquaTank w={s.max ? W - 16 : s.w - 16} h={s.max ? DESK_H - 50 : s.h - 42} />;
      case "computer":
        return <Computer onOpen={launch} />;
    }
  };

  return (
    <div
      className={`${styles.root} ${styles[weather]}`}
      style={
        {
          "--tint": tintRgb,
          "--glass": transparency ? glass : 0.92,
          "--blur": transparency ? "11px" : "0px",
        } as CSSProperties
      }
      onPointerMove={onRootMove}
      onPointerDown={wake}
      onKeyDown={wake}
    >
      {/* ---------------------------------------------------------------- wallpaper */}
      <div className={styles.wallpaper}>
        {pwp && <img key={`p-${pwp.id}`} className={styles.wallImg} src={img(A, pwp.slot, pwp.n)?.src} alt="" />}
        <img key={wp.id} className={`${styles.wallImg} ${styles.wallIn}`} src={img(A, wp.slot, wp.n)?.src} alt="" />
      </div>
      <div className={styles.sunGlow} aria-hidden />
      <div className={styles.aurora} aria-hidden style={{ backgroundImage: `url(${img(A, "fa_aurora", 1)?.src ?? ""})` }} />
      <div className={styles.rainbow} aria-hidden />
      <div className={styles.rainLayer} aria-hidden>
        {drops.map((d, i) => (
          <i key={i} style={{ left: d.x, top: d.y, width: d.r, height: d.r * 1.25, animationDuration: `${d.d}s`, animationDelay: `${-i * 0.37}s` }} />
        ))}
      </div>

      {/* butterflies (real, matted) */}
      <Butterflies ptr={ptr} />

      {/* ---------------------------------------------------------------- desktop */}
      <div className={styles.desktop} onPointerDown={onDeskDown} onPointerMove={onDeskMove} onPointerUp={onDeskUp}>
        {DESKTOP_ICONS.map((ic, i) => {
          const p = ICON_POS(i);
          return (
            <button
              key={ic.id}
              type="button"
              className={`${styles.dIcon} ${selected.has(ic.id) ? styles.dIconOn : ""}`}
              style={{ left: p.x, top: p.y }}
              onClick={() => setSelected(new Set([ic.id]))}
              onDoubleClick={() => openIcon(ic.id)}
            >
              <Icon name={ic.icon} size={48} />
              <span>{ic.label}</span>
            </button>
          );
        })}
        {sel && (
          <div
            className={styles.selRect}
            style={{
              left: Math.min(sel.x0, sel.x1),
              top: Math.min(sel.y0, sel.y1),
              width: Math.abs(sel.x1 - sel.x0),
              height: Math.abs(sel.y1 - sel.y0),
            }}
          />
        )}
      </div>

      {/* ---------------------------------------------------------------- gadgets */}
      <div className={styles.gadgets}>
        <ClockGadget />
        <WeatherGadget weather={weather} onCycle={cycleWeather} />
        <CpuGadget />
        <SlideshowGadget onOpen={() => launch("gallery")} />
      </div>

      {/* ---------------------------------------------------------------- windows */}
      {flip && <div className={styles.flipDim} onClick={() => setFlip(null)} />}
      {openIds.map((id) => (
        <AeroWindow
          key={id}
          title={APP_META[id].title}
          icon={APP_META[id].icon}
          state={wins[id]}
          active={active === id}
          body={BODY[id]}
          shaking={id === "messenger" && nudging}
          onFocus={() => !flip && focus(id)}
          onMove={(x, y) => setWins((w) => ({ ...w, [id]: { ...w[id], x, y } }))}
          onClose={() => close(id)}
          onMin={() => setWins((w) => ({ ...w, [id]: { ...w[id], min: true } }))}
          onMax={() => setWins((w) => ({ ...w, [id]: { ...w[id], max: !w[id].max } }))}
          flipStyle={flipStyleFor(id)}
          onFlipPick={() => {
            setFlip(null);
            focus(id);
          }}
        >
          {renderApp(id)}
        </AeroWindow>
      ))}

      {/* ---------------------------------------------------------------- toast */}
      {toast && (
        <button key={toast.key} type="button" className={styles.toast} onClick={() => launch("messenger")}>
          <img src={img(A, CONTACTS[toast.i].pic.slot, CONTACTS[toast.i].pic.n)?.thumb} alt="" />
          <span>
            <b>{CONTACTS[toast.i].name}</b>
            has just signed in.
          </span>
        </button>
      )}

      <Bubbles ref={bubbles} saver={saver} width={W} height={H} />

      {/* ---------------------------------------------------------------- taskbar */}
      {startOpen && (
        <StartMenu
          onLaunch={(id) => {
            setStartOpen(false);
            launch(id);
          }}
          onGame={visit}
          onShutdown={doShutdown}
          onSaver={() => {
            setStartOpen(false);
            idle.current = -2;
            setSaver(true);
          }}
          onClose={() => setStartOpen(false)}
        />
      )}
      <Taskbar
        open={openIds.map((id) => ({ id, min: wins[id].min }))}
        active={active}
        startOpen={startOpen}
        onStart={() => {
          setStartOpen((o) => !o);
          droplet(1.3);
        }}
        onTask={onTask}
        onFlip={startFlip}
        onDesktop={() => setWins((w) => Object.fromEntries(Object.entries(w).map(([k, v]) => [k, { ...v, min: true }])) as Record<AppId, WinState>)}
        onLaunch={launch}
      />

      {/* ---------------------------------------------------------------- full-screen */}
      {slideshow !== null && (
        <div className={styles.slideshow} onClick={() => setSlideshow(null)}>
          {GALLERY.map((g, i) => (
            <img key={i} src={img(A, g.slot, g.n)?.src} alt="" className={i === slideshow ? styles.ssOn : styles.ss} />
          ))}
          <div className={styles.ssBar}>
            <span>
              {slideshow + 1} / {GALLERY.length}
            </span>
            <span>click anywhere to exit slide show</span>
          </div>
        </div>
      )}
      {saver && <div className={styles.saverShade} />}
      {(booting || shutdown) && (
        <div className={styles.boot}>
          <div className={styles.bootGlow} />
          <p>{shutdown ? "Shutting down…" : "Welcome"}</p>
          <i className={styles.ring} />
        </div>
      )}
    </div>
  );
}

/** Butterflies drift in slow loops and ease out of the cursor's way. The shove is a
 *  velocity, not a position: a pointer sitting on one never makes it jump sides. */
function Butterflies({ ptr }: { ptr: RefObject<{ x: number; y: number }> }) {
  const els = useRef<(HTMLImageElement | null)[]>([]);
  useEffect(() => {
    const off = [0, 1, 2].map(() => ({ x: 0, y: 0, vx: 0, vy: 0 }));
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;
      off.forEach((o, k) => {
        const bx = 780 + Math.sin(t * (0.11 + k * 0.03) + k * 2) * (520 - k * 90);
        const by = 330 + Math.sin(t * (0.23 + k * 0.05) + k) * 180 + Math.sin(t * 1.3 + k) * 20;
        const dx = bx + o.x - ptr.current.x;
        const dy = by + o.y - ptr.current.y;
        const d = Math.hypot(dx, dy);
        if (d < 150 && d > 0.5) {
          const f = ((150 - d) / 150) * 900;
          o.vx += (dx / d) * f * dt;
          o.vy += (dy / d) * f * dt;
        }
        // a soft spring home, heavily damped
        o.vx += -o.x * 3 * dt;
        o.vy += -o.y * 3 * dt;
        const damp = Math.exp(-3.2 * dt);
        o.vx *= damp;
        o.vy *= damp;
        o.x += o.vx * dt;
        o.y += o.vy * dt;
        const el = els.current[k];
        if (!el) return;
        const flap = Math.abs(Math.sin(t * (9 + k * 2)));
        el.style.left = `${bx + o.x}px`;
        el.style.top = `${by + o.y}px`;
        el.style.transform = `scaleX(${0.35 + flap * 0.65}) rotate(${Math.sin(t * 2 + k) * 14}deg)`;
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [ptr]);
  return (
    <>
      {[0, 1, 2].map((k) => (
        <img
          key={k}
          ref={(el) => {
            els.current[k] = el;
          }}
          className={styles.butterfly}
          src={cut(A, "fa_butterfly", k)?.src ?? ""}
          alt=""
        />
      ))}
    </>
  );
}
