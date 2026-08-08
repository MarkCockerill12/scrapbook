"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Cutout } from "@/primitives/Cutout";
import { chime, tone } from "@/lib/audio";
import { count } from "@/lib/assets";
import { AESTHETICS, neighbour } from "@/lib/registry";
import { useShell } from "@/lib/store";
import { sbGet, sbSet } from "@/lib/storage";
import styles from "./styles.module.css";

/**
 * Channel 02 — Early Internet.
 *
 * Fiction: ZACK'S UFO & PARANORMAL HOMEPAGE, last updated 1999, still counting
 * visitors.
 *
 * This page's comedy is DENSITY — it needs hundreds of real artefacts, not forty
 * hand-made approximations, which is why the 88x31 badge archive was worth harvesting
 * separately. The badges are real ones scraped from the wild; that authenticity is
 * doing more work here than any amount of CSS could.
 *
 * Single viewport, and deliberately no scroll: the page LOOKS like it should scroll
 * and doesn't, which is funnier than letting it.
 */

const AESTHETIC = "early-internet";

const NAV = [
  "Home",
  "About Me",
  "UFO Pics!!",
  "Area 51",
  "My Theories",
  "Links",
  "Sign Guestbook",
  "E-mail Me",
];

const TICKER =
  "*** WELCOME TO MY HOMEPAGE *** THIS SITE IS BEST VIEWED IN NETSCAPE NAVIGATOR 4.0 AT 800x600 *** " +
  "NEW: added 14 pics to the UFO gallery !!! *** SIGN MY GUESTBOOK BEFORE YOU LEAVE *** " +
  "THE TRUTH IS OUT THERE *** this page has been under construction since 1997 *** ";

/**
 * A 1997 guestbook that had been up for two years would be FULL. Four entries left a
 * black void that read as a broken layout rather than a period one — the density is
 * the joke here, same as the badge walls.
 */
const SEED_GUESTBOOK = [
  { name: "webmaster_dave", text: "cool page man!! check out mine sometime" },
  { name: "TRUTHSEEKER99", text: "the government doesnt want you to see this" },
  { name: "sk8rboi", text: "how did u make the text rainbow??" },
  { name: "Aunt Carol", text: "Zachary this is very nice. Call your mother." },
  { name: "xXx_mulder_xXx", text: "I WANT TO BELIEVE" },
  { name: "jenny_1985", text: "hi zack its jenny from bio. nice site lol" },
  { name: "PC_GAMER_2000", text: "your page crashed my netscape. fix it" },
  { name: "anonymous", text: "i saw one too. over the field behind my house. nobody believes me" },
  { name: "Mr. Halloran", text: "Zachary — this was not the assignment. See me Monday. B-" },
  { name: "linkexchange", text: "GET 1000 FREE HITS!!! CLICK HERE NOW!!!" },
  { name: "dial_up_dan", text: "took 4 minutes to load but worth it" },
  { name: "SkepticalSam", text: "thats obviously a frisbee" },
  { name: "zack (me)", text: "testing testing does this work" },
  { name: "GeoCities Staff", text: "Your page has exceeded its bandwidth allocation." },
  { name: "cyberpunk1994", text: "the truth is out there my dude" },
];

const GB_COLOURS = ["#00ff00", "#ffff00", "#ff00ff", "#00ffff", "#ff8800", "#ffffff"];
const GB_FONTS = ["'Comic Sans MS', cursive", "'Times New Roman', serif", "Arial, sans-serif"];

interface Entry {
  name: string;
  text: string;
}

