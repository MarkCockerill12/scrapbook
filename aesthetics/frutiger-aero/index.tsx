"use client";

import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useCanvas } from "@/components/CanvasStage";
import { droplet } from "@/lib/audio";
import { AquaIcon, type AquaIconName } from "./AquaIcon";
import { Aquarium, type AquariumHandle } from "./Aquarium";
import { GlossSlider, GlossToggle } from "./Controls";
import styles from "./styles.module.css";

/**
 * Channel 01 — Frutiger Aero.
 *
 * Fiction: AquaOS 2004, a defunct operating system's product tour, still running its
 * demo years after anyone stopped shipping it.
 *
 * The page is a working argument for its own aesthetic: the controls in the panel
 * genuinely drive the environment, so you can turn the gloss off and watch it become
 * ordinary. That's the "tech demo" brief — the aesthetic is the subject, not the skin.
 *
 * Single viewport, no scroll. Everything is in frame.
 */

const W = 1600;
const H = 900;

/** Slider 0..1 -> horizon in px. Higher water = lower horizon number. */
const horizonFor = (level: number) => Math.round(640 - level * 520);
const FLOOD_AT = 0.845;

const TABS = [
  {
    id: "transparency",
    label: "Transparency",
    title: "Everything is made of water and light",
    body: (
      <>
        <p>
          AquaOS surfaces are <strong>physically transparent</strong>. Panels blur and
          saturate what sits behind them rather than dimming it, so colour carries
          through the whole interface.
        </p>
        <p>
          Drag <strong>Frost</strong> to change the blur radius of every panel on
          screen at once — including this one.
        </p>
      </>
    ),
  },
  {
    id: "motion",
    label: "Motion",
    title: "Nothing on screen is ever quite still",
    body: (
      <>
        <p>
          Bubbles rise continuously. <strong>Click anywhere</strong> to release more,
          then run the cursor through them to pop them.
        </p>
        <p>
          Light on the water is generated live, not looped — the caustic bands cross
          each other on their own cycles and never repeat exactly.
        </p>
      </>
    ),
  },
  {
    id: "life",
    label: "Life",
    title: "Put something living in the machine",
    body: (
      <>
        <p>
          The 2004 promise was that a computer could feel like a <strong>window onto
          somewhere warm</strong>. Fish, grass, sky, water, and a great deal of
          optimism.
        </p>
        <p>
          Move the cursor below the waterline. They&apos;re curious at a distance and
          startle when you get close.
        </p>
      </>
    ),
  },
];

const DOCK: { icon: AquaIconName; label: string }[] = [
  { icon: "fish", label: "Reef" },
  { icon: "droplet", label: "Droplet" },
  { icon: "bubble", label: "Bubbles" },
  { icon: "wave", label: "Tide" },
  { icon: "sun", label: "Daylight" },
  { icon: "island", label: "Island" },
];

const TAB_ICON: AquaIconName[] = ["bubble", "wave", "fish"];

