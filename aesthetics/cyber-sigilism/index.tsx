"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { cutN } from "@/lib/assets";
import { tone, unlock } from "@/lib/audio";
import { useMusic } from "@/lib/music";
import { sbGet, sbSet } from "@/lib/storage";
import { Screen, type Show } from "./Screen";
import { beep, clickWheel, inkSound, sigilcore } from "./sigilcore";
import s from "./shelf.module.css";

/**
 * Channel — Y2K.
 *
 * Fifth build (2026-10). Mark, on the fourth: "make the devices actually do something
 * if you power them on, make sure the charms actually come out of the correct part…
 * add other Y2K elements too. The two rows of shelves is boring for the layout."
 *
 * The shelves are gone. Everything floats on its own disc of lit glass, in two orbits
 * round a wireframe globe, the way a 2000 product page thought the future would
 * display its goods. Switch a thing on and its screen — the one in the photograph —
 * starts running: Snake on the Nokia, falling blocks on the Game Boy, a pet on the
 * memory card. Charms hang from where the strap really goes. And the globe in the
 * middle will run a millennium-bug scan over the lot if you ask it to.
 */

const A = "cyber-sigilism";

type CharmKind = "spark" | "diamond" | "twin" | "burst";
const KINDS: CharmKind[] = ["spark", "diamond", "twin", "burst"];
const TINTS = ["#eef4ff", "#bfe6ff", "#d9d0ff", "#c8fff0"];

type Pt = [number, number];

interface Lcd {
  /** the four corners of the glass in the photograph — tl, tr, br, bl — as fractions of
   *  it. Nothing is shot square-on, so a rectangle never fits; this is a homography. */
  q: [Pt, Pt, Pt, Pt];
  show: Show;
  tint?: string;
}

/** CSS matrix3d that maps a w×h rectangle onto four corners. */
function quadMatrix(w: number, h: number, [tl, tr, br, bl]: [Pt, Pt, Pt, Pt]): string {
  const [x0, y0] = tl;
  const [x1, y1] = tr;
  const [x2, y2] = br;
  const [x3, y3] = bl;
  const dx1 = x1 - x2;
  const dx2 = x3 - x2;
  const dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2;
  const dy2 = y3 - y2;
  const dy3 = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1;
  const a13 = (dx3 * dy2 - dx2 * dy3) / den;
  const a23 = (dx1 * dy3 - dx3 * dy1) / den;
  const a11 = x1 - x0 + a13 * x1;
  const a21 = x3 - x0 + a23 * x3;
  const a12 = y1 - y0 + a13 * y1;
  const a22 = y3 - y0 + a23 * y3;
  return `matrix3d(${a11 / w},${a12 / w},0,${a13 / w},${a21 / h},${a22 / h},0,${a23 / h},0,0,1,0,${x0},${y0},0,1)`;
}

interface Device {
  id: string;
  slot: string;
  n: number;
  name: string;
  year: number;
  shell: string;
  line: string;
  /** centre of its disc, and how wide the photograph is drawn */
  x: number;
  y: number;
  w: number;
  sink: number;
  /** the strap hole, as fractions of the photograph: only on things that go in a pocket */
  tie?: [number, number];
  chain?: number;
  /** degrees the chain rests off vertical, so a charm tied at the top hangs beside the thing, not over its screen */
  lean?: number;
  screens?: Lcd[];
  /** no screen: a power light instead */
  led?: [number, number, string];
  hz: number;
  runs: string;
}

