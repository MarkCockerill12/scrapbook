"use client";

import { useEffect, useRef, useState } from "react";
import { useCanvas } from "@/components/CanvasStage";
import { src } from "@/lib/assets";
import { unlock } from "@/lib/audio";
import { useMusic } from "@/lib/music";
import { sbGet, sbSet } from "@/lib/storage";
import { useShell } from "@/lib/store";
import { rack } from "./balls";
import { Chat, Nickname, type LogLine } from "./Chat";
import { Gallery } from "./gallery";
import { GalleryView } from "./GalleryView";
import { CRT_H, CRT_W, runLoop, type Mode, type Rig } from "./loop";
import { SCORES } from "./music";
import type { Vec3 } from "./Renderer";
import { Room } from "./Room";
import { WorldView, type Hit } from "./WorldView";
import { PHOTO_H, PHOTO_W, PHOTO_Y, SCREEN, bbox, clipOf, quadMatrix } from "./scene";
import { degauss, ding, dive, modem, startFan, teleport } from "./sound";
import styles from "./styles.module.css";
import { greet, guestName, replyTo, type WorldId } from "./world/chat";
import { KIND_LINES } from "./world/models";
import type { World } from "./world/World";
import { WORLDS, WORLD_NAMES } from "./world/worlds";

/**
 * Silicon Dreams — the surreal, uncanny look of early CGI and 3D worlds, mid-80s to the
 * early 2000s: sparse places, low-resolution textures, floating objects.
 *
 * Fiction: an SGI Octane in a computing museum. Switch the monitor on and it dials into
 * HYPERSPHERE, a 1996 3D chat server, and the camera goes through the glass. Ground Zero
 * is the hub — a grass plain under a real photographed sky, the server's mascot (a live
 * blobby surface) turning over the plaza, people standing about talking. Portals lead to
 * Sky Island, a CyberCafé, The Void, and the Render Gallery, the one world on the server
 * drawn by a ray tracer.
 *
 * Assets: `sd_ws` 1 (the Octane, Commons CC BY 2.0, 3600px because the camera pushes in),
 * `sd_tex` 1–16 (ambientCG CC0 scans, shrunk to 64px in the browser), `sd_sky` 1–3
 * (Commons cloud photos).
 */

const SLUG = "silicon-dreams";
const TELEPORT_MS = 1300;

