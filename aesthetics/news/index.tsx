"use client";

import { useEffect, useMemo, useState } from "react";
import { AESTHETICS } from "@/lib/registry";
import { sbGet, sbSet } from "@/lib/storage";
import { useShell } from "@/lib/store";
import { Radar } from "./Radar";
import { alarm, cut, easTone, jingle, startAir, sting } from "./sound";
import styles from "./styles.module.css";

/**
 * Channel 22 — Channel 7 Action News.
 *
 * Fiction: *CHANNEL 7 ACTION NEWS at 6 — with your weather.* You are in the gallery;
 * the 4:3 signal is on the wall in front of you and the strips either side are your
 * vision mixer.
 *
 * The demo argument: 1998 broadcast graphics are a **character generator with two
 * effects** — a bevel and a hard drop shadow — applied to everything, in condensed
 * italic, over hard-keyed colour. No soft alpha, no smooth gradients, no rounded
 * corners. Every one of those is a later idea and any single one of them breaks it.
 *
 * No assets.
 */

const SLUG = "news";
type Source = "news" | "weather" | "commercial" | "eas";

const HEADLINES = [
  "COUNCIL VOTES 4–3 TO KEEP THE FOUNTAIN SWITCHED OFF THROUGH WINTER",
  "MYSTERY LIGHTS OVER THE RESERVOIR — VIEWER FOOTAGE AT ELEVEN",
  "NORTHGATE CENTRE ANNOUNCES SIXTH CLOSURE THIS QUARTER",
  "LOCAL MAN BUILDS TWENTY-THREE WEBSITES, WILL NOT SAY WHY",
  "SCHOOL DISTRICT ADOPTS NEW COMPUTER LAB, PARENTS SPLIT",
  "TRAFFIC ON THE 7 STILL BAD, STUDY CONFIRMS",
];

