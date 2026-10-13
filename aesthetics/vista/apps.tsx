"use client";
/* eslint-disable @next/next/no-img-element -- canvas-space photos, pre-optimised WebP */

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { cut, img } from "@/lib/assets";
import { chime, droplet, pop, tick } from "@/lib/audio";
import {
  A,
  CONTACTS,
  GALLERY,
  TINTS,
  TRACKS,
  WALLPAPERS,
  type AppId,
  type TintId,
  type WallpaperId,
} from "./data";
import { Icon, type IconName } from "./Icons";
import { nudgeSound } from "./music";
import styles from "./apps.module.css";

const src = (slot: string, n: number) => img(A, slot, n)?.src ?? "";

/* ------------------------------------------------------------------ Welcome Center */

const WELCOME_TILES: { app: AppId | "flip" | "screensaver"; icon: IconName; label: string; sub: string }[] = [
  { app: "personalize", icon: "personalize", label: "Personalization", sub: "Wallpaper, glass colour" },
  { app: "gallery", icon: "gallery", label: "Photo Gallery", sub: "Your pictures, beautifully" },
  { app: "messenger", icon: "messenger", label: "Windows Live Messenger", sub: "5 contacts online" },
  { app: "media", icon: "media", label: "Media Player", sub: "Four tracks, all water" },
  { app: "aquarium", icon: "aquarium", label: "Aquarium", sub: "Feed the fish" },
  { app: "computer", icon: "computer", label: "Computer", sub: "Drives and devices" },
  { app: "flip", icon: "flip", label: "Flip 3D", sub: "See every window at once" },
  { app: "screensaver", icon: "internet", label: "Bubbles", sub: "Screen saver preview" },
];

