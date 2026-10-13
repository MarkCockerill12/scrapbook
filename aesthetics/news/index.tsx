"use client";

import { useMusic } from "@/lib/music";
import { bed } from "./music";
import { useEffect, useMemo, useState } from "react";
import { src } from "@/lib/assets";
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
 * Fleshed out 2026-09-28 (Mark: "cool but could be fleshed out more"): real feeds.
 * Studio cam is a real (empty) news set; SKY 7 is a real aerial of the city at dusk,
 * hand-held shake and rotor noise; three real traffic cams; a real satellite loop of
 * a hurricane with the forecast cone; the five-day board; the sports desk. The
 * gallery strips sit over a real control-room photo. The drawn anchor is gone.
 */

const SLUG = "news";
type Source = "news" | "weather" | "commercial" | "eas" | "sky" | "traffic" | "sat" | "fiveday" | "sports";

const HEADLINES = [
  "COUNCIL VOTES 4–3 TO KEEP THE FOUNTAIN SWITCHED OFF THROUGH WINTER",
  "MYSTERY LIGHTS OVER THE RESERVOIR — VIEWER FOOTAGE AT ELEVEN",
  "NORTHGATE CENTRE ANNOUNCES SIXTH CLOSURE THIS QUARTER",
  "LOCAL MAN BUILDS TWENTY-THREE WEBSITES, WILL NOT SAY WHY",
  "SCHOOL DISTRICT ADOPTS NEW COMPUTER LAB, PARENTS SPLIT",
  "TRAFFIC ON THE 7 STILL BAD, STUDY CONFIRMS",
];

