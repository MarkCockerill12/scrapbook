"use client";

import { useMusic } from "@/lib/music";
import { tracker } from "./music";
import { useCallback, useEffect, useRef, useState } from "react";
import { tone } from "@/lib/audio";
import { AESTHETICS } from "@/lib/registry";
import { useShell } from "@/lib/store";
import { sbGet, sbSet } from "@/lib/storage";
import styles from "./styles.module.css";

/**
 * Channel 16 — BBS / Teletext.
 *
 * Fiction: THE ATTIC BBS, one node, 1987. You dialled in and you are the only caller.
 *
 * Deliberately NOT the Matrix channel in another palette. That one is cinematic
 * hacking; this is what a modem actually connected to — a hard 80x25 character grid,
 * the flat 16-colour ANSI palette, numbered menus, no pointer, and text that arrives
 * at baud rate.
 *
 * The baud rate is the whole sensation of the era and it's adjustable here, including
 * down to a genuinely agonising 300. Making that a toy rather than hiding it is the
 * "tech demo" brief for this aesthetic.
 *
 * No assets. Every glyph is drawn from the character set.
 */

const AESTHETIC = "bbs";
const COLS = 80;

/** Characters per second at each rate. 8 bits + start/stop = ~10 bits per char. */
const BAUD = [300, 1200, 2400, 9600, 19200] as const;

type Screen = "connecting" | "menu" | "bulletins" | "messages" | "post" | "channels" | "door" | "sysop";

interface Msg {
  from: string;
  subject: string;
  body: string;
}

const SEED_MSGS: Msg[] = [
  { from: "SYSOP", subject: "WELCOME TO THE ATTIC", body: "New users: please be civil. One node, so don't hog it. No warez." },
  { from: "NIGHTCRAWLER", subject: "RE: modem trouble", body: "Try ATZ then ATDT again. Worked for me. Your init string is probably wrong." },
  { from: "BLUEBOX", subject: "anyone still on at 3am", body: "board is dead. hello? is this thing on" },
  { from: "M.CHEN", subject: "FOR SALE: 2400 baud", body: "Hayes compatible, boxed, works fine. $40 or trade for RAM." },
  { from: "SYSOP", subject: "DOWNTIME SUNDAY", body: "Taking the board down 2-4pm to add a second drive. 40MB!" },
  { from: "GHOST_", subject: "does anyone else see it", body: "there is a file in the message base that i did not post and cannot delete." },
];

/**
 * 5x5 block font, composed at runtime.
 *
 * Hand-drawing the banner with half-block characters produced letterforms that read
 * as "THE ATTE" — the shapes were wrong and the columns didn't line up. A real board's
 * ANSI art was built from a character grid, so building it from one here is both more
 * authentic and impossible to misalign.
 */
