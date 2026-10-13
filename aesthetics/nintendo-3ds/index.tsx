"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useCanvas } from "@/components/CanvasStage";
import { cutN, img, src } from "@/lib/assets";
import { noiseLoop } from "@/lib/audio";
import { useMusic } from "@/lib/music";
import { AESTHETICS } from "@/lib/registry";
import { sbGet, sbSet } from "@/lib/storage";
import { useShell } from "@/lib/store";
import { homeScore, launch, shopScore, shutter, streetpass } from "./music";
import {
  APPS,
  ActivityTop,
  CameraBottom,
  CameraTop,
  HomeBottom,
  HomeTop,
  LENS_FILTER,
  ShopBottom,
  ShopTop,
  StreetPassBottom,
  StreetPassTop,
  SwapnoteBottom,
  SwapnoteTop,
  type App,
  type Lens,
} from "./Screens";
import { button as buttonSound, greet, lid } from "./sound";
import p from "./page.module.css";

/**
 * Channel 12 — Japanese 3DS. 23:14, outside Yodobashi Camera.
 *
 * Redesigned 2026-09-28 (Mark: "the 3DS should look better, and there should be other
 * stuff going on — the 3DS only a part of it"). The console is now a REAL photograph
 * of an Aqua Blue 3DS (Wikipedia), held up against a wall of real Tokyo night photos,
 * with a real gachapon machine to one side. Its screens are live: the HOME menu,
 * Swapnote, a camera that actually looks at the street and prints its photos onto the
 * wall, StreetPass (every channel you've visited is a Mii you passed), the Activity
 * Log pedometer and the eShop, with its music.
 *
 * Kept from the old page: HOME → the Wii Menu (Mark called that cross-link out).
 */

const A = "nintendo-3ds";

/* Console placement and the photo's screen rects (fractions of the 800×831 photo). */
const CW = 700;
const CH = Math.round((CW * 831) / 800);
const CX = 450;
const CY = 16;
const TOP = { l: 0.2225, t: 0.12, w: 0.561, h: 0.327 };
const BOT = { l: 0.2775, t: 0.561, w: 0.451, h: 0.32 };
const rect = (r: typeof TOP, nw: number, nh: number): CSSProperties => ({
  left: r.l * CW,
  top: r.t * CH,
  width: nw,
  height: nh,
  transform: `scale(${(r.w * CW) / nw}, ${(r.h * CH) / nh})`,
  transformOrigin: "0 0",
});
const hot = (x: number, y: number, d: number): CSSProperties => ({ left: x * CW - d / 2, top: y * CH - d / 2, width: d, height: d });

/* Three prints either side of the console, fanned toward it. Same frame, same tape. */
const WALL = [
  { slot: "n3ds_konbini", n: 1, x: 56, y: 44, w: 270, r: -5, cap: "コンビニ · the konbini that never closes" },
  { slot: "n3ds_vending", n: 5, x: 150, y: 300, w: 270, r: 3, cap: "自販機 · warm cans, ¥130" },
  { slot: "n3ds_street", n: 2, x: 44, y: 560, w: 270, r: -3, cap: "裏通り · the back way home" },
  { slot: "n3ds_wires", n: 1, x: 1274, y: 44, w: 270, r: 5, cap: "電線 · every wire in the city" },
  { slot: "n3ds_konbini", n: 2, x: 1180, y: 300, w: 270, r: -3, cap: "夜食 · midnight shelves" },
  { slot: "n3ds_gachapon", n: 2, x: 1286, y: 540, w: 250, r: 4, cap: "ガチャ ¥100 · twist for a capsule", gacha: true },
];

interface Print {
  view: number;
  lens: Lens;
  x: number;
  y: number;
  r: number;
}

