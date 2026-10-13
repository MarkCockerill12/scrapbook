"use client";

import { useEffect, useRef, useState } from "react";
import { img, src } from "@/lib/assets";
import { AESTHETICS } from "@/lib/registry";
import { thumbFor } from "@/lib/thumbs";
import { touch } from "./sound";
import s from "./screens.module.css";

const A = "nintendo-3ds";

export type App = "home" | "swapnote" | "camera" | "streetpass" | "activity" | "eshop";

export const APPS: { id: Exclude<App, "home">; name: string; tint: string; icon: { slot: string; n: number } | null; glyph: string }[] = [
  { id: "swapnote", name: "Swapnote", tint: "#f2c53d", icon: null, glyph: "✎" },
  { id: "camera", name: "Nintendo 3DS Camera", tint: "#9aa6b2", icon: null, glyph: "◉" },
  { id: "streetpass", name: "StreetPass Mii Plaza", tint: "#6fd24a", icon: { slot: "n3ds_icon", n: 1 }, glyph: "" },
  { id: "activity", name: "Activity Log", tint: "#4ab0f0", icon: null, glyph: "👣" },
  { id: "eshop", name: "Nintendo eShop", tint: "#ff8a1f", icon: null, glyph: "🛒" },
];

/** The HOME menu's dotted wallpaper and the game-card slot. */
export function HomeTop({ sel, depth }: { sel: number; depth: number }) {
  const app = APPS[sel];
  return (
    <div className={s.homeTop}>
      <div className={s.dots} style={{ transform: `translateX(${-depth * 6}px)` }} />
      <div className={s.banner} style={{ transform: `translateX(${depth * 10}px)`, background: `linear-gradient(180deg, #fff, ${app.tint})` }}>
        {app.icon ? <img src={img(A, app.icon.slot, app.icon.n)?.src ?? ""} alt="" /> : <span className={s.bannerGlyph}>{app.glyph}</span>}
        <b>{app.name}</b>
      </div>
      <div className={s.topBar}>
        <span>▮▮▮▮</span>
        {/* the clock is read when it is drawn, so the server and the browser disagree by design */}
        <span suppressHydrationWarning>{new Date().getHours().toString().padStart(2, "0")}:{new Date().getMinutes().toString().padStart(2, "0")}</span>
        <span>🔋</span>
      </div>
    </div>
  );
}

export function HomeBottom({ sel, onSel, onOpen, coins }: { sel: number; onSel: (i: number) => void; onOpen: (a: App) => void; coins: number }) {
  return (
    <div className={s.homeBottom}>
      <div className={s.hbBar}>
        <span>✎ Notes</span>
        <span>🪙 {coins}</span>
        <span>⚙</span>
      </div>
      <div className={s.grid}>
        {APPS.map((a, i) => (
          <button
            key={a.id}
            type="button"
            className={`${s.icon} ${i === sel ? s.iconOn : ""}`}
            style={{ background: `linear-gradient(180deg, #fff 0%, ${a.tint} 110%)` }}
            onClick={() => (i === sel ? onOpen(a.id) : (onSel(i), touch()))}
            title={a.name}
          >
            {a.icon ? <img src={img(A, a.icon.slot, a.icon.n)?.src ?? ""} alt="" /> : <span>{a.glyph}</span>}
          </button>
        ))}
        <button type="button" className={s.icon} style={{ background: "#e8e8e8" }} onClick={() => onOpen("eshop")} title="Mario Kart 7">
          <img src={img(A, "n3ds_icon", 2)?.src ?? ""} alt="" className={s.cart} />
        </button>
      </div>
      <p className={s.open}>tap again to open ▸ {APPS[sel].name}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ Swapnote */

const INK = ["#1d2430", "#e33b4e", "#2a6ff0", "#2fb35a"];

export function SwapnoteBottom({ onStrokes }: { onStrokes: (d: number[][]) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [ink, setInk] = useState(0);
  const strokes = useRef<number[][]>([]);
  const cur = useRef<number[] | null>(null);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * 300, ((e.clientY - r.top) / r.height) * 190];
  };
  const draw = () => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, 300, 190);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.5;
    for (const st of strokes.current) {
      ctx.strokeStyle = INK[st[0]];
      ctx.beginPath();
      for (let i = 1; i < st.length; i += 2) (i === 1 ? ctx.moveTo : ctx.lineTo).call(ctx, st[i], st[i + 1]);
      ctx.stroke();
    }
  };
  return (
    <div className={s.swapB}>
      <canvas
        ref={ref}
        width={300}
        height={190}
        className={s.paper}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          cur.current = [ink, ...pos(e)];
          strokes.current.push(cur.current);
          touch();
        }}
        onPointerMove={(e) => {
          if (!cur.current) return;
          cur.current.push(...pos(e));
          draw();
        }}
        onPointerUp={() => {
          cur.current = null;
          onStrokes(strokes.current.map((x) => [...x]));
        }}
      />
      <div className={s.swapTools}>
        {INK.map((c, i) => (
          <button key={c} type="button" style={{ background: c }} className={i === ink ? s.inkOn : ""} onClick={() => setInk(i)} />
        ))}
        <button
          type="button"
          className={s.clear}
          onClick={() => {
            strokes.current = [];
            draw();
            onStrokes([]);
          }}
        >
          clear
        </button>
      </div>
    </div>
  );
}

