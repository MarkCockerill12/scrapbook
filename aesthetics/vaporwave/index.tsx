"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useCanvas } from "@/components/CanvasStage";
import { count } from "@/lib/assets";
import { useShell } from "@/lib/store";
import { Cutout } from "@/primitives/Cutout";
import { Cassette } from "./Cassette";
import { GridFloor } from "./GridFloor";
import { startTape } from "./sound";
import { Win95Window, type WindowState } from "./Win95Window";
import styles from "./styles.module.css";

/**
 * Channel 10 — Vaporwave.
 *
 * Fiction: *A E S T H E T I C S / 美学* — the landing page of a bootleg tape nobody
 * pressed.
 *
 * The demo argument: vaporwave is a COLLAGE OF STOLEN OBJECTS, not a purple gradient
 * with a grid on it. The bust, the dolphins, the palms and the cassette here are real
 * photographs, cut out and floated. The chrome is 1995 and left alone. Everything is
 * fractionally out of register, because perfect registration kills it.
 *
 * Assets: `raw/vaporwave/` — 26 grabs, matted with rembg. This is the first channel
 * whose substance is photographic rather than drawn.
 */

const SLUG = "vaporwave";

const TRACKS = [
  ["01", "リサフランク420", "5:23"],
  ["02", "現代のコンピュー", "4:11"],
  ["03", "MALL SOFT", "7:02"],
  ["04", "ライフ・イズ・ア", "3:48"],
  ["05", "S U R F I N G", "6:19"],
  ["06", "TELEPHONE (演出)", "4:55"],
  ["07", "無限のループ", "9:31"],
];

type Id = "tracks" | "deck" | "cover" | "panel";

const INITIAL: Record<Id, WindowState> = {
  tracks: { x: 96, y: 154, w: 400, h: 236, z: 12, closed: false },
  deck: { x: 1064, y: 128, w: 424, h: 356, z: 13, closed: false },
  cover: { x: 1136, y: 520, w: 340, h: 286, z: 11, closed: false },
  panel: { x: 108, y: 512, w: 400, h: 216, z: 14, closed: false },
};

const TILT: Record<Id, number> = { tracks: -1.6, deck: 1.2, cover: -2.4, panel: 1.8 };