export default function FrutigerAero() {
  const { toCanvasSpace } = useCanvas();
  const aquarium = useRef<AquariumHandle>(null);

  const [tab, setTab] = useState(0);
  const [blur, setBlur] = useState(0.45);
  const [level, setLevel] = useState(0.25);
  const [fishOn, setFishOn] = useState(true);
  const [causticsOn, setCausticsOn] = useState(true);
  const [glossOn, setGlossOn] = useState(true);

  const horizon = horizonFor(level);
  const flooded = level > FLOOD_AT;

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const p = toCanvasSpace(e.clientX, e.clientY);
      aquarium.current?.setPointer(p.x, p.y);
    },
    [toCanvasSpace],
  );

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      // Controls own their own clicks; a burst of bubbles every time you nudge a
      // slider would be maddening.
      if ((e.target as HTMLElement).closest("button, [role='slider']")) return;

      const p = toCanvasSpace(e.clientX, e.clientY);
      aquarium.current?.burst(p.x, p.y);
      aquarium.current?.ripple(p.x, p.y);
      droplet(0.85 + Math.random() * 0.5);
    },
    [toCanvasSpace],
  );

  const active = TABS[tab];

  return (
    <div
      className={`${styles.root} ${flooded ? styles.flooded : ""} ${glossOn ? "" : styles.noGloss}`}
      style={
        {
          "--aq-horizon": `${horizon}px`,
          "--aq-blur": `${glossOn ? 4 + blur * 26 : 0}px`,
        } as React.CSSProperties
      }
      onPointerMove={onPointerMove}
      onPointerDown={onPointerDown}
    >
      <div className={styles.sky}>
        <div className={styles.sun} />
        {/* Kept clear of the top-left: the wordmark lives there and white-on-cloud
            made it unreadable. */}
        <div className={styles.cloud} style={{ left: 500, top: 62, width: 300, height: 96 }} />
        <div className={styles.cloud} style={{ left: 980, top: 44, width: 380, height: 112 }} />
        <div className={styles.cloud} style={{ left: 700, top: 186, width: 240, height: 70 }} />
        <div className={styles.cloud} style={{ left: 1320, top: 178, width: 260, height: 78 }} />
        <div className={styles.cloud} style={{ left: 120, top: 258, width: 210, height: 58 }} />

        <svg className={styles.skyline} viewBox="0 0 1600 132" preserveAspectRatio="none">
          <g fill="#ffffff">
            {[
              [40, 54], [96, 84], [150, 38], [212, 96], [276, 62], [340, 108],
              [404, 46], [470, 78], [540, 30], [610, 92], [684, 58], [756, 104],
              [828, 40], [900, 86], [972, 64], [1046, 110], [1120, 48], [1194, 80],
              [1266, 34], [1338, 98], [1412, 56], [1486, 88], [1548, 44],
            ].map(([x, h], i) => (
              <rect key={i} x={x} y={132 - h} width={i % 3 === 0 ? 38 : 26} height={h} />
            ))}
          </g>
        </svg>
      </div>

      <div className={styles.water} />
      <div className={styles.waterline} />

      <Aquarium
        width={W}
        height={H}
        horizon={horizon}
        handleRef={aquarium}
        fishEnabled={fishOn}
        causticsEnabled={causticsOn}
      />

      <div className={styles.wordmark}>
        <div className={styles.wordmarkTitle}>
          Aqua<b>OS</b>
        </div>
        <div className={styles.wordmarkSub}>Product tour · build 2004.11</div>
      </div>

      {/* ---- main stage ---- */}
      <section className={`${styles.glass} ${styles.stage}`}>
        <header className={styles.stageHead}>
          <h1 className={styles.stageTitle}>{active.title}</h1>
          <span className={styles.stageStep}>
            {tab + 1} / {TABS.length}
          </span>
        </header>

        <div className={styles.stageBody}>
          <div className={styles.stageCopy}>
            {active.body}
            <p className={styles.readout}>
              Frost {Math.round(blur * 100)}% · Water {Math.round(level * 100)}% ·
              Gloss {glossOn ? "on" : "off"}
            </p>
          </div>

          <div className={styles.preview}>
            <AquaIcon name={TAB_ICON[tab]} size={112} />
          </div>
        </div>

        <nav className={styles.tabs}>
          {TABS.map((t, i) => (
            <button
              key={t.id}
              type="button"
              className={`${styles.tab} ${i === tab ? styles.tabActive : ""}`}
              onClick={() => setTab(i)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </section>

      {/* ---- control panel ---- */}
      <aside className={`${styles.glass} ${styles.panel}`}>
        <div className={styles.panelTitle}>Display properties</div>

        <div className={styles.row}>
          <div>
            <div className={styles.rowLabel}>Frost</div>
            <div className={styles.rowHint}>Panel blur radius</div>
          </div>
          <GlossSlider value={blur} onChange={setBlur} label="Frost" />
        </div>

        <div className={styles.row}>
          <div>
            <div className={styles.rowLabel}>Water level</div>
            <div className={styles.rowHint}>
              {flooded ? "⚠ Above the horizon" : "Raise to flood"}
            </div>
          </div>
          <GlossSlider value={level} onChange={setLevel} label="Water level" />
        </div>

        <div className={styles.row}>
          <div>
            <div className={styles.rowLabel}>Specular gloss</div>
            <div className={styles.rowHint}>Turn it off to see what it&apos;s doing</div>
          </div>
          <GlossToggle on={glossOn} onChange={setGlossOn} label="Specular gloss" />
        </div>

        <div className={styles.row}>
          <div>
            <div className={styles.rowLabel}>Marine life</div>
            <div className={styles.rowHint}>{fishOn ? "14 present" : "Tank empty"}</div>
          </div>
          <GlossToggle on={fishOn} onChange={setFishOn} label="Marine life" />
        </div>

        <div className={styles.row}>
          <div>
            <div className={styles.rowLabel}>Caustics</div>
            <div className={styles.rowHint}>Light on the water</div>
          </div>
          <GlossToggle on={causticsOn} onChange={setCausticsOn} label="Caustics" />
        </div>
      </aside>

      {/* ---- dock ---- */}
      <nav className={`${styles.glass} ${styles.dock}`}>
        {DOCK.map(({ icon, label }, i) => (
          <button
            key={icon}
            type="button"
            className={styles.dockIcon}
            style={{
              // Hue stays inside the aqua band. Letting it run free drifted the last
              // two icons into violet, which broke the palette.
              background: `linear-gradient(180deg, hsla(${188 + i * 6}, 92%, 70%, .95), hsla(${202 + i * 6}, 88%, 42%, .95))`,
            }}
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              const p = toCanvasSpace(r.left + r.width / 2, r.top);
              aquarium.current?.burst(p.x, p.y, 14);
              droplet(1.1 + i * 0.08);
            }}
          >
            <AquaIcon name={icon} size={32} />
            <span className={styles.dockLabel}>{label}</span>
          </button>
        ))}
      </nav>

      <div className={styles.hint}>
        Click anywhere to release bubbles · pop them with the cursor
      </div>
    </div>
  );
}