const DEVICES: Device[] = [
  { id: "imac", slot: "y2k_tech", n: 10, name: "iMac G3", year: 1998, shell: "bondi blue · translucent", line: "No floppy drive, a handle on top, and you could see the tube through the back. For the next five years every gadget came in see-through plastic.", x: 176, y: 452, w: 214, sink: 7, screens: [{ q: [[0.114, 0.124], [0.36, 0.19], [0.284, 0.728], [0.06, 0.598]], show: "desktop" }], hz: 523, runs: "Mac OS 8.5 — installing something" },
  { id: "n64", slot: "y2k_n64", n: 1, name: "Nintendo 64", year: 1996, shell: "charcoal · three-pronged pad", line: "Four controller ports on the front because four people were going to play. The cartridge stands up out of the top like toast.", x: 432, y: 300, w: 262, sink: 8, led: [0.575, 0.643, "#ff3b30"], hz: 660, runs: "cartridge in · power light on" },
  { id: "vmu", slot: "y2k_more", n: 2, name: "Visual Memory Unit", year: 1999, shell: "aqua blue · translucent", line: "A memory card with its own screen, buttons and battery. You could raise a pet on it on the bus.", x: 620, y: 216, w: 74, sink: 2, tie: [0.5, 0.09], chain: 44, lean: 62, screens: [{ q: [[0.315, 0.32], [0.716, 0.352], [0.668, 0.6], [0.274, 0.563]], show: "pet", tint: "#a9c7c0" }], hz: 1175, runs: "Chao Adventure" },
  { id: "swan", slot: "y2k_more", n: 3, name: "WonderSwan Color", year: 2000, shell: "crystal blue", line: "Forty hours on one AA battery, and you could turn it sideways for games made for a tall screen.", x: 1004, y: 250, w: 176, sink: 6, tie: [0.955, 0.6], chain: 56, screens: [{ q: [[0.355, 0.202], [0.757, 0.348], [0.656, 0.718], [0.248, 0.547]], show: "shooter" }], hz: 784, runs: "a side-scrolling shooter" },
  { id: "dc", slot: "y2k_tech", n: 7, name: "Dreamcast", year: 1999, shell: "white", line: "The memory card has its own little screen and plugs into the controller, so it lights up in your hands while you play.", x: 1216, y: 326, w: 244, sink: 8, led: [0.745, 0.475, "#ff9a2e"], screens: [{ q: [[0.155, 0.406], [0.221, 0.379], [0.233, 0.487], [0.17, 0.513]], show: "pet", tint: "#a9c7c0" }], hz: 740, runs: "disc spinning · memory card screen on" },
  { id: "pocket", slot: "y2k_tech", n: 8, name: "PocketStation", year: 1999, shell: "white · japan only", line: "A memory card with a screen, a speaker and a clock. It went in your pocket and kept playing.", x: 1446, y: 302, w: 72, sink: 3, tie: [0.5, 0.045], chain: 40, lean: -60, screens: [{ q: [[0.279, 0.173], [0.713, 0.175], [0.703, 0.466], [0.26, 0.464]], show: "pet", tint: "#c9d3dc" }], hz: 1320, runs: "PocketStation pet" },
  { id: "nokia", slot: "y2k_more", n: 5, name: "Nokia 3310", year: 2000, shell: "navy and silver", line: "Snake II, composer ringtones, a week on one charge. The strap goes through the top.", x: 1506, y: 540, w: 64, sink: 2, tie: [0.5, 0.025], chain: 44, lean: 58, screens: [{ q: [[0.17, 0.267], [0.84, 0.264], [0.826, 0.475], [0.183, 0.475]], show: "snake" }], hz: 1568, runs: "Snake II" },
  { id: "psone", slot: "y2k_tech", n: 5, name: "PS one", year: 2000, shell: "white · round", line: "The grey box, shrunk and rounded off for the new millennium. It outsold the PlayStation 2 that Christmas.", x: 1290, y: 704, w: 304, sink: 12, led: [0.838, 0.69, "#34e36a"], hz: 440, runs: "lid shut · green light" },
  { id: "vmuw", slot: "y2k_more", n: 1, name: "Visual Memory Unit", year: 1998, shell: "white", line: "The original white one. When its batteries are flat it beeps every time you switch the console on. They are always flat.", x: 1040, y: 744, w: 78, sink: 2, tie: [0.5, 0.05], chain: 44, lean: -62, screens: [{ q: [[0.303, 0.293], [0.715, 0.328], [0.674, 0.6], [0.262, 0.553]], show: "pet", tint: "#b9c9a8" }], hz: 1046, runs: "clock, and a low battery" },
  { id: "razr", slot: "cs_dev", n: 1, name: "RAZR V3", year: 2004, shell: "anodised aluminium", line: "Thin enough to shut with one hand, and a keypad cut out of a single sheet of metal. This is the one you hung charms on.", x: 846, y: 772, w: 118, sink: 5, tie: [0.6, 0.455], chain: 50, screens: [{ q: [[0.601, 0.115], [0.892, 0.115], [0.892, 0.4], [0.601, 0.4]], show: "desktop" }, { q: [[0.172, 0.382], [0.328, 0.382], [0.328, 0.488], [0.172, 0.488]], show: "clock" }], hz: 1760, runs: "both displays lit" },
  { id: "ibook", slot: "y2k_tech", n: 6, name: "iBook G3", year: 1999, shell: "blueberry · clamshell", line: "A laptop with a handle and no latch, the colour of a boiled sweet. It was the first one with Wi-Fi in it.", x: 628, y: 772, w: 166, sink: 5, screens: [{ q: [[0.16, 0.111], [0.695, 0.102], [0.691, 0.426], [0.186, 0.462]], show: "desktop" }], hz: 587, runs: "Mac OS 9 — AirPort on" },
  { id: "gbp", slot: "y2k_more", n: 6, name: "Game Boy Pocket", year: 1996, shell: "silver", line: "The original Game Boy, made thinner and finished in silver. The screen is finally grey instead of green.", x: 424, y: 756, w: 104, sink: 3, tie: [0.9, 0.2], chain: 46, screens: [{ q: [[0.445, 0.155], [0.808, 0.235], [0.694, 0.511], [0.329, 0.424]], show: "blocks" }], hz: 880, runs: "falling blocks" },
  { id: "gba", slot: "y2k_tech", n: 4, name: "Game Boy Advance", year: 2001, shell: "glacier · clear", line: "32 bits, sideways, in a shell like frosted glass. No backlight. You tilted it towards a window.", x: 206, y: 730, w: 236, sink: 14, tie: [0.925, 0.52], chain: 50, screens: [{ q: [[0.393, 0.23], [0.718, 0.391], [0.618, 0.674], [0.288, 0.5]], show: "boot" }], hz: 990, runs: "boot logo, then a platformer" },
];