export default function Vaporwave() {
  const { toCanvasDelta } = useCanvas();
  const muted = useShell((s) => s.muted);

  const [windows, setWindows] = useState<Record<Id, WindowState>>(INITIAL);
  /** Next z-index to hand out. A ref, not state — nothing renders it. */
  const zTop = useRef(14);
  const [track, setTrack] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [chroma, setChroma] = useState(1);
  const [bust, setBust] = useState(0);
  const [spin, setSpin] = useState(0);

  const dragging = useRef(false);
  const lastX = useRef(0);

  const allClosed = (Object.keys(windows) as Id[]).every((k) => windows[k].closed);

  // The tape. Mute is honoured at start, so unmuting restarts it (see lib/audio).
  useEffect(() => {
    if (!playing || muted) return;
    return startTape();
  }, [playing, muted, track]);

  // Easter egg: with every window shut the scene stops dead and the sun sets.
  useEffect(() => {
    if (!allClosed) return;
    setSpeed(0);
    setPlaying(false);
  }, [allClosed]);

  const move = useCallback((id: Id, x: number, y: number) => {
    setWindows((w) => ({ ...w, [id]: { ...w[id], x, y } }));
  }, []);

  const focus = useCallback((id: Id) => {
    zTop.current += 1;
    const z = zTop.current;
    setWindows((w) => ({ ...w, [id]: { ...w[id], z } }));
  }, []);

  const close = useCallback((id: Id) => {
    setWindows((w) => ({ ...w, [id]: { ...w[id], closed: true } }));
  }, []);

  const reopen = () => {
    setWindows(INITIAL);
    zTop.current = 14;
    setSpeed(1);
  };

  /*
   * "Rotate the bust": a flat cutout turned in Y reads convincingly as a head
   * turning, and passing +/-34 degrees swaps in the next bust photograph, so a full
   * sweep genuinely shows you a different angle rather than the same face squashed.
   */
  const bustCount = Math.max(1, count(SLUG, "vapor_bust"));
  const onBustMove = (clientX: number) => {
    if (!dragging.current) return;
    const dx = toCanvasDelta(clientX - lastX.current);
    lastX.current = clientX;
    setSpin((s) => {
      const next = s + dx * 0.55;
      if (next > 34) {
        setBust((b) => (b + 1) % bustCount);
        return -34;
      }
      if (next < -34) {
        setBust((b) => (b - 1 + bustCount) % bustCount);
        return 34;
      }
      return next;
    });
  };

  return (
    <div
      className={styles.root}
      style={{ "--chroma": chroma } as React.CSSProperties}
      onPointerDown={allClosed ? reopen : undefined}
    >
      <div className={styles.stars} />
      <div
        className={styles.sun}
        style={{
          transform: allClosed ? "translateY(180px)" : "none",
          transition: "transform 3200ms cubic-bezier(.4,0,.2,1)",
        }}
      />
      <GridFloor speed={speed} chroma={chroma} />

      <Cutout
        aesthetic={SLUG}
        slot="vapor_palm"
        pick={0}
        height={720}
        className={styles.palm}
        style={{ left: -60 }}
        priority
      />
      {/*
        -300, not -40: a matted PNG keeps the original frame, so the palm sits
        wherever it sat in the photograph — offsets here position the FILE, not the
        subject. This one needed dragging most of a frame-width right to get its
        trunk onto the edge.
      */}
      <Cutout
        aesthetic={SLUG}
        slot="vapor_palm"
        pick={2}
        height={640}
        className={styles.palm}
        style={{ right: -300, transform: "scaleX(-1)" }}
        priority
      />

      <div className={styles.wordmark}>
        <div className={styles.wordmarkMain}>AESTHETICS</div>
        <div className={styles.wordmarkSub}>美学</div>
      </div>

      {/* the bust */}
      <div
        className={styles.bustWrap}
        style={{ transform: "translateX(-50%)" }}
        onPointerDown={(e) => {
          dragging.current = true;
          lastX.current = e.clientX;
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => onBustMove(e.clientX)}
        onPointerUp={(e) => {
          dragging.current = false;
          e.currentTarget.releasePointerCapture?.(e.pointerId);
        }}
      >
        <div className={styles.pedestal} />
        <div
          className={styles.bust}
          style={{ transform: `rotateY(${spin}deg)` }}
        >
          <Cutout
            aesthetic={SLUG}
            slot="vapor_bust"
            pick={bust}
            height={380}
            alt="Marble bust"
            priority
          />
        </div>
        <div className={styles.bustHint}>drag to turn</div>
      </div>

      {/* tracklist */}
      <Win95Window
        title="TRACKLIST.TXT"
        state={windows.tracks}
        tilt={TILT.tracks}
        onMove={(x, y) => move("tracks", x, y)}
        onFocus={() => focus("tracks")}
        onClose={() => close("tracks")}
      >
        {TRACKS.map(([n, name, len], i) => (
          <div
            key={n}
            className={`${styles.track} ${i === track ? styles.trackOn : ""}`}
            onClick={() => {
              setTrack(i);
              setPlaying(true);
            }}
          >
            <span>
              {n} · {name}
            </span>
            <span>{len}</span>
          </div>
        ))}
      </Win95Window>

      {/* the deck */}
      <Win95Window
        title="NOW PLAYING"
        state={windows.deck}
        tilt={TILT.deck}
        flat
        onMove={(x, y) => move("deck", x, y)}
        onFocus={() => focus("deck")}
        onClose={() => close("deck")}
      >
        <Cassette
          playing={playing}
          onToggle={setPlaying}
          title={TRACKS[track][1]}
        />
      </Win95Window>

      {/* cover art */}
      <Win95Window
        title="COVER.BMP"
        state={windows.cover}
        tilt={TILT.cover}
        flat
        onMove={(x, y) => move("cover", x, y)}
        onFocus={() => focus("cover")}
        onClose={() => close("cover")}
      >
        <div className={styles.cover}>
          <Cutout
            aesthetic={SLUG}
            slot="vapor_dolphin"
            pick={track}
            height={230}
            alt="Dolphin"
            className={styles.coverImg}
          />
        </div>
      </Win95Window>

      {/* control panel */}
      <Win95Window
        title="DISPLAY PROPERTIES"
        state={windows.panel}
        tilt={TILT.panel}
        flat
        onMove={(x, y) => move("panel", x, y)}
        onFocus={() => focus("panel")}
        onClose={() => close("panel")}
      >
        <div className={styles.control}>
          <span>
            <span className={styles.controlLabel}>Scroll speed</span>
            <br />
            <span className={styles.controlHint}>the floor comes to you</span>
          </span>
          <input
            type="range"
            min={0}
            max={40}
            value={Math.round(speed * 10)}
            aria-label="Scroll speed"
            onChange={(e) => setSpeed(Number(e.target.value) / 10)}
            onKeyDown={(e) => e.stopPropagation()}
            style={{ width: 150 }}
          />
        </div>
        <div className={styles.control}>
          <span>
            <span className={styles.controlLabel}>Convergence</span>
            <br />
            <span className={styles.controlHint}>RGB fringing, as intended</span>
          </span>
          <input
            type="range"
            min={0}
            max={60}
            value={Math.round(chroma * 10)}
            aria-label="Convergence"
            onChange={(e) => setChroma(Number(e.target.value) / 10)}
            onKeyDown={(e) => e.stopPropagation()}
            style={{ width: 150 }}
          />
        </div>
        <div className={styles.controlHint} style={{ marginTop: 6 }}>
          Close every window to see what happens.
        </div>
      </Win95Window>

      <div className={styles.hint}>
        drag the title bars · drag the bust · play the tape
      </div>

      {allClosed && (
        <div className={styles.thankyou}>
          <div className={styles.thankyouMain}>THANK YOU FOR PLAYING</div>
          <div className={styles.thankyouSub}>遊んでくれてありがとう</div>
          <div className={styles.thankyouSub}>click anywhere to start again</div>
        </div>
      )}
    </div>
  );
}