export default function Nintendo3DS() {
  const { toCanvasDelta, toCanvasSpace } = useCanvas();
  const begin = useShell((s) => s.beginTransition);
  const visited = useShell((s) => s.visited);
  const muted = useShell((s) => s.muted);

  const [app, setApp] = useState<App>("home");
  const [sel, setSel] = useState(0);
  const [depth, setDepth] = useState(0.4);
  const [closed, setClosed] = useState(false);
  const [notes, setNotes] = useState<number[][]>([]);
  const [lens, setLens] = useState<Lens>("normal");
  const [view, setView] = useState(1);
  const [flash, setFlash] = useState(0);
  const [prints, setPrints] = useState<Print[]>([]);
  const [steps, setSteps] = useState(0);
  const [coins, setCoins] = useState(0);
  const [capsule, setCapsule] = useState<{ slug: string; k: number } | null>(null);
  const [spLed, setSpLed] = useState(false);
  const walked = useRef(0);
  const [zoom, setZoom] = useState<number | null>(null);
  const consoleEl = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPrints(sbGet(A, "prints", []));
    setSteps(sbGet(A, "steps", 0));
    setCoins(sbGet(A, "coins", 0));
    setNotes(sbGet(A, "note", []));
  }, []);

  useMusic(closed ? null : app === "eshop" ? shopScore : homeScore, app === "eshop" ? 128 : 76, !closed);

  // A Tokyo street at night: traffic hush and a distant crossing chirp.
  useEffect(() => {
    if (muted) return;
    const stop = noiseLoop({ gain: 0.03, lowpass: 700, attack: 2 });
    return stop;
  }, [muted]);

  // StreetPass: the green LED lights now and then.
  useEffect(() => {
    const id = window.setInterval(() => {
      setSpLed(true);
      streetpass();
      window.setTimeout(() => setSpLed(false), 4000);
    }, 31000);
    return () => window.clearInterval(id);
  }, []);

  // Pedometer: stylus movement is walking.
  const onMove = useCallback(
    (e: React.PointerEvent) => {
      // Head tracking for the 3D slider: the top screen's layers part as you move.
      const c = toCanvasSpace(e.clientX, e.clientY);
      consoleEl.current?.style.setProperty("--mx", String(Math.max(-1, Math.min(1, (c.x - 800) / 800))));
      consoleEl.current?.style.setProperty("--my", String(Math.max(-1, Math.min(1, (c.y - 450) / 450))));
      walked.current += Math.abs(toCanvasDelta(e.movementX)) + Math.abs(toCanvasDelta(e.movementY));
      if (walked.current > 60) {
        const n = Math.floor(walked.current / 60);
        walked.current -= n * 60;
        setSteps((st) => {
          const next = st + n;
          if (Math.floor(next / 100) > Math.floor(st / 100)) {
            setCoins((c) => {
              const cc = Math.min(300, c + 1);
              sbSet(A, "coins", cc);
              return cc;
            });
          }
          if (next % 50 < n) sbSet(A, "steps", next);
          return next;
        });
      }
    },
    [toCanvasDelta, toCanvasSpace],
  );

  const open = (a: App) => {
    setApp(a);
    launch();
  };

  const shoot = () => {
    shutter();
    setFlash((f) => f + 1);
    const next = [...prints, { view, lens, x: 0, y: 0, r: ((prints.length * 37) % 14) - 7 }].slice(-5);
    setPrints(next);
    sbSet(A, "prints", next);
  };

  const gacha = () => {
    const live = AESTHETICS.filter((a) => a.status === "live" && a.slug !== A);
    const pick = live[Math.floor(Math.random() * live.length)];
    setCapsule({ slug: pick.slug, k: Date.now() });
    buttonSound();
    window.setTimeout(() => greet(), 700);
  };

  const face = (b: "A" | "B" | "X" | "Y") => {
    buttonSound();
    if (b === "B") setApp("home");
    if (b === "A" && app === "home") open(APPS[sel].id);
    else if (b === "A" && app === "camera") shoot();
    if (b === "X") setSel((i) => (i + 1) % APPS.length);
    if (b === "Y") setSel((i) => (i + APPS.length - 1) % APPS.length);
  };

  const top = () => {
    switch (app) {
      case "home":
        return <HomeTop sel={sel} depth={depth} />;
      case "swapnote":
        return <SwapnoteTop strokes={notes} />;
      case "camera":
        return <CameraTop view={view} lens={lens} depth={depth} flash={flash > 0} key={flash} />;
      case "streetpass":
        return <StreetPassTop visited={visited} />;
      case "activity":
        return <ActivityTop steps={steps} coins={coins} />;
      case "eshop":
        return <ShopTop />;
    }
  };
  const bottom = () => {
    switch (app) {
      case "home":
        return <HomeBottom sel={sel} onSel={setSel} onOpen={open} coins={coins} />;
      case "swapnote":
        return (
          <SwapnoteBottom
            onStrokes={(d) => {
              setNotes(d);
              sbSet(A, "note", d);
            }}
          />
        );
      case "camera":
        return <CameraBottom lens={lens} onLens={setLens} onShoot={shoot} onView={() => setView((v) => (v % 8) + 1)} />;
      case "streetpass":
        return <StreetPassBottom visited={visited} onGo={begin} />;
      case "activity":
        return <HomeBottom sel={3} onSel={setSel} onOpen={open} coins={coins} />;
      case "eshop":
        return <ShopBottom onGo={begin} />;
    }
  };

  return (
    <div className={p.root} onPointerMove={onMove}>
      <img className={p.street} src={src(A, "n3ds_street", 1)} alt="" />
      <div className={p.streetShade} />

      {/* the wall of photos */}
      {WALL.map((w, i) => (
        <button
          key={i}
          type="button"
          className={p.photo}
          title={w.cap}
          style={{ left: w.x, top: w.y, width: w.w, rotate: `${w.r}deg` }}
          onClick={() => {
            if (w.gacha) return gacha();
            shutter();
            setZoom(i);
          }}
        >
          <img src={src(A, w.slot, w.n)} alt={w.cap} />
          <span className={p.tape} />
          {w.gacha && <em>ガチャ ¥100 — twist!</em>}
        </button>
      ))}

      {/* camera prints you've taken, stuck on with washi tape */}
      {prints.map((pr, i) => (
        <figure key={i} className={p.print} style={{ left: 480 + i * 126, top: 764, rotate: `${pr.r}deg` }}>
          <span className={p.printImg} style={{ backgroundImage: `url(${src(A, "n3ds_street", pr.view)})`, filter: LENS_FILTER[pr.lens] }} />
          <figcaption>3DS · {pr.lens}</figcaption>
        </figure>
      ))}

      {capsule && (
        <button key={capsule.k} type="button" className={p.capsule} onClick={() => begin(capsule.slug)}>
          <img src={cutN(A, "n3ds_gachapon", 1)?.src ?? ""} alt="" />
          <b>
            you got: {AESTHETICS.find((a) => a.slug === capsule.slug)?.name}
            <small>tap to go</small>
          </b>
        </button>
      )}

      {/* the console */}
      <div ref={consoleEl} className={`${p.console} ${closed ? p.closed : ""}`} style={{ left: CX, top: CY, width: CW, height: CH, "--depth": depth } as CSSProperties}>
        <img className={p.shell} src={img(A, "n3ds_hw", 7)?.src ?? ""} alt="Aqua Blue Nintendo 3DS" />
        <div className={p.screen} style={rect(TOP, 400, 240)}>
          <div className={p.stereoBack} />
          <div className={p.stereo}>{top()}</div>
          <div className={p.glass} />
        </div>
        <div className={p.screen} style={rect(BOT, 320, 240)}>
          {bottom()}
          <div className={p.glass} />
        </div>
        <button type="button" className={p.hot} style={hot(0.86, 0.611, 40)} aria-label="X" onClick={() => face("X")} />
        <button type="button" className={p.hot} style={hot(0.8125, 0.663, 40)} aria-label="Y" onClick={() => face("Y")} />
        <button type="button" className={p.hot} style={hot(0.916, 0.663, 40)} aria-label="A" onClick={() => face("A")} />
        <button type="button" className={p.hot} style={hot(0.8625, 0.717, 40)} aria-label="B" onClick={() => face("B")} />
        <button type="button" className={`${p.hot} ${p.pill}`} style={{ left: 0.45 * CW, top: 0.915 * CH, width: 80, height: 26 }} aria-label="HOME" onClick={() => (app === "home" ? begin("wii") : setApp("home"))} />
        <button
          type="button"
          className={`${p.hot} ${p.pill}`}
          style={{ left: 0.78 * CW, top: 0.88 * CH, width: 110, height: 30 }}
          aria-label="POWER"
          onClick={() => {
            setClosed((c) => !c);
            lid(!closed);
          }}
        />
        {/* the 3D depth slider, on the right edge of the top shell */}
        <input
          className={p.slider}
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={depth}
          onChange={(e) => setDepth(Number(e.target.value))}
          style={{ left: 0.905 * CW, top: 0.17 * CH }}
          aria-label="3D depth"
          title="3D depth slider"
        />
        <span className={p.depthTag} style={{ left: 0.9 * CW, top: 0.4 * CH }} data-on={depth > 0.05 || undefined}>
          3D
        </span>
        <i className={`${p.led} ${spLed ? p.ledOn : ""}`} style={{ left: 0.94 * CW, top: 0.485 * CH }} />
      </div>

      {zoom !== null && (
        <button type="button" className={p.lightbox} onClick={() => setZoom(null)}>
          <figure>
            <img src={src(A, WALL[zoom].slot, WALL[zoom].n)} alt="" />
            <figcaption>{WALL[zoom].cap}</figcaption>
          </figure>
        </button>
      )}

    </div>
  );
}