/** A charm is a spark or a cut stone. Nothing cleverer. */
function Charm({ kind, tint, size }: { kind: CharmKind; tint: string; size: number }) {
  const spark = "M0 -24 C2.4 -5 5 -2.4 24 0 C5 2.4 2.4 5 0 24 C-2.4 5 -5 2.4 -24 0 C-5 -2.4 -2.4 -5 0 -24Z";
  const id = `g${kind}${tint.slice(1)}`;
  return (
    <svg width={size} height={size} viewBox="-28 -28 56 56" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.45" stopColor={tint} />
          <stop offset="1" stopColor="#7f93c4" />
        </linearGradient>
      </defs>
      <g fill={`url(#${id})`} stroke="#5f73a8" strokeWidth="1" strokeLinejoin="round">
        {kind === "spark" && <path d={spark} />}
        {kind === "twin" && (
          <>
            <path d={spark} transform="translate(-6 -4) scale(0.8)" />
            <path d={spark} transform="translate(14 12) scale(0.42)" />
          </>
        )}
        {kind === "burst" && (
          <>
            <path d={spark} />
            <path d={spark} transform="rotate(45) scale(0.56)" />
          </>
        )}
        {kind === "diamond" && (
          <>
            <path d="M-17 -6 L-9 -18 L9 -18 L17 -6 L0 22Z" />
            <path d="M-17 -6 H17 M-9 -18 L-5 -6 L0 22 L5 -6 L9 -18 M0 -18 L-5 -6 M0 -18 L5 -6" fill="none" strokeWidth="0.8" />
          </>
        )}
      </g>
    </svg>
  );
}

/** Everything a powered device shows, laid over its photograph. */
function Live({ d, w, h }: { d: Device; w: number; h: number }) {
  return (
    <>
      {d.screens?.map((sc, i) => {
        const px = sc.q.map(([x, y]) => [x * w, y * h]) as [Pt, Pt, Pt, Pt];
        return (
          <span key={i} className={s.lcd} style={{ transform: quadMatrix(100, 100, px) }}>
            <Screen show={sc.show} tint={sc.tint} />
          </span>
        );
      })}
      {d.led && <i className={s.led} style={{ left: `${d.led[0] * 100}%`, top: `${d.led[1] * 100}%`, "--c": d.led[2] } as CSSProperties} />}
    </>
  );
}