const GLYPHS: Record<string, string[]> = {
  A: ["01110", "10001", "11111", "10001", "10001"],
  B: ["11110", "10001", "11110", "10001", "11110"],
  C: ["01111", "10000", "10000", "10000", "01111"],
  E: ["11111", "10000", "11110", "10000", "11111"],
  H: ["10001", "10001", "11111", "10001", "10001"],
  I: ["11111", "00100", "00100", "00100", "11111"],
  S: ["01111", "10000", "01110", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100"],
  " ": ["00000", "00000", "00000", "00000", "00000"],
};

function banner(text: string, indent = 4): string[] {
  return [0, 1, 2, 3, 4].map((row) => {
    const line = [...text.toUpperCase()]
      .map((ch) => (GLYPHS[ch] ?? GLYPHS[" "])[row].replace(/1/g, "█").replace(/0/g, " "))
      .join(" ");
    return " ".repeat(indent) + line;
  });
}

const LOGO = [...banner("THE ATTIC"), "", "              B B S   ·   E S T   1 9 8 7"];

export default function BBS() {
  useMusic(tracker, 100);
  const begin = useShell((s) => s.beginTransition);

  const [screen, setScreen] = useState<Screen>("connecting");
  const [lines, setLines] = useState<string[]>([]);
  const [typing, setTyping] = useState(false);
  const [entry, setEntry] = useState("");
  const [baudIdx, setBaudIdx] = useState(3);
  const [msgs, setMsgs] = useState<Msg[]>(SEED_MSGS);
  const [postField, setPostField] = useState<"subject" | "body">("subject");
  const [draft, setDraft] = useState({ subject: "", body: "" });
  const [resync, setResync] = useState(false);
  const [connected, setConnected] = useState(0);

  const timers = useRef<number[]>([]);
  const baud = BAUD[baudIdx];

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  /**
   * Paint lines at the current baud rate. Everything that appears on screen goes
   * through here — instant text would erase the entire point of the channel.
   */
  const emit = useCallback(
    (next: string[], onDone?: () => void) => {
      clearTimers();
      setLines([]);
      setTyping(true);

      const cps = baud / 10;
      let elapsed = 0;

      next.forEach((line, i) => {
        // Each line costs its own length in characters, so long lines genuinely take
        // longer — which is what makes 300 baud feel the way it did.
        elapsed += ((line.length || 1) / cps) * 1000;
        timers.current.push(
          window.setTimeout(() => {
            setLines((prev) => [...prev, line]);
            if (i % 3 === 0) {
              tone({ freq: 1200 + Math.random() * 400, duration: 0.012, type: "square", gain: 0.02 });
            }
            if (i === next.length - 1) {
              setTyping(false);
              onDone?.();
            }
          }, elapsed),
        );
      });

      if (!next.length) {
        setTyping(false);
        onDone?.();
      }
    },
    [baud],
  );

  useEffect(() => () => clearTimers(), []);

  // Load the stored message base after hydration — localStorage doesn't exist on the
  // server, and reading it during render is a mismatch.
  useEffect(() => {
    setMsgs([...SEED_MSGS, ...sbGet<Msg[]>(AESTHETIC, "messages", [])]);
  }, []);

  // Connect sequence.
  useEffect(() => {
    const seq = [
      "ATZ",
      "OK",
      "ATDT 555-0113",
      "",
      "CONNECT 9600",
      "",
      "  Detecting terminal... ANSI",
      "  Node 1 of 1.  You are caller #4,417.",
      "",
    ];
    emit(seq, () => {
      tone({ freq: 900, toFreq: 1800, duration: 0.5, type: "sawtooth", gain: 0.06 });
      window.setTimeout(() => setScreen("menu"), 500);
    });
    setConnected(Date.now());
    // Intentionally once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const MENU = useCallback(
    () => [
      ...LOGO,
      "",
      "  ══════════════════════════════════════════════════════════",
      "   MAIN MENU                              1 node · 300-19200",
      "  ══════════════════════════════════════════════════════════",
      "",
      "    [1]  Bulletins",
      "    [2]  Message base            (" + msgs.length + " messages)",
      "    [3]  Post a message",
      "    [4]  Channel directory       (" + AESTHETICS.length + " systems)",
      "    [5]  Door games",
      "    [6]  Change connection speed",
      "",
      "    [G]  Goodbye (hang up)",
      "",
      "  Select: ",
    ],
    [msgs.length],
  );

  const show = useCallback(
    (s: Screen) => {
      setScreen(s);
      setEntry("");
    },
    [],
  );

  // Repaint whenever the screen or baud changes.
  useEffect(() => {
    if (screen === "connecting") return;

    if (screen === "menu") emit(MENU());

    if (screen === "bulletins")
      emit([
        "  ┌──────────────────────────────────────────────────────┐",
        "  │  BULLETINS                                           │",
        "  └──────────────────────────────────────────────────────┘",
        "",
        "  1987-03-02  The board is up. Tell your friends. Not too",
        "              many of them, there is only one line.",
        "",
        "  1987-04-19  Someone has been calling at 4am and typing",
        "              nothing for an hour. Please stop.",
        "",
        "  1987-06-30  Added a second floppy drive. We now have more",
        "              storage than we will ever conceivably need.",
        "",
        "  1987-09-11  If you are reading this in the future: hello.",
        "              It was quieter here. You had to wait for things",
        "              and that was most of the pleasure.",
        "",
        "  [Q] back to menu",
        "",
      ]);

    if (screen === "messages")
      emit([
        "  ┌──────────────────────────────────────────────────────┐",
        "  │  MESSAGE BASE                                        │",
        "  └──────────────────────────────────────────────────────┘",
        "",
        ...msgs.flatMap((m, i) => [
          `  #${String(i + 1).padStart(3, "0")}  FROM: ${m.from}`,
          `        SUBJ: ${m.subject}`,
          `        ${m.body.slice(0, 62)}`,
          "",
        ]),
        "  [3] post  ·  [Q] back to menu",
        "",
      ]);

    if (screen === "channels")
      emit([
        "  ┌──────────────────────────────────────────────────────┐",
        "  │  CHANNEL DIRECTORY — other systems on this network    │",
        "  └──────────────────────────────────────────────────────┘",
        "",
        ...AESTHETICS.map(
          (a) =>
            `   ${String(a.channel).padStart(2, "0")}  ${a.slug.padEnd(18)} ${
              a.status === "live" ? "ONLINE " : "NO ANSWER"
            }`,
        ),
        "",
        "  Type a channel number then ENTER to dial.  [Q] back",
        "",
      ]);

    if (screen === "door")
      emit([
        "  ┌──────────────────────────────────────────────────────┐",
        "  │  DOOR GAMES                                          │",
        "  └──────────────────────────────────────────────────────┘",
        "",
        "    GUESS THE NUMBER            [not registered]",
        "    TRADE WARS 2002             [not registered]",
        "    LEGEND OF THE RED DRAGON    [not registered]",
        "    THE PIT                     [not registered]",
        "",
        "  All doors on this system are shareware and the SysOp has",
        "  not paid for any of them. He says he will. He will not.",
        "",
        "  [Q] back to menu",
        "",
      ]);

    if (screen === "post")
      emit([
        "  ┌──────────────────────────────────────────────────────┐",
        "  │  POST A MESSAGE                                      │",
        "  └──────────────────────────────────────────────────────┘",
        "",
        "  Messages are saved to this browser and will be here when",
        "  you come back.",
        "",
        `  SUBJECT: ${draft.subject}`,
        `  BODY:    ${draft.body}`,
        "",
        `  Editing: ${postField.toUpperCase()}   [TAB] switch  [ENTER] post  [ESC] cancel`,
        "",
      ]);

    if (screen === "sysop")
      emit([
        "",
        "  *** SYSOP PAGE ***",
        "",
        "  Paging the SysOp...",
        "  ..........",
        "",
        "  SYSOP: hello?",
        "  SYSOP: sorry, I was asleep. It is 4am here.",
        "  SYSOP: nobody has paged this board in a very long time.",
        "  SYSOP: how did you even find it?",
        "",
        "  SYSOP: ...are you from the future?",
        "",
        "  [Q] back to menu",
        "",
      ]);
    // MENU/emit identity changes with baud, which is the intended repaint trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, baudIdx, msgs]);

  const savePost = useCallback(() => {
    if (!draft.subject.trim() && !draft.body.trim()) return;
    const mine = sbGet<Msg[]>(AESTHETIC, "messages", []);
    const next = [
      ...mine,
      {
        from: "YOU",
        subject: draft.subject.trim() || "(no subject)",
        body: draft.body.trim() || "(no text)",
      },
    ];
    sbSet(AESTHETIC, "messages", next);
    setMsgs([...SEED_MSGS, ...next]);
    setDraft({ subject: "", body: "" });
    tone({ freq: 660, toFreq: 990, duration: 0.16, gain: 0.08 });
    show("messages");
  }, [draft, show]);

  // ------------------------------------------------------------ keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (screen === "connecting") return;
      // This channel IS the keyboard, so it claims arrow keys and letters from the
      // dial for as long as it's on screen.
      e.stopPropagation();

      if (screen === "post") {
        if (e.key === "Escape") return show("menu");
        if (e.key === "Tab") {
          e.preventDefault();
          setPostField((f) => (f === "subject" ? "body" : "subject"));
          return;
        }
        if (e.key === "Enter") return savePost();
        if (e.key === "Backspace") {
          setDraft((d) => ({ ...d, [postField]: d[postField].slice(0, -1) }));
          return;
        }
        if (e.key.length === 1) {
          setDraft((d) => ({ ...d, [postField]: (d[postField] + e.key).slice(0, 60) }));
          tone({ freq: 1300 + Math.random() * 400, duration: 0.015, type: "square", gain: 0.025 });
        }
        return;
      }

      const k = e.key.toUpperCase();

      if (k === "Q" && screen !== "menu") return show("menu");

      if (screen === "channels") {
        if (e.key === "Enter") {
          const n = Number(entry);
          const target = AESTHETICS.find((a) => a.channel === n);
          if (target) {
            emit([`  Dialling ${target.slug}...`, "  CONNECT", ""], () =>
              window.setTimeout(() => begin(target.slug), 340),
            );
          }
          setEntry("");
          return;
        }
        if (/^[0-9]$/.test(k)) {
          setEntry((v) => (v + k).slice(0, 2));
          tone({ freq: 1400, duration: 0.02, type: "square", gain: 0.03 });
          return;
        }
      }

      if (screen === "menu") {
        if (k === "1") return show("bulletins");
        if (k === "2") return show("messages");
        if (k === "3") return show("post");
        if (k === "4") return show("channels");
        if (k === "5") return show("door");
        if (k === "6") {
          const next = (baudIdx + 1) % BAUD.length;
          setBaudIdx(next);
          setResync(true);
          window.setTimeout(() => setResync(false), 300);
          tone({ freq: 400 + next * 260, toFreq: 1400, duration: 0.28, type: "sawtooth", gain: 0.07 });
          return;
        }
        if (k === "G") {
          emit(["", "  NO CARRIER", ""], () => window.setTimeout(() => show("menu"), 2200));
          return;
        }
      }

      if (screen === "messages" && k === "3") return show("post");

      // The easter egg: type SYSOP anywhere and someone answers.
      if (/^[A-Z]$/.test(k)) {
        setEntry((v) => {
          const next = (v + k).slice(-5);
          if (next === "SYSOP") {
            window.setTimeout(() => show("sysop"), 60);
            return "";
          }
          return next;
        });
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screen, entry, baudIdx, begin, emit, show, savePost, postField]);

  const uptime = connected ? Math.floor((Date.now() - connected) / 1000) : 0;

  return (
    <div className={styles.root}>
      <div className={styles.topbar}>
        <span>THE ATTIC BBS · NODE 1</span>
        <span>ANSI · 80×25 · {baud} BAUD</span>
      </div>

      <div className={`${styles.screen} ${resync ? styles.resync : ""}`}>
        {lines.map((l, i) => (
          <div key={i} className={`${styles.line} ${colourFor(l)}`}>
            {l.padEnd(COLS, " ").slice(0, COLS)}
          </div>
        ))}
        {!typing && screen !== "post" && (
          <div className={styles.line}>
            <span className={styles.c4}>{entry}</span>
            <span className={styles.cursor}> </span>
          </div>
        )}
      </div>

      <div className={styles.status}>
        <span className={styles.statusSeg}>
          NODE <b>1</b> · <b>{baud}</b> BAUD · ANSI
        </span>
        <span className={styles.statusSeg}>
          {screen === "post"
            ? "TAB switch field · ENTER post · ESC cancel"
            : screen === "menu"
              ? "Press a number. [6] changes speed. Try typing SYSOP."
              : "[Q] back to menu"}
        </span>
        <span className={styles.statusSeg}>
          CALLER <b>#4417</b> · ONLINE <b>{String(Math.floor(uptime / 60)).padStart(2, "0")}:
          {String(uptime % 60).padStart(2, "0")}</b>
        </span>
      </div>

      <div className={styles.glow} />
      <div className={styles.scanlines} />
      <div className={styles.curve} />
    </div>
  );
}

/** Crude ANSI-ish colouring by line shape. Real boards did exactly this by hand. */
function colourFor(line: string): string {
  if (/^\s*[┌│└═╔╚]/.test(line)) return styles.c1;
  if (/^\s*▄|█|▀/.test(line)) return styles.c2;
  if (/^\s*\[/.test(line) || /\[[0-9GQ]\]/.test(line)) return styles.c4;
  if (/^\s*(CONNECT|OK|AT|NO CARRIER)/.test(line)) return styles.c6;
  if (/^\s*SYSOP:/.test(line)) return styles.c2;
  if (/^\s*#\d/.test(line)) return styles.c4;
  if (/ONLINE|NO ANSWER/.test(line)) return styles.c8;
  if (/^\s{2}\*\*\*/.test(line)) return styles.c5;
  return styles.c3;
}