export default function EarlyInternet() {
  const begin = useShell((s) => s.beginTransition);

  const [visits, setVisits] = useState(0);
  const [entries, setEntries] = useState<Entry[]>(SEED_GUESTBOOK);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [brokenClicks, setBrokenClicks] = useState(0);
  const [secret, setSecret] = useState(false);
  const gbRef = useRef<HTMLDivElement>(null);

  const badgeCount = count(AESTHETIC, "earlynet_button");

  // Hydration-safe: the counter and stored guestbook both read localStorage, which
  // doesn't exist on the server. Both load in an effect, after hydration has settled.
  useEffect(() => {
    const next = sbGet<number>(AESTHETIC, "visits", 12043) + 1;
    sbSet(AESTHETIC, "visits", next);
    setVisits(next);
    setEntries([...SEED_GUESTBOOK, ...sbGet<Entry[]>(AESTHETIC, "guestbook", [])]);
  }, []);

  const sign = useCallback(() => {
    const n = name.trim() || "anonymous";
    const t = text.trim();
    if (!t) return;
    const mine = sbGet<Entry[]>(AESTHETIC, "guestbook", []);
    const next = [...mine, { name: n, text: t }];
    sbSet(AESTHETIC, "guestbook", next);
    setEntries([...SEED_GUESTBOOK, ...next]);
    setName("");
    setText("");
    chime(true);
    requestAnimationFrame(() => {
      if (gbRef.current) gbRef.current.scrollTop = gbRef.current.scrollHeight;
    });
  }, [name, text]);

  const digits = useMemo(() => String(visits).padStart(6, "0").split(""), [visits]);

  const onBroken = () => {
    const n = brokenClicks + 1;
    setBrokenClicks(n);
    tone({ freq: 200 + n * 90, duration: 0.08, type: "square", gain: 0.06 });
    if (n >= 5) setSecret(true);
  };

  return (
    <div className={styles.root}>
      <div className={styles.stars} />

      <div className={styles.layout}>
        {/* ---------------- header ---------------- */}
        <header className={styles.header}>
          <h1 className={styles.title}>
            ☆ ZACK&apos;S UFO &amp; PARANORMAL HOMEPAGE ☆
          </h1>
          <div className={styles.subtitle}>
            v3.0 &nbsp;|&nbsp; last updated 11/23/99 &nbsp;|&nbsp;{" "}
            <span className={styles.blink} style={{ color: "#ff4444" }}>
              NEW!!
            </span>{" "}
            &nbsp;|&nbsp; best viewed in Netscape 4
          </div>
          <div className={styles.marquee}>
            <div className={styles.marqueeInner}>{TICKER.repeat(2)}</div>
          </div>
        </header>

        {/* ---------------- left nav ---------------- */}
        <aside>
          <div className={styles.box} style={{ marginBottom: 10 }}>
            <div className={styles.boxTitle}>~ NAVIGATION ~</div>
            <nav className={styles.navList}>
              {NAV.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  className={`${styles.navBtn} ${i === 2 ? styles.navBtnHot : ""}`}
                  onClick={() => tone({ freq: 900, duration: 0.04, type: "square", gain: 0.05 })}
                >
                  {i === 2 ? "► " : "» "}
                  {label}
                  {i === 2 ? " ★" : ""}
                </button>
              ))}
            </nav>
          </div>

          <div
            className={styles.box}
            style={{ display: "flex", flexDirection: "column", height: 300 }}
          >
            <div className={styles.boxTitle}>MY AWARDS</div>
            <div className={styles.badgeWall} style={{ flex: 1, minHeight: 0 }}>
              {Array.from({ length: Math.min(18, badgeCount) }).map((_, i) => (
                <Cutout
                  key={i}
                  aesthetic={AESTHETIC}
                  slot="earlynet_button"
                  pick={i}
                  width={88}
                  height={31}
                  alt=""
                  className={styles.badge}
                  priority={i < 8}
                />
              ))}
            </div>
          </div>
        </aside>

        {/* ---------------- main ---------------- */}
        <main className={styles.main}>
          <div className={styles.box} style={{ flex: "0 0 auto" }}>
            <div className={styles.boxTitle}>WELCOME TO MY PAGE!!!</div>
            <p className={styles.welcome}>
              Hi my name is Zack and this is my page about <b>UFOs</b> and other{" "}
              <i>unexplained phenomena</i>. I have been researching this stuff since I
              was 11. Everything on this page is <b>100% TRUE</b> and I have the photos
              to prove it (see UFO Pics!!).
            </p>
            <div className={styles.hr} style={{ margin: "8px 0" }} />
            <p className={styles.welcome} style={{ fontSize: 13 }}>
              <span className={styles.blink} style={{ color: "#ff4444" }}>
                ⚠
              </span>{" "}
              This image was supposed to load but my host deleted it{" "}
              <button
                type="button"
                className={styles.broken}
                onClick={onBroken}
                title="broken image"
                aria-label="broken image"
              >
                ✖
              </button>{" "}
              <span className={styles.small} style={{ display: "inline" }}>
                (sorry!!)
              </span>
            </p>
          </div>

          <div
            className={styles.box}
            style={{ flex: "1 1 auto", minHeight: 0, display: "flex", flexDirection: "column" }}
          >
            <div className={styles.boxTitle}>*** SIGN MY GUESTBOOK ***</div>

            <div className={styles.gbList} ref={gbRef}>
              {entries.map((e, i) => (
                <div
                  key={i}
                  className={styles.gbEntry}
                  style={{
                    color: GB_COLOURS[i % GB_COLOURS.length],
                    fontFamily: GB_FONTS[i % GB_FONTS.length],
                  }}
                >
                  <b>{e.name}</b> wrote: {e.text}
                </div>
              ))}
            </div>

            <div className={styles.gbForm}>
              <input
                className={styles.gbInput}
                placeholder="your name"
                value={name}
                maxLength={24}
                onChange={(e) => setName(e.target.value)}
                style={{ flex: "0 0 130px" }}
              />
              <input
                className={styles.gbInput}
                placeholder="say something!!"
                value={text}
                maxLength={120}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter") sign();
                }}
              />
              <button type="button" className={styles.gbSubmit} onClick={sign}>
                SIGN!
              </button>
            </div>
            <div className={styles.small} style={{ marginTop: 4 }}>
              {entries.length} people have signed. it saves for real.
            </div>
          </div>
        </main>

        {/* ---------------- right rail ---------------- */}
        <aside>
          <div className={styles.box} style={{ marginBottom: 10 }}>
            <div className={styles.boxTitle}>VISITORS</div>
            <div className={styles.counter}>
              {digits.map((d, i) => (
                <span key={i} className={styles.counterDigit}>
                  {d}
                </span>
              ))}
            </div>
            <div className={styles.small}>you are visitor #{visits}</div>
            <div className={styles.underConstruction} style={{ marginTop: 8 }}>
              🚧 UNDER CONSTRUCTION 🚧
            </div>
          </div>

          <div
            className={styles.box}
            style={{ display: "flex", flexDirection: "column", height: 470 }}
          >
            <div className={styles.boxTitle}>COOL LINKS</div>
            <div className={styles.badgeWall} style={{ flex: 1, minHeight: 0 }}>
              {Array.from({ length: Math.min(27, badgeCount) }).map((_, i) => (
                <Cutout
                  key={i}
                  aesthetic={AESTHETIC}
                  slot="earlynet_button"
                  pick={i + 40}
                  width={88}
                  height={31}
                  alt=""
                  className={styles.badge}
                />
              ))}
            </div>
          </div>
        </aside>

        {/* ---------------- webring ---------------- */}
        <div className={styles.webring}>
          <button
            type="button"
            className={styles.webringBtn}
            onClick={() => begin(neighbour("early-internet", -1).slug)}
          >
            ◄◄ PREV
          </button>
          <span>
            <span className={styles.blink}>★</span> You are visiting site{" "}
            <b>2</b> of <b>{AESTHETICS.length}</b> in the{" "}
            <b style={{ color: "#ffff00" }}>SCRAPBOOK WEBRING</b>{" "}
            <span className={styles.blink}>★</span>
          </span>
          <button
            type="button"
            className={styles.webringBtn}
            onClick={() => begin(neighbour("early-internet", 1).slug)}
          >
            NEXT ►►
          </button>
        </div>
      </div>

      {secret && (
        <div className={styles.secret}>
          <div>
            <div className={styles.secretTitle}>YOU FOUND THE SECRET PAGE</div>
            <p style={{ fontSize: 15, lineHeight: 1.7 }}>
              nobody was ever supposed to click a broken image five times.
              <br />
              <br />
              there are <b>{AESTHETICS.length}</b> channels. you have found{" "}
              <b>{useShell.getState().visited.length}</b> of them.
              <br />
              <br />
              <span className={styles.blink}>the truth is out there</span>
            </p>
            <button
              type="button"
              className={styles.webringBtn}
              style={{ marginTop: 30 }}
              onClick={() => {
                setSecret(false);
                setBrokenClicks(0);
              }}
            >
              take me back
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