export function SwapnoteTop({ strokes }: { strokes: number[][] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, 300, 190);
    ctx.lineCap = "round";
    ctx.lineWidth = 2.5;
    for (const st of strokes) {
      ctx.strokeStyle = INK[st[0]];
      ctx.beginPath();
      for (let i = 1; i < st.length; i += 2) (i === 1 ? ctx.moveTo : ctx.lineTo).call(ctx, st[i], st[i + 1]);
      ctx.stroke();
    }
  }, [strokes]);
  return (
    <div className={s.swapTop}>
      <div className={s.letterHead}>To: everyone at the station 🌙</div>
      <canvas ref={ref} width={300} height={190} className={s.paperBig} />
    </div>
  );
}

/* ------------------------------------------------------------------ Camera */

export const LENSES = ["normal", "sepia", "mystery", "pinhole"] as const;
export type Lens = (typeof LENSES)[number];
export const LENS_FILTER: Record<Lens, string> = {
  normal: "none",
  sepia: "sepia(1) contrast(1.1)",
  mystery: "hue-rotate(160deg) saturate(2) contrast(1.2)",
  pinhole: "contrast(1.3) saturate(1.3)",
};

export function CameraTop({ view, lens, depth, flash }: { view: number; lens: Lens; depth: number; flash: boolean }) {
  const bg = src(A, "n3ds_street", view);
  return (
    <div className={s.camTop}>
      {/* two exposures, offset by the 3D slider — the stereo pair, seen without glasses */}
      <div className={s.camView} style={{ backgroundImage: `url(${bg})`, filter: LENS_FILTER[lens] }} />
      {depth > 0.05 && <div className={s.camGhost} style={{ backgroundImage: `url(${bg})`, transform: `translateX(${depth * 10}px)`, filter: LENS_FILTER[lens] }} />}
      {lens === "pinhole" && <div className={s.pinhole} />}
      <div className={s.reticle} />
      <span className={s.camHud}>
        {lens.toUpperCase()} · 3D {Math.round(depth * 100)}% · L/R to shoot
      </span>
      {flash && <div className={s.flash} />}
    </div>
  );
}

export function CameraBottom({ lens, onLens, onShoot, onView }: { lens: Lens; onLens: (l: Lens) => void; onShoot: () => void; onView: () => void }) {
  return (
    <div className={s.camBottom}>
      <button type="button" className={s.shoot} onClick={onShoot}>
        ◉
      </button>
      <div className={s.lenses}>
        {LENSES.map((l) => (
          <button key={l} type="button" className={l === lens ? s.lensOn : ""} onClick={() => onLens(l)}>
            {l}
          </button>
        ))}
      </div>
      <button type="button" className={s.turn} onClick={onView}>
        ⟳ look somewhere else
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ StreetPass */

export function StreetPassTop({ visited }: { visited: string[] }) {
  return (
    <div className={s.spTop}>
      <img className={s.miis} src={img(A, "n3ds_mii", 1)?.src ?? ""} alt="Miis" />
      <div className={s.gate}>
        <b>{visited.length}</b> StreetPass hits
      </div>
    </div>
  );
}

export function StreetPassBottom({ visited, onGo }: { visited: string[]; onGo: (slug: string) => void }) {
  const hits = AESTHETICS.filter((a) => visited.includes(a.slug) && a.slug !== A).slice(-8);
  return (
    <div className={s.spBottom}>
      <p>Miis you&apos;ve passed — tap to visit their channel</p>
      <div className={s.hits}>
        {hits.length === 0 && <i>No one yet. Go for a walk (visit another channel).</i>}
        {hits.map((a) => (
          <button key={a.slug} type="button" onClick={() => onGo(a.slug)}>
            <span style={{ backgroundImage: `url(${thumbFor(a.slug) ?? ""})` }} />
            {a.name}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Activity Log */

export function ActivityTop({ steps, coins }: { steps: number; coins: number }) {
  const days = [3120, 5480, 2210, 7900, 4410, 6120, steps];
  const max = Math.max(...days, 8000);
  return (
    <div className={s.actTop}>
      <b>Today · {steps.toLocaleString()} steps</b>
      <div className={s.bars}>
        {days.map((d, i) => (
          <i key={i} style={{ height: `${(d / max) * 100}%` }} className={i === 6 ? s.today : ""} />
        ))}
      </div>
      <span>
        🪙 Play Coins: {coins} / 300 · walk around (move the stylus) to earn them
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ eShop */

export function ShopTop() {
  return (
    <div className={s.shopTop}>
      <b>Nintendo eShop</b>
      <span>♪ now playing: the shop music, forever</span>
    </div>
  );
}

export function ShopBottom({ onGo }: { onGo: (slug: string) => void }) {
  const picks = ["wii", "game-beach", "xbox-360", "arcade", "ps1", "frutiger-aero"]
    .map((slug) => AESTHETICS.find((a) => a.slug === slug))
    .filter((a): a is NonNullable<typeof a> => !!a);
  return (
    <div className={s.shopBottom}>
      {picks.map((a, i) => (
        <button key={a.slug} type="button" onClick={() => onGo(a.slug)}>
          <span style={{ backgroundImage: `url(${thumbFor(a.slug) ?? ""})` }} />
          <b>{a.name}</b>
          <em>{i % 3 === 0 ? "FREE" : `🪙 ${i * 20}`}</em>
        </button>
      ))}
    </div>
  );
}