export default function News() {
  const muted = useShell((s) => s.muted);
  const visited = useShell((s) => s.visited);

  const [source, setSource] = useState<Source>("weather");
  const [frame, setFrame] = useState(12);
  const [chroma, setChroma] = useState(false);
  const [breaking, setBreaking] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [extra, setExtra] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [clock, setClock] = useState<string | null>(null);

  useEffect(() => {
    setName(sbGet<string>(SLUG, "name", "YOUR NAME HERE"));
    setRole(sbGet<string>(SLUG, "role", "Reporting live"));
    setExtra(sbGet<string[]>(SLUG, "headlines", []));
    sting();
  }, []);

  useEffect(() => {
    if (muted) return;
    return startAir();
  }, [muted]);

  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }),
      );
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  /* The radar runs itself when you aren't scrubbing it. */
  useEffect(() => {
    if (source !== "weather") return;
    const id = window.setInterval(() => setFrame((f) => (f + 1) % 48), 420);
    return () => window.clearInterval(id);
  }, [source]);

  const ticker = useMemo(() => {
    const live = AESTHETICS.filter((a) => a.status === "live").length;
    return [
      ...extra,
      ...HEADLINES,
      `${visited.length} OF ${AESTHETICS.length} CHANNELS VIEWED THIS SESSION`,
      `${live} CHANNELS CURRENTLY BROADCASTING`,
    ];
  }, [extra, visited.length]);

  const go = (next: Source) => {
    cut();
    setSource(next);
    if (next === "commercial") jingle();
    if (next === "eas") easTone();
  };

  const persist = (key: string, value: unknown) => sbSet(SLUG, key, value);

  return (
    <div className={styles.root}>
      {/* ------------------------------------------------ the signal */}
      <div className={styles.signal}>
        <Radar frame={frame} chroma={chroma && source === "weather"} />

        {(source === "news" || source === "weather") && (
          <>
            {source === "news" && (
              <svg
                className={styles.anchor}
                width="360"
                height="470"
                viewBox="0 0 440 560"
                aria-hidden
              >
                {/*
                  Faceless on purpose — a rendered face is uncanny at this size. But
                  NOT a black silhouette: the weather wall behind is already dark
                  navy, so a dark figure disappears into it. This one is lit, the way
                  a real anchor is: key light from camera left, rim from the wall.
                */}
                <ellipse cx="220" cy="126" rx="82" ry="94" fill="#c69a76" />
                <path d="M138 96a82 60 0 0 1 164 0 82 76 0 0 0-164 0z" fill="#3b2b20" />
                <rect x="188" y="196" width="64" height="60" fill="#a97f5f" />
                <path d="M60 560c0-168 72-296 160-296s160 128 160 296z" fill="#2c4270" />
                <path d="M180 268l40 116 40-116-40-16z" fill="#e8eef8" />
                <path d="M214 286l6 104 8-104-7-10z" fill="#b02a2a" />
                <path
                  d="M60 560c0-168 72-296 160-296"
                  stroke="#6f92cc"
                  strokeWidth="6"
                  fill="none"
                  opacity="0.55"
                />
              </svg>
            )}

            <div className={styles.desk}>
              <span className={styles.deskLogo}>7</span>
            </div>

            <div className={styles.bug}>
              <span className={styles.bugSeven}>7</span>
              <span className={styles.bugText}>
                ACTION NEWS
                <br />
                <span className={styles.live}>● LIVE</span> {clock ?? "--:--:--"}
              </span>
            </div>

            {breaking && <div className={styles.breaking}>BREAKING NEWS</div>}

            <div className={styles.lower}>
              <div className={styles.lowerMain}>
                <span className={styles.lowerFlag} />
                <div className={styles.lowerBody}>
                  <input
                    className={styles.lowerName}
                    value={name}
                    placeholder="YOUR NAME HERE"
                    aria-label="Lower third name"
                    onChange={(e) => {
                      setName(e.target.value.toUpperCase());
                      persist("name", e.target.value.toUpperCase());
                    }}
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                  <input
                    className={styles.lowerRole}
                    value={role}
                    placeholder="Reporting live"
                    aria-label="Lower third role"
                    onChange={(e) => {
                      setRole(e.target.value);
                      persist("role", e.target.value);
                    }}
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
              <span className={styles.lowerStrap}>
                {source === "weather" ? "STORM TEAM 7 · DOPPLER" : "AT 6"}
              </span>
            </div>

            <div className={styles.ticker}>
              <span className={styles.tickerBadge}>ACTION 7</span>
              <span className={styles.tickerTrack}>
                <span className={styles.tickerRun}>
                  {ticker.map((t, i) => (
                    <span key={i} className={styles.tickerItem}>
                      <span className={styles.tickerDot}>◆ </span>
                      {t}
                    </span>
                  ))}
                </span>
              </span>
            </div>
          </>
        )}

        {source === "commercial" && (
          <div className={styles.commercial}>
            <div className={styles.adTitle}>CARPET DEPOT</div>
            <div className={styles.adLine}>NO MONEY DOWN · NO INTEREST · NO KIDDING</div>
            <div className={styles.adLine}>OPEN SUNDAYS BY THE OLD MALL</div>
            <div className={styles.adPhone}>555-0142</div>
            <div className={styles.adSmall}>
              Offer subject to credit approval. Interest accrues from date of purchase
              if balance is not paid in full within 90 days. Carpet Depot is not
              responsible for carpet.
            </div>
          </div>
        )}

        {source === "eas" && (
          <div className={styles.eas}>
            <div className={styles.bars}>
              {["#c0c0c0", "#c0c000", "#00c0c0", "#00c000", "#c000c0", "#c00000", "#0000c0"].map(
                (c) => (
                  <span key={c} style={{ background: c }} />
                ),
              )}
            </div>
            <div className={styles.easText}>
              THE EMERGENCY ALERT SYSTEM HAS BEEN ACTIVATED FOR THIS AREA.
              <br />
              ALL CHANNELS ARE AFFECTED. DO NOT ADJUST YOUR SET.
              <br />
              THIS IS ONLY A TEST OF THE SYSTEM. HAD THIS BEEN AN ACTUAL EMERGENCY YOU
              WOULD HAVE BEEN INSTRUCTED WHERE TO GO.
              <br />
              NORMAL PROGRAMMING WILL RESUME WHEN YOU CUT BACK.
            </div>
          </div>
        )}

        <div className={styles.interlace} />
        <div className={styles.softness} />
      </div>

      {/* ------------------------------------------------ left gallery */}
      <aside className={styles.gallery} style={{ left: 0 }}>
        <div className={styles.galleryTitle}>Sources</div>
        {(
          [
            ["weather", "Weather wall"],
            ["news", "Studio cam"],
            ["commercial", "Go to break"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`${styles.src} ${source === id ? styles.srcOn : ""}`}
            onClick={() => go(id)}
          >
            {label}
          </button>
        ))}

        <div className={styles.galleryTitle} style={{ marginTop: 22 }}>
          Live
        </div>
        <button
          type="button"
          className={`${styles.src} ${breaking ? styles.srcHot : ""}`}
          onClick={() => {
            setBreaking((b) => !b);
            if (!breaking) alarm();
          }}
        >
          Breaking
        </button>
        <button
          type="button"
          className={`${styles.src} ${source === "eas" ? styles.srcHot : ""}`}
          onClick={() => go(source === "eas" ? "weather" : "eas")}
        >
          EAS test
        </button>

        <div className={styles.clockBox}>
          <div className={styles.clockTime}>{clock ?? "--:--:--"}</div>
          <div className={styles.clockLabel}>on air</div>
        </div>

        <div className={styles.small}>
          Type straight into the lower third. It sticks.
        </div>
      </aside>

      {/* ------------------------------------------------ right gallery */}
      <aside className={styles.gallery} style={{ right: 0 }}>
        <div className={styles.galleryTitle}>Doppler</div>
        <input
          type="range"
          className={styles.slider}
          min={0}
          max={47}
          value={frame}
          aria-label="Radar timeline"
          onChange={(e) => setFrame(Number(e.target.value))}
          onKeyDown={(e) => e.stopPropagation()}
        />
        <div className={styles.small}>
          T−{String(47 - frame).padStart(2, "0")} · scrub it, it rewinds properly
        </div>

        <button
          type="button"
          className={`${styles.src} ${chroma ? styles.srcOn : ""}`}
          style={{ marginTop: 14 }}
          onClick={() => {
            setChroma((c) => !c);
            cut();
          }}
        >
          Chroma key
        </button>

        <div className={styles.galleryTitle} style={{ marginTop: 22 }}>
          Ticker
        </div>
        <input
          className={styles.field}
          value={draft}
          placeholder="Add a headline"
          aria-label="Add a headline"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter" && draft.trim()) {
              const next = [draft.trim().toUpperCase(), ...extra].slice(0, 8);
              setExtra(next);
              persist("headlines", next);
              setDraft("");
              cut();
            }
          }}
        />
        <div className={styles.small}>
          Enter to run it. Yours go first, and they are still there tomorrow.
        </div>
      </aside>
    </div>
  );
}