export function Welcome({ onLaunch }: { onLaunch: (a: AppId | "flip" | "screensaver") => void }) {
  const user = cut(A, "fa_butterfly", 0)?.src ?? src("fa_dew", 2);
  return (
    <div className={styles.welcome}>
      <header className={styles.wHead}>
        <div className={styles.wPic}>
          <img src={user} alt="" />
        </div>
        <div>
          <h2>Welcome to Windows Vista</h2>
          <dl className={styles.wSpecs}>
            <dt>Edition</dt>
            <dd>Windows Vista Ultimate · Service Pack 2</dd>
            <dt>Processor</dt>
            <dd>Intel Core 2 Duo 2.40GHz</dd>
            <dt>Memory</dt>
            <dd>2.00 GB · Eco Mode on</dd>
            <dt>Experience</dt>
            <dd>
              <span className={styles.wei}>5.9</span> Clean, green, and glossy
            </dd>
          </dl>
        </div>
      </header>
      <p className={styles.wGet}>Get started with Windows Vista</p>
      <div className={styles.wTiles}>
        {WELCOME_TILES.map((t) => (
          <button key={t.label} type="button" className={styles.wTile} onClick={() => onLaunch(t.app)}>
            <Icon name={t.icon} size={36} />
            <span>
              <b>{t.label}</b>
              <small>{t.sub}</small>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Media Player */

export function MediaPlayer({
  playing,
  track,
  energy,
  onToggle,
  onSkip,
  onPick,
}: {
  playing: boolean;
  track: number;
  energy: MutableRefObject<number>;
  onToggle: () => void;
  onSkip: (d: number) => void;
  onPick: (i: number) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [elapsed, setElapsed] = useState(0);
  const t = TRACKS[track];

  useEffect(() => setElapsed(0), [track]);
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setElapsed((e) => (e + 1) % t.len), 1000);
    return () => window.clearInterval(id);
  }, [playing, t.len]);

  // Visualiser: mirrored bars over a reflection floor, driven by the score's energy.
  useEffect(() => {
    const c = canvas.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const N = 36;
    const bars: number[] = Array.from({ length: N }, () => 0);
    let raf = 0;
    let t0 = performance.now();
    const draw = (now: number) => {
      const dt = (now - t0) / 1000;
      t0 = now;
      const e = playing ? energy.current : 0.05;
      energy.current *= 0.93;
      ctx.clearRect(0, 0, c.width, c.height);
      const floor = c.height * 0.68;
      const bw = c.width / N;
      for (let i = 0; i < N; i++) {
        const shape = Math.sin(i * 0.35 + now / 600) * 0.3 + 0.7;
        const target = playing ? (e * shape * (0.4 + Math.random() * 0.6)) : 0.03;
        bars[i] += (target - bars[i]) * Math.min(1, dt * 14);
        const h = bars[i] * floor * 0.95;
        const x = i * bw + 1.5;
        const g = ctx.createLinearGradient(0, floor - h, 0, floor);
        g.addColorStop(0, "#d9ffb0");
        g.addColorStop(0.5, "#46d06a");
        g.addColorStop(1, "#0f8fb0");
        ctx.fillStyle = g;
        ctx.fillRect(x, floor - h, bw - 3, h);
        ctx.fillStyle = "rgba(255,255,255,.55)";
        ctx.fillRect(x, floor - h, bw - 3, 2);
        // reflection
        const r = ctx.createLinearGradient(0, floor, 0, floor + h * 0.5);
        r.addColorStop(0, "rgba(70,208,160,.35)");
        r.addColorStop(1, "rgba(70,208,160,0)");
        ctx.fillStyle = r;
        ctx.fillRect(x, floor + 2, bw - 3, h * 0.5);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [playing, energy]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className={styles.media}>
      <div className={styles.mTop}>
        <div className={styles.mArt}>
          <img src={src(t.art.slot, t.art.n)} alt="" />
          <div className={styles.mArtGloss} />
        </div>
        <div className={styles.mVis}>
          <canvas ref={canvas} width={330} height={150} />
          <div className={styles.mNow}>
            <b>{t.title}</b>
            <span>{t.artist}</span>
          </div>
        </div>
        <ol className={styles.mList}>
          {TRACKS.map((x, i) => (
            <li key={x.id}>
              <button type="button" className={i === track ? styles.mOn : ""} onClick={() => onPick(i)}>
                <span>{x.title}</span>
                <em>{fmt(x.len)}</em>
              </button>
            </li>
          ))}
        </ol>
      </div>
      <div className={styles.mSeek}>
        <span>{fmt(elapsed)}</span>
        <div className={styles.mBar}>
          <i style={{ width: `${(elapsed / t.len) * 100}%` }} />
        </div>
        <span>{fmt(t.len)}</span>
      </div>
      <div className={styles.mControls}>
        <button type="button" className={styles.mSmall} onClick={() => onSkip(-1)} aria-label="Previous">
          ◀◀
        </button>
        <button type="button" className={styles.mPlay} onClick={onToggle} aria-label={playing ? "Pause" : "Play"}>
          {playing ? "❚❚" : "▶"}
        </button>
        <button type="button" className={styles.mSmall} onClick={() => onSkip(1)} aria-label="Next">
          ▶▶
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Messenger */

interface Msg {
  from: "me" | "them";
  text: string;
}

export function Messenger({
  onNudge,
  onVisit,
}: {
  onNudge: () => void;
  onVisit: (slug: string) => void;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const [log, setLog] = useState<Record<number, Msg[]>>({});
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const replyAt = useRef<Record<number, number>>({});
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: 99999 });
  }, [log, typing, open]);

  const openChat = (i: number) => {
    setOpen(i);
    tick();
    if (!log[i]) {
      setLog((l) => ({ ...l, [i]: [{ from: "them", text: CONTACTS[i].lines[0] }] }));
      replyAt.current[i] = 1;
    }
  };

  const send = () => {
    if (open === null || !draft.trim()) return;
    const i = open;
    setLog((l) => ({ ...l, [i]: [...(l[i] ?? []), { from: "me", text: draft.trim() }] }));
    setDraft("");
    droplet(1.2);
    const c = CONTACTS[i];
    if (c.status === "offline") return;
    setTyping(true);
    window.setTimeout(() => {
      const n = replyAt.current[i] ?? 1;
      replyAt.current[i] = n + 1;
      setTyping(false);
      setLog((l) => ({ ...l, [i]: [...(l[i] ?? []), { from: "them", text: c.lines[n % c.lines.length] }] }));
      chime(true);
    }, 1100 + Math.random() * 900);
  };

  const me = (
    <div className={styles.msMe}>
      <div className={styles.msPic}>
        <img src={src("fa_dew", 1)} alt="" />
      </div>
      <div>
        <b>You</b> <span className={styles.msAvail}>(Available)</span>
        <p>♫ living in the future, it&apos;s so green here</p>
      </div>
    </div>
  );

  if (open !== null) {
    const c = CONTACTS[open];
    return (
      <div className={styles.messenger}>
        <div className={styles.msChatHead}>
          <button type="button" className={styles.msBack} onClick={() => setOpen(null)}>
            ‹ Contacts
          </button>
          <div className={`${styles.msPic} ${styles[c.status]}`}>
            <img src={src(c.pic.slot, c.pic.n)} alt="" />
          </div>
          <div className={styles.msWho}>
            <b>{c.name}</b>
            <span>{c.psm}</span>
          </div>
        </div>
        <div className={styles.msLog} ref={scroller}>
          {(log[open] ?? []).map((m, k) => (
            <p key={k} className={m.from === "me" ? styles.msMine : styles.msTheirs}>
              <b>{m.from === "me" ? "You say:" : `${c.name.split(" ")[0]} says:`}</b>
              {m.text}
            </p>
          ))}
          {typing && <p className={styles.msTyping}>{c.name.split(" ")[0]} is typing a message…</p>}
        </div>
        <div className={styles.msTools}>
          <button type="button" onClick={onNudge}>
            📳 Nudge
          </button>
          <button type="button" onClick={() => onVisit(c.slug)}>
            ➜ Visit their page
          </button>
        </div>
        <form
          className={styles.msInput}
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type a message…" />
          <button type="submit">Send</button>
        </form>
      </div>
    );
  }

  const groups = [
    { label: "Online", list: CONTACTS.map((c, i) => ({ c, i })).filter(({ c }) => c.status !== "offline") },
    { label: "Offline", list: CONTACTS.map((c, i) => ({ c, i })).filter(({ c }) => c.status === "offline") },
  ];

  return (
    <div className={styles.messenger}>
      {me}
      <div className={styles.msSearch}>Find a contact or number…</div>
      <div className={styles.msList}>
        {groups.map((g) => (
          <div key={g.label}>
            <p className={styles.msGroup}>
              ▾ {g.label} ({g.list.length})
            </p>
            {g.list.map(({ c, i }) => (
              <button key={c.name} type="button" className={styles.msContact} onDoubleClick={() => openChat(i)} onClick={() => openChat(i)}>
                <span className={`${styles.msDot} ${styles[c.status]}`} />
                <b>{c.name}</b>
                <em>{c.psm}</em>
              </button>
            ))}
          </div>
        ))}
      </div>
      <div className={styles.msAd}>
        <img src={src("fa_ref", 23)} alt="" />
      </div>
    </div>
  );
}

export function useNudge(): [boolean, () => void] {
  const [on, setOn] = useState(false);
  const fire = () => {
    setOn(false);
    requestAnimationFrame(() => setOn(true));
    nudgeSound();
    window.setTimeout(() => setOn(false), 560);
  };
  return [on, fire];
}

/* ------------------------------------------------------------------ Photo Gallery */

export function Gallery({ onSlideshow }: { onSlideshow: (start: number) => void }) {
  const [sel, setSel] = useState(0);
  const [spin, setSpin] = useState(0);
  const g = GALLERY[sel];
  return (
    <div className={styles.gallery}>
      <aside className={styles.gSide}>
        <p>▾ All Pictures and Videos</p>
        <p className={styles.gOn}>&nbsp;&nbsp;Pictures</p>
        <p>&nbsp;&nbsp;Videos</p>
        <p>▾ Recently Imported</p>
        <p>▾ Tags</p>
        <p>&nbsp;&nbsp;🏷 nature</p>
        <p>&nbsp;&nbsp;🏷 water</p>
        <p>&nbsp;&nbsp;🏷 future</p>
        <p>▾ Date Taken</p>
        <p>&nbsp;&nbsp;2006 · 2007 · 2008</p>
      </aside>
      <div className={styles.gMain}>
        <div className={styles.gView}>
          <img src={src(g.slot, g.n)} alt="" style={{ transform: `rotate(${spin}deg)` }} />
        </div>
        <div className={styles.gStrip}>
          {GALLERY.map((p, i) => (
            <button key={i} type="button" className={i === sel ? styles.gThumbOn : styles.gThumb} onClick={() => { setSel(i); setSpin(0); tick(); }}>
              <img src={img(A, p.slot, p.n)?.thumb ?? ""} alt="" />
            </button>
          ))}
        </div>
        <div className={styles.gBar}>
          <button type="button" onClick={() => setSel((s) => (s + GALLERY.length - 1) % GALLERY.length)}>◀</button>
          <button type="button" className={styles.gShow} onClick={() => onSlideshow(sel)}>▶ Slide Show</button>
          <button type="button" onClick={() => setSel((s) => (s + 1) % GALLERY.length)}>▶</button>
          <button type="button" onClick={() => setSpin((r) => r - 90)}>⟲</button>
          <button type="button" onClick={() => setSpin((r) => r + 90)}>⟳</button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Personalize */

export function Personalize({
  wall,
  tint,
  glass,
  transparency,
  onWall,
  onTint,
  onGlass,
  onTransparency,
}: {
  wall: WallpaperId;
  tint: TintId;
  glass: number;
  transparency: boolean;
  onWall: (w: WallpaperId) => void;
  onTint: (t: TintId) => void;
  onGlass: (g: number) => void;
  onTransparency: (on: boolean) => void;
}) {
  return (
    <div className={styles.personalize}>
      <h3>Change the visuals on your computer</h3>
      <p className={styles.pSub}>Click a picture to make it your desktop background.</p>
      <div className={styles.pWalls}>
        {WALLPAPERS.map((w) => (
          <button key={w.id} type="button" className={w.id === wall ? styles.pWallOn : styles.pWall} onClick={() => { onWall(w.id); chime(); }}>
            <img src={img(A, w.slot, w.n)?.thumb ?? ""} alt="" />
            <span>{w.name}</span>
          </button>
        ))}
      </div>
      <h4>Window Color and Appearance</h4>
      <div className={styles.pTints}>
        {TINTS.map((t) => (
          <button
            key={t.id}
            type="button"
            title={t.name}
            className={t.id === tint ? styles.pTintOn : styles.pTint}
            style={{ ["--sw" as string]: t.rgb }}
            onClick={() => { onTint(t.id); droplet(1.1); }}
          />
        ))}
      </div>
      <div className={styles.pRow}>
        <label>
          <input type="checkbox" checked={transparency} onChange={(e) => onTransparency(e.target.checked)} /> Enable transparency
        </label>
        <label className={styles.pSlider}>
          Color intensity
          <input type="range" min={0.1} max={0.85} step={0.01} value={glass} onChange={(e) => onGlass(Number(e.target.value))} />
        </label>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ AquaTank */

interface Swimmer {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  cut: number;
  flip: boolean;
}

export function AquaTank({ w, h }: { w: number; h: number }) {
  const [fish, setFish] = useState<Swimmer[]>(() =>
    [0, 1, 2, 3, 0, 2].map((c, i) => ({
      x: 40 + i * 60,
      y: 40 + (i % 3) * 60,
      vx: (i % 2 ? 1 : -1) * (0.4 + (i % 3) * 0.2),
      vy: 0,
      size: 70 + (i % 3) * 22,
      cut: c,
      flip: i % 2 === 0,
    })),
  );
  const [food, setFood] = useState<{ x: number; y: number; id: number }[]>([]);
  const foodRef = useRef(food);
  foodRef.current = food;
  const [bubbles] = useState(() => Array.from({ length: 14 }, (_, i) => ({ x: (i * 37) % 100, d: 4 + (i % 5), s: 3 + (i % 4) * 2 })));

  useEffect(() => {
    let raf = 0;
    const step = () => {
      setFish((all) =>
        all.map((f) => {
          let { x, y, vx, vy } = f;
          const target = foodRef.current[0];
          if (target) {
            const dx = target.x - (x + f.size / 2);
            const dy = target.y - (y + f.size / 4);
            const d = Math.hypot(dx, dy) || 1;
            vx += (dx / d) * 0.08;
            vy += (dy / d) * 0.08;
          } else {
            vy += (Math.random() - 0.5) * 0.03;
            vy *= 0.97;
          }
          const sp = Math.hypot(vx, vy);
          const max = target ? 2.2 : 0.9;
          if (sp > max) {
            vx = (vx / sp) * max;
            vy = (vy / sp) * max;
          }
          if (!target && Math.abs(vx) < 0.3) vx = vx < 0 ? -0.4 : 0.4;
          x += vx;
          y += vy;
          if (x < -10) vx = Math.abs(vx);
          if (x > w - f.size + 10) vx = -Math.abs(vx);
          if (y < 10) vy = Math.abs(vy);
          if (y > h - f.size * 0.6 - 20) vy = -Math.abs(vy);
          return { ...f, x, y, vx, vy, flip: vx > 0 };
        }),
      );
      setFood((fd) => {
        if (!fd.length) return fd;
        const next = fd.map((p) => ({ ...p, y: Math.min(p.y + 0.5, h - 20) }));
        return next;
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [w, h]);

  // A fish that reaches the first flake eats it.
  useEffect(() => {
    const t = food[0];
    if (!t) return;
    for (const f of fish) {
      if (Math.hypot(t.x - (f.x + f.size / 2), t.y - (f.y + f.size / 4)) < f.size * 0.35) {
        setFood((fd) => fd.slice(1));
        pop(1.4);
        break;
      }
    }
  }, [fish, food]);

  return (
    <div
      className={styles.tank}
      onPointerDown={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const sx = w / r.width;
        const x = (e.clientX - r.left) * sx;
        setFood((fd) => [...fd, ...[0, 1, 2].map((k) => ({ x: x + (k - 1) * 10, y: 6 + k * 4, id: Math.random() }))]);
        droplet(0.8);
      }}
    >
      <img className={styles.tankBg} src={src("fa_ref", 19)} alt="" />
      <div className={styles.tankCaustic} />
      {bubbles.map((b, i) => (
        <i key={i} className={styles.tankBubble} style={{ left: `${b.x}%`, width: b.s, height: b.s, animationDuration: `${b.d}s`, animationDelay: `${-i * 0.7}s` }} />
      ))}
      {food.map((p) => (
        <i key={p.id} className={styles.flake} style={{ left: p.x, top: p.y }} />
      ))}
      {fish.map((f, i) => (
        <img
          key={i}
          className={styles.tankFish}
          src={cut(A, "fa_fish", f.cut)?.src ?? ""}
          alt=""
          style={{ left: f.x, top: f.y, width: f.size, transform: `scaleX(${f.flip ? -1 : 1})` }}
        />
      ))}
      <p className={styles.tankHint}>click to sprinkle food</p>
    </div>
  );
}

/* ------------------------------------------------------------------ Computer */

export function Computer({ onOpen }: { onOpen: (a: AppId) => void }) {
  const drives = [
    { name: "Local Disk (C:)", used: 0.46, free: "86.2 GB free of 160 GB", icon: "computer" as IconName },
    { name: "Eco Backup (D:)", used: 0.12, free: "211 GB free of 240 GB", icon: "folder" as IconName },
  ];
  return (
    <div className={styles.computer}>
      <aside className={styles.cNav}>
        <p className={styles.cHead}>Favorite Links</p>
        <button type="button" onClick={() => onOpen("gallery")}>🖼 Pictures</button>
        <button type="button" onClick={() => onOpen("media")}>♫ Music</button>
        <button type="button" onClick={() => onOpen("personalize")}>🎨 Personalize</button>
        <button type="button" onClick={() => onOpen("aquarium")}>🐠 Aquarium</button>
      </aside>
      <div className={styles.cMain}>
        <p className={styles.cHead}>Hard Disk Drives (2)</p>
        {drives.map((d) => (
          <div key={d.name} className={styles.cDrive}>
            <Icon name={d.icon} size={40} />
            <div>
              <b>{d.name}</b>
              <div className={styles.cBar}>
                <i style={{ width: `${d.used * 100}%` }} />
              </div>
              <small>{d.free}</small>
            </div>
          </div>
        ))}
        <p className={styles.cHead}>Devices with Removable Storage (2)</p>
        <div className={styles.cDrive}>
          <Icon name="music" size={40} />
          <div>
            <b>Zune (E:)</b>
            <small>Syncing… 12 songs remaining</small>
          </div>
        </div>
        <div className={styles.cDrive}>
          <Icon name="internet" size={40} />
          <div>
            <b>DVD RW Drive (F:)</b>
            <small>Planet Earth — Disc 1</small>
          </div>
        </div>
      </div>
    </div>
  );
}