export default function News() {
  useMusic(bed, 112, true, 2);
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
  const [cam, setCam] = useState(0);

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
    if (next === "traffic") setCam((c) => (source === "traffic" ? (c + 1) % 3 : c));
  };

  const persist = (key: string, value: unknown) => sbSet(SLUG, key, value);

  return (
    <div className={styles.root}>
      <img className={styles.control} src={src(SLUG, "news_camera", 2)} alt="" />
      {/* ------------------------------------------------ the signal */}
      <div className={styles.signal}>
        <Radar frame={frame} chroma={chroma && source === "weather"} />
        <Feeds source={source} cam={cam} />

        {source !== "commercial" && source !== "eas" && (
          <>
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
                {STRAP[source] ?? "AT 6"}
              </span>
            </div>

            <div className={styles.ticker}>
              <span className={styles.tickerBadge}>ACTION 7</span>
              <span className={styles.tickerTrack}>
                {/*
                 * Keyed on the number of user headlines so adding one remounts the
                 * track and restarts the 46s scroll. Re-rendering alone left the CSS
                 * animation mid-cycle, so a headline inserted at the front had already
                 * scrolled past — you'd wait most of a minute for proof it worked, and
                 * conclude it hadn't.
                 */}
                <span className={styles.tickerRun} key={extra.length}>
                  {/* Twice — the second copy is what the -50% loop lands on. */}
                  {[0, 1].map((copy) =>
                    ticker.map((t, i) => (
                      <span
                        key={`${copy}-${i}`}
                        className={styles.tickerItem}
                        aria-hidden={copy === 1 || undefined}
                      >
                        <span className={styles.tickerDot}>◆ </span>
                        {t}
                      </span>
                    )),
                  )}
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
            ["news", "Studio cam"],
            ["weather", "Weather wall"],
            ["sat", "Satellite"],
            ["fiveday", "5-day forecast"],
            ["sky", "SKY 7 chopper"],
            ["traffic", "Traffic cams"],
            ["sports", "Sports desk"],
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
      </aside>
    </div>
  );
}

const STRAP: Partial<Record<Source, string>> = {
  weather: "STORM TEAM 7 · DOPPLER",
  sat: "STORM TEAM 7 · HURRICANE DORIS",
  fiveday: "STORM TEAM 7 · 5-DAY",
  sky: "LIVE · SKY 7 OVER DOWNTOWN",
  traffic: "TRAFFIC ON THE 7s",
  sports: "SPORTS WITH GARY",
  news: "ACTION NEWS AT 6",
};

const DAYS = [
  { d: "MON", hi: 71, lo: 58, sky: "☀", note: "SUNNY" },
  { d: "TUE", hi: 68, lo: 55, sky: "⛅", note: "PARTLY" },
  { d: "WED", hi: 63, lo: 52, sky: "🌧", note: "SHOWERS" },
  { d: "THU", hi: 59, lo: 49, sky: "⛈", note: "T-STORMS" },
  { d: "FRI", hi: 66, lo: 51, sky: "☀", note: "CLEARING" },
];

const SCORES = [
  ["HAWKS", 24, "BEARS", 17, "FINAL"],
  ["NORTHGATE HS", 35, "WESTSIDE", 34, "FINAL/OT"],
  ["COMETS", 3, "RIVERDOGS", 5, "7TH"],
  ["STORM", 88, "ROCKETS", 91, "4TH 0:12"],
] as const;

/** The non-weather feeds — real photographs, keyed under the same CG. */
function Feeds({ source, cam }: { source: Source; cam: number }) {
  if (source === "news")
    return (
      <div className={styles.feed}>
        <img src={src(SLUG, "nw_anchor", 1)} alt="The Channel 7 set" />
        <span className={styles.feedNote}>ANCHOR STEPPED AWAY · BACK IN 2</span>
      </div>
    );
  if (source === "sky")
    return (
      <div className={styles.feed}>
        <img className={styles.shake} src={src(SLUG, "nw_chopper", 1)} alt="Aerial of downtown" />
        <span className={styles.camId}>SKY 7 · CAM 1 · ALT 1,200 FT</span>
      </div>
    );
  if (source === "traffic") {
    const n = [6, 4, 1][cam];
    return (
      <div className={styles.feed}>
        <img className={styles.still} src={src(SLUG, "nw_traffic", n)} alt="Traffic camera" />
        <span className={styles.camId}>
          DOT CAM {12 + cam * 7} · I-7 {["NB @ EXIT 14", "SB @ RIVER BRIDGE", "EB @ NORTHGATE"][cam]} · click again for next cam
        </span>
      </div>
    );
  }
  if (source === "sat")
    return (
      <div className={styles.feed}>
        <img className={styles.spin} src={src(SLUG, "nw_sat", 1)} alt="Hurricane satellite image" />
        <svg className={styles.cone} viewBox="0 0 1000 750" aria-hidden>
          <path d="M470 380 C 520 300, 610 220, 720 90 L 900 150 C 760 250, 640 330, 520 420 Z" fill="rgba(255,255,255,.18)" stroke="#fff" strokeWidth="4" strokeDasharray="14 10" />
          {[[470, 380], [560, 300], [650, 220], [740, 150]].map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="16" fill="#e8141b" stroke="#fff" strokeWidth="4" />
              <text x={x + 24} y={y + 8} fill="#fff" fontSize="26" fontFamily="Arial Black" fontStyle="italic">
                {["NOW", "8PM", "2AM", "8AM"][i]}
              </text>
            </g>
          ))}
        </svg>
        <div className={styles.satBox}>
          <b>HURRICANE DORIS</b>
          <span>CATEGORY 3 · 120 MPH · MOVING NNE 12</span>
        </div>
      </div>
    );
  if (source === "fiveday")
    return (
      <div className={styles.five}>
        <h3>STORM TEAM 7 · 5-DAY FORECAST</h3>
        <div className={styles.fiveRow}>
          {DAYS.map((d) => (
            <div key={d.d} className={styles.day}>
              <b>{d.d}</b>
              <i>{d.sky}</i>
              <em>{d.note}</em>
              <span>
                <strong>{d.hi}°</strong> {d.lo}°
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  if (source === "sports")
    return (
      <div className={styles.sports}>
        <h3>SPORTS SCOREBOARD</h3>
        {SCORES.map(([a, as, b, bs, st]) => (
          <div key={a} className={styles.scoreRow}>
            <span className={as > bs ? styles.win : ""}>{a}</span>
            <b>{as}</b>
            <span className={bs > as ? styles.win : ""}>{b}</span>
            <b>{bs}</b>
            <em>{st}</em>
          </div>
        ))}
      </div>
    );
  return null;
}