export default function SiliconDreams() {
  const { scale: stageScale } = useCanvas();
  const muted = useShell((s) => s.muted);
  const begin = useShell((s) => s.beginTransition);

  const [mode, setModeState] = useState<Mode>("off");
  const modeRef = useRef<Mode>("off");
  const setMode = (m: Mode) => {
    modeRef.current = m;
    setModeState(m);
  };
  const [place, setPlace] = useState<WorldId>("hub");
  const vistaRef = useRef(0);
  const texRef = useRef(0);
  const [booting, setBooting] = useState(false);
  const [viewI, setViewI] = useState(0);
  const [going, setGoing] = useState<WorldId | null>(null);
  const [log, setLog] = useState<LogLine[]>([]);
  const [nick, setNick] = useState<string | null>(null);
  const [askNick, setAskNick] = useState(false);
  const lineId = useRef(0);

  const worldCanvas = useRef<HTMLCanvasElement>(null);
  const galleryCanvas = useRef<HTMLCanvasElement>(null);
  const photoRef = useRef<HTMLDivElement>(null);
  const glassRef = useRef<HTMLDivElement>(null);
  const crtRef = useRef<HTMLDivElement>(null);
  const passRef = useRef<HTMLSpanElement>(null);
  const world = useRef<World | null>(null);
  const gallery = useRef<Gallery | null>(null);

  const transition = useRef(0);
  const bootStart = useRef(0);
  const glide = useRef<{ from: { pos: Vec3; tgt: Vec3 }; to: number; t0: number; dur: number } | null>(null);
  const cam = useRef<{ pos: Vec3; tgt: Vec3 }>(Gallery.pose(0));
  const simTime = useRef(0);
  const balls = useRef(rack());
  const blob = useRef<[number, number, number, number]>([16, 1.35, 0, 0]);
  const light = useRef({ angle: 0, size: 0.45 });

  const hero = src(SLUG, "sd_ws", 1);

  const push = (lines: Omit<LogLine, "id">[]) =>
    setLog((l) => [...l, ...lines.map((x) => ({ ...x, id: ++lineId.current }))].slice(-60));

  useEffect(() => {
    const n = sbGet<string | null>(SLUG, "nick", null);
    if (n) setNick(n);
    const t = sbGet<number>(SLUG, "material", 0) % 4;
    texRef.current = t;
    // Review hooks: ?sd=room boots the monitor; ?sd=hub|island|cafe|void|gallery goes straight in.
    const q = new URLSearchParams(window.location.search).get("sd");
    if (q === "room") {
      bootStart.current = performance.now();
      setMode("boot");
    } else if (q && q in WORLD_NAMES) {
      if (!n) setNick("Guest_0000");
      const id = window.setTimeout(() => arrive(q as WorldId), 50);
      return () => window.clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- sound beds ---------------------------------------------------------------
  const inWorld = mode === "world" || mode === "gallery";
  useEffect(() => {
    if (muted || inWorld) return;
    return startFan();
  }, [muted, inWorld]);
  useMusic(SCORES[place].score, SCORES[place].bpm, inWorld && !going);

  // ---- the loop (loop.ts) ---------------------------------------------------------
  const rig: Rig = {
    worldCanvas,
    galleryCanvas,
    photo: photoRef,
    glass: glassRef,
    crt: crtRef,
    mode: modeRef,
    setMode,
    transition,
    bootStart,
    world,
    gallery,
    onChat: (lines) => {
      push(lines);
      ding();
    },
    vista: vistaRef,
    glide,
    cam,
    simTime,
    balls,
    blob,
    tex: texRef,
    light,
    pass: passRef,
  };
  const rigRef = useRef(rig);
  rigRef.current = rig;
  useEffect(() => runLoop(rigRef.current, stageScale), [stageScale]);

  useEffect(() => {
    if (mode === "world" && !nick) setAskNick(true);
  }, [mode, nick]);

  // ---- the room --------------------------------------------------------------------
  const power = () => {
    unlock();
    if (modeRef.current === "off") {
      degauss();
      modem();
      setBooting(true);
      window.setTimeout(() => setBooting(false), 900);
      bootStart.current = performance.now();
      setLog([]);
      setMode("boot");
    } else if (modeRef.current === "boot" || modeRef.current === "room") {
      setMode("off");
    }
  };
  const enter = () => {
    if (modeRef.current !== "room") return;
    transition.current = performance.now();
    dive(true);
    setMode("dive");
  };

  // ---- moving between worlds ----------------------------------------------------------
  const arrive = (to: WorldId) => {
    setPlace(to);
    setGoing(null);
    setViewI(0);
    if (to === "gallery") {
      glide.current = null;
      vistaRef.current = 0;
      cam.current = Gallery.pose(0);
      setMode("gallery");
    } else {
      world.current?.load(to, performance.now());
      setMode("world");
    }
    push([{ name: "", text: `*** you are now in ${WORLD_NAMES[to]} ***`, kind: "sys" }]);
  };
  const teleportTo = (to: WorldId) => {
    if (going || to === place) return;
    teleport();
    setGoing(to);
    window.setTimeout(() => arrive(to), TELEPORT_MS);
  };
  const logOff = () => {
    const m = modeRef.current;
    if (m !== "world" && m !== "gallery") return;
    if (m === "gallery") {
      world.current?.load("hub", performance.now());
      setPlace("hub");
    }
    push([{ name: "", text: "*** disconnected ***", kind: "sys" }]);
    transition.current = performance.now();
    dive(false);
    setMode("rise");
  };

  const say = (text: string) => {
    const me = nick ?? "Guest";
    push([{ name: me, text, kind: "me" }]);
    if (Math.random() < 0.85) {
      window.setTimeout(() => {
        const reply = replyTo(text, me);
        if (modeRef.current === "world") world.current?.answer(reply, performance.now());
        else push([{ name: ["Zonk", "CyberGrrl97", "Neo1999"][Math.floor(Math.random() * 3)], text: reply }]);
      }, 900 + Math.random() * 1800);
    }
  };

  // ---- the chat world's view (WorldView.tsx) ----------------------------------------------
  const onHit = (hit: Hit) => {
    if (hit.portal) teleportTo(hit.portal);
    else if (hit.channel) {
      const to = hit.channel;
      teleport();
      push([{ name: "", text: "*** leaving for another server… ***", kind: "sys" }]);
      window.setTimeout(() => begin(to), 500);
    } else if (hit.avatar && world.current) {
      const now = performance.now();
      const c = world.current.camera.position;
      hit.avatar.look(c.x, c.z, now);
      hit.avatar.wave(now);
      const own = KIND_LINES[hit.avatar.kind];
      world.current.speak(hit.avatar, own && Math.random() < 0.6 ? own[Math.floor(Math.random() * own.length)] : greet(nick ?? "Guest"), now);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.target instanceof HTMLInputElement) && e.key === "Escape") logOff();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sb = bbox(SCREEN);
  const users = place === "gallery" ? 3 : WORLDS[place].avatars.length + 1;

  return (
    <div className={styles.root} data-mode={mode}>
      <div ref={photoRef} className={styles.photo}>
        {hero && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hero}
            alt="A Silicon Graphics Octane workstation and its CRT monitor in a computing museum"
            style={{ top: PHOTO_Y, width: PHOTO_W, height: PHOTO_H }}
            draggable={false}
          />
        )}
      </div>

      <canvas ref={worldCanvas} className={styles.render} data-booting={booting || undefined} />
      <canvas ref={galleryCanvas} className={styles.gallery} />

      {/* The monitor's own glass, laid back over the picture: room reflections, a grey black. */}
      <div ref={glassRef} className={styles.glass} aria-hidden>
        {hero && (
          <div
            className={styles.glassPane}
            style={{ left: sb.x, top: sb.y, width: sb.w, height: sb.h, clipPath: clipOf(SCREEN), backgroundImage: `url(${hero})`, backgroundSize: `${PHOTO_W}px ${PHOTO_H}px`, backgroundPosition: `${-sb.x}px ${PHOTO_Y - sb.y}px` }}
          />
        )}
      </div>

      <div ref={crtRef} className={styles.crt} style={{ width: CRT_W, height: CRT_H, transform: quadMatrix(CRT_W, CRT_H, SCREEN) }} aria-hidden>
        {mode === "boot" && (
          <div className={styles.splash}>
            <h1>HYPERSPHERE</h1>
            <h2>3D Chat · version 1.2</h2>
            <ol>
              <li>Initializing 3D engine…</li>
              <li>Dialing server 555-0196…</li>
              <li>Connected at 28,800 bps</li>
              <li>Downloading Ground Zero…</li>
            </ol>
            <div className={styles.bar}>
              <i />
            </div>
          </div>
        )}
        <div className={styles.scan} />
      </div>

      {(mode === "off" || mode === "boot" || mode === "room") && <Room mode={mode} power={power} enter={enter} />}

      {mode === "world" && <WorldView world={world} onHit={onHit} />}

      {mode === "gallery" && (
        <GalleryView vistaRef={vistaRef} texRef={texRef} glide={glide} cam={cam} balls={balls} blob={blob} light={light} passRef={passRef} />
      )}

      {inWorld && (
        <>
          <div className={styles.client}>
            <button type="button" onClick={logOff}>
              ◂ log off
            </button>
            <span className={styles.where}>
              {WORLD_NAMES[place]} <em>· {users} users</em>
            </span>
            {place !== "gallery" && (
              <div className={styles.views}>
                <span>view:</span>
                {WORLDS[place].views.map((v, i) => (
                  <button
                    key={v.name}
                    type="button"
                    data-on={i === viewI || undefined}
                    onClick={() => {
                      world.current?.setView(i, performance.now());
                      setViewI(i);
                    }}
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            )}
            <div className={styles.teleports}>
              <span>teleport:</span>
              {(Object.keys(WORLD_NAMES) as WorldId[]).map((id) => (
                <button key={id} type="button" data-on={id === place || undefined} onClick={() => teleportTo(id)}>
                  {WORLD_NAMES[id]}
                </button>
              ))}
            </div>
          </div>
          <Chat log={log} onSay={say} users={users} />
        </>
      )}

      {going && (
        <div className={styles.going} key={going}>
          <p>Teleporting to {WORLD_NAMES[going]}…</p>
          <div className={styles.bar}>
            <i style={{ animationDuration: `${TELEPORT_MS}ms` }} />
          </div>
        </div>
      )}

      {askNick && (
        <Nickname
          initial={guestName()}
          onDone={(n) => {
            setNick(n);
            sbSet(SLUG, "nick", n);
            setAskNick(false);
            push([{ name: "", text: `*** ${n} has entered ${WORLD_NAMES[place]} ***`, kind: "sys" }]);
            window.setTimeout(() => world.current?.answer(`hi ${n}!!`, performance.now()), 1200);
          }}
        />
      )}
    </div>
  );
}