export default function Y2K() {
  const [held, setHeld] = useState<string | null>(null);
  const [on, setOn] = useState<Record<string, boolean>>({});
  const [charms, setCharms] = useState<Record<string, number>>({});
  const [now, setNow] = useState<Date | null>(null);
  const [disc, setDisc] = useState(true);
  const [dial, setDial] = useState<"idle" | "dialling" | "online">("idle");
  const [scan, setScan] = useState<"idle" | "running" | "clean">("idle");

  useEffect(() => {
    setCharms(sbGet<Record<string, number>>(A, "charm", {}));
    setOn(sbGet<Record<string, boolean>>(A, "on", { nokia: true }));
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useMusic(sigilcore, 70, disc);

  const charmOf = (d: Device, i: number) => {
    const k = charms[d.id] ?? i;
    return { kind: KINDS[k % KINDS.length], tint: TINTS[Math.floor(k / KINDS.length + i) % TINTS.length] };
  };
  const dev = DEVICES.find((d) => d.id === held) ?? null;
  const devI = dev ? DEVICES.indexOf(dev) : 0;
  const cutOf = (d: Device) => cutN(A, d.slot, d.n);
  const running = Object.values(on).filter(Boolean).length;

  const power = (d: Device, e?: React.MouseEvent) => {
    e?.stopPropagation();
    unlock();
    const next = { ...on, [d.id]: !on[d.id] };
    setOn(next);
    sbSet(A, "on", next);
    if (next[d.id]) [1, 1.5, 2].forEach((m, i) => window.setTimeout(() => beep(d.hz * m), i * 110));
    else beep(d.hz / 2);
  };

  const recast = (d: Device, i: number) => {
    unlock();
    inkSound();
    const next = { ...charms, [d.id]: (charms[d.id] ?? i) + 1 };
    setCharms(next);
    sbSet(A, "charm", next);
  };

  const connect = () => {
    unlock();
    if (dial !== "idle") {
      setDial("idle");
      tone({ freq: 400, toFreq: 120, duration: 0.3, gain: 0.05 });
      return;
    }
    setDial("dialling");
    tone({ freq: 440, duration: 0.5, gain: 0.04 });
    [697, 770, 852, 941, 697, 852, 770, 941, 697, 770, 852].forEach((f, i) => tone({ freq: f, duration: 0.07, gain: 0.05, delay: 0.6 + i * 0.1, type: "square" }));
    [1200, 2100, 1650, 980, 2400, 1300, 1800].forEach((f, i) => tone({ freq: f, toFreq: f * (i % 2 ? 0.6 : 1.5), duration: 0.28, gain: 0.03, delay: 1.9 + i * 0.26, type: "sawtooth" }));
    window.setTimeout(() => setDial((d) => (d === "dialling" ? "online" : d)), 3900);
  };

  // the millennium-bug scan: a ring goes out from the globe and everything answers
  const runScan = () => {
    unlock();
    if (scan === "running") return;
    setScan("running");
    DEVICES.forEach((d, i) => window.setTimeout(() => beep(d.hz), 300 + i * 190));
    window.setTimeout(() => {
      setScan("clean");
      [523, 659, 784, 1046].forEach((f, i) => tone({ freq: f, duration: 0.3, gain: 0.05, delay: i * 0.09 }));
    }, 300 + DEVICES.length * 190 + 300);
  };

  const t = now ? now.toLocaleTimeString("en-GB") : "--:--:--";
  // in the hand: the photograph at a known size, so its screen can be found on it
  const big = dev ? cutOf(dev) : null;
  const fit = big ? Math.min(620 / big.width, 460 / big.height) : 1;
  const bigW = big ? Math.round(big.width * fit) : 0;
  const bigH = big ? Math.round(big.height * fit) : 0;

  return (
    <div className={s.root} data-scan={scan === "running" || undefined} onPointerDown={() => unlock()}>
      {/* ---------- the room: white, and all of it curved ---------- */}
      <div className={s.wall} />
      <svg className={s.rings} viewBox="0 0 1600 900" aria-hidden>
        <g className={s.portal}>
          {[150, 230, 320, 420, 530].map((r, i) => (
            <circle key={r} cx="800" cy="500" r={r} data-dash={i % 2 === 1 || undefined} />
          ))}
        </g>
        <g className={s.orbit}>
          <ellipse cx="800" cy="500" rx="690" ry="300" />
          <ellipse cx="800" cy="500" rx="420" ry="250" transform="rotate(-8 800 500)" />
          <ellipse cx="800" cy="500" rx="760" ry="150" transform="rotate(7 800 500)" />
        </g>
        <g className={s.ticks}>
          {Array.from({ length: 72 }, (_, i) => (
            <line key={i} x1="800" y1={500 - 548} x2="800" y2={500 - (i % 6 === 0 ? 566 : 556)} transform={`rotate(${i * 5} 800 500)`} />
          ))}
        </g>
      </svg>
      <i className={`${s.sat} ${s.satA}`} />
      <i className={`${s.sat} ${s.satB}`} />
      {[
        [90, 620, 40, 0],
        [330, 500, 22, 3],
        [760, 180, 30, 6],
        [1130, 560, 26, 2],
        [1370, 470, 46, 5],
        [560, 620, 18, 8],
        [960, 660, 34, 4],
        [1540, 760, 24, 7],
      ].map(([x, y, d, dl], i) => (
        <i key={i} className={s.bubble} style={{ left: x, top: y, width: d, height: d, animationDelay: `${-dl * 1.7}s` }} />
      ))}
      <div className={s.sweep} />

      {/* ---------- the globe in the middle of it ---------- */}
      <button type="button" className={s.hub} data-state={scan} onClick={runScan} aria-label="Run the millennium bug scan">
        <span className={s.sphere}>
          <i />
          <i />
          <i />
          <i />
        </span>
        <svg className={s.hubText} viewBox="-150 -150 300 300" aria-hidden>
          <defs>
            <path id="y2kring" d="M0 -128 A128 128 0 1 1 -0.1 -128" />
          </defs>
          <text>
            <textPath href="#y2kring">WELCOME TO THE NEW MILLENNIUM ✦ 01.01.2000 ✦ ALL SYSTEMS NOMINAL ✦ PLEASE STAND BY ✦ </textPath>
          </text>
        </svg>
        <b>{scan === "idle" ? "run Y2K scan" : scan === "running" ? "scanning…" : "0 bugs found"}</b>
        <small>{scan === "clean" ? `${DEVICES.length} devices compliant` : `${running} of ${DEVICES.length} switched on`}</small>
      </button>
      <i className={s.pulse} key={scan} />

      {/* ---------- thirteen things, each on its own disc of glass ---------- */}
      {DEVICES.map((d, i) => {
        const cut = cutOf(d);
        if (!cut) return null;
        const ch = charmOf(d, i);
        return (
          <div key={d.id} className={s.spot} style={{ left: d.x, top: d.y, "--i": i, "--w": `${d.w}px` } as CSSProperties} data-away={held === d.id || undefined}>
            <i className={s.disc} />
            <button
              type="button"
              className={s.device}
              data-on={on[d.id] || undefined}
              style={{ width: d.w, marginBottom: -d.sink }}
              onClick={() => {
                unlock();
                clickWheel();
                setHeld(d.id);
              }}
              aria-label={`${d.name}, ${d.year} — pick it up`}
            >
              <img className={s.body} src={cut.src} alt="" draggable={false} />
              {on[d.id] && <Live d={d} w={d.w} h={(d.w * cut.height) / cut.width} />}
              {d.tie && (
                <span className={s.charm} style={{ left: `${d.tie[0] * 100}%`, top: `${d.tie[1] * 100}%`, "--len": `${d.chain}px`, "--lean": `${d.lean ?? 0}deg`, animationDelay: `${i * -0.7}s` } as CSSProperties}>
                  <Charm kind={ch.kind} tint={ch.tint} size={38} />
                </span>
              )}
            </button>
            <button type="button" className={s.power} data-on={on[d.id] || undefined} onClick={(e) => power(d, e)} aria-label={`${on[d.id] ? "Switch off" : "Switch on"} the ${d.name}`} title={on[d.id] ? "switch off" : "switch on"} />
            <em>
              {d.name} <small>{d.year}</small>
            </em>
          </div>
        );
      })}

      {/* ---------- lettering and pods ---------- */}
      <header className={s.title}>
        <h1>Y2K</h1>
      </header>

      <div className={s.pods}>
        <button type="button" className={s.pod} data-on={disc || undefined} onClick={() => { unlock(); setDisc((v) => !v); clickWheel(); }} aria-label={disc ? "Stop the disc" : "Play the disc"}>
          <i className={s.cd} />
          <span>
            <b>{disc ? "now playing" : "disc stopped"}</b>
            <small>track 02 · liquid_chrome.cda</small>
          </span>
          <u className={s.eq}>
            <i />
            <i />
            <i />
            <i />
            <i />
          </u>
        </button>

        <button type="button" className={s.pod} data-on={dial === "online" || undefined} data-busy={dial === "dialling" || undefined} onClick={connect} aria-label="Dial up">
          <i className={s.modem} />
          <span>
            <b>{dial === "idle" ? "dial up" : dial === "dialling" ? "dialling…" : "connected"}</b>
            <small>{dial === "online" ? "56,000 bps · you've got mail" : dial === "dialling" ? "handshaking" : "56k · click to connect"}</small>
          </span>
          <u className={s.bar}>
            <i />
          </u>
        </button>

        <div className={s.pod} data-static>
          <span>
            <b className={s.time}>{t}</b>
            <small>system date 01.01.2000</small>
          </span>
        </div>
      </div>

      <div className={s.ticker} aria-hidden>
        <span>
          WELCOME TO THE NEW MILLENNIUM ✦ MEMORY CARD FORMATTED ✦ 128 MB FREE ✦ PLEASE DO NOT REMOVE THE DISC ✦ INFRARED PORT READY ✦ BATTERY 100% ✦ WELCOME TO THE NEW MILLENNIUM ✦ MEMORY CARD FORMATTED ✦ 128 MB FREE ✦ PLEASE DO NOT REMOVE THE DISC ✦ INFRARED PORT READY ✦ BATTERY 100% ✦
        </span>
      </div>

      {/* ---------- in the hand, under the light ---------- */}
      {dev && (
        <div className={s.stage} onClick={() => setHeld(null)}>
          <div className={s.ring} />
          <div className={s.lifted} key={dev.id} onClick={(e) => e.stopPropagation()}>
            <div className={s.liftBox} data-on={on[dev.id] || undefined}>
              <img src={big?.src ?? ""} alt={dev.name} draggable={false} width={bigW} height={bigH} />
              {on[dev.id] && <Live d={dev} w={bigW} h={bigH} />}
              {dev.tie && (
                <span className={s.bigCharm} style={{ left: `${dev.tie[0] * 100}%`, top: `${dev.tie[1] * 100}%`, "--lean": `${dev.lean ?? 0}deg` } as CSSProperties} key={charms[dev.id] ?? devI}>
                  <Charm {...charmOf(dev, devI)} size={120} />
                </span>
              )}
            </div>
          </div>

          <aside className={s.plate} onClick={(e) => e.stopPropagation()}>
            <small>{dev.year}</small>
            <h2>{dev.name}</h2>
            <dl>
              <dt>shell</dt>
              <dd>{dev.shell}</dd>
              <dt>charm</dt>
              <dd>{dev.tie ? `${charmOf(dev, devI).kind} · on a ball chain` : "none — it does not go in a pocket"}</dd>
              <dt>status</dt>
              <dd>{on[dev.id] ? `on · ${dev.runs}` : "standby"}</dd>
            </dl>
            <p>{dev.line}</p>
            <div>
              <button type="button" data-on={on[dev.id] || undefined} onClick={() => power(dev)}>
                <i /> {on[dev.id] ? "power off" : "power on"}
              </button>
              {dev.tie && (
                <button type="button" onClick={() => recast(dev, devI)}>
                  ✦ new charm
                </button>
              )}
              <button type="button" onClick={() => setHeld(null)}>
                put it back
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
