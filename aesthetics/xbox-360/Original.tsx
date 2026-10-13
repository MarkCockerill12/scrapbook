"use client";

import { useEffect, useState } from "react";
import { blip, bladeSwoosh, partyBlip } from "./sound";
import o from "./original.module.css";

/**
 * Xbox Originals: the 2001 dashboard, as it sat inside every 360 that could run the
 * old discs. Black, acid green, a slow orb with rings turning round it, and four
 * words down the left. Memory shows what this site has really saved, in blocks.
 */

const MENU = ["MEMORY", "MUSIC", "XBOX LIVE", "SETTINGS"] as const;
type Item = (typeof MENU)[number];

const TRACKS = [
  { name: "Soundtrack 1", pitch: 220 },
  { name: "Audio CD — Track 02", pitch: 330 },
  { name: "halo theme (ripped)", pitch: 262 },
  { name: "linkin park - numb.wma", pitch: 392 },
];

export function Original({ onClose, unlocked, visited, score }: { onClose: () => void; unlocked: number; visited: number; score: number }) {
  const [at, setAt] = useState(0);
  const [open, setOpen] = useState<Item | null>(null);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        setAt((a) => (a + 1) % MENU.length);
        blip();
      } else if (e.key === "ArrowUp") {
        setAt((a) => (a + MENU.length - 1) % MENU.length);
        blip();
      } else if (e.key === "Enter") {
        setOpen(MENU[at]);
        bladeSwoosh();
      } else if (e.key === "Backspace") setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [at]);

  const saves = [
    { name: "ScrapBook — channels", blocks: 4 + visited * 3 },
    { name: "ScrapBook — achievements", blocks: 2 + unlocked * 6 },
    { name: "Halo: Combat Evolved", blocks: 73 },
    { name: "Jet Set Radio Future", blocks: 18 },
    { name: "Fusion Frenzy", blocks: 9 },
    { name: "Soundtracks", blocks: 4412 },
  ];
  const used = saves.reduce((n, s) => n + s.blocks, 0);

  return (
    <div className={o.root}>
      <div className={o.field} />
      {/* the orb, and the rings that never stop */}
      <div className={o.orb} data-open={open ? true : undefined}>
        <i />
        <i />
        <i />
        <b />
      </div>

      <header className={o.brand}>
        <b>XBOX</b>
        <span>{now ? now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "--:--"}</span>
      </header>

      {!open ? (
        <nav className={o.menu}>
          {MENU.map((m, i) => (
            <button
              key={m}
              type="button"
              data-on={i === at || undefined}
              onPointerEnter={() => {
                if (i !== at) {
                  setAt(i);
                  blip();
                }
              }}
              onClick={() => {
                setOpen(m);
                bladeSwoosh();
              }}
            >
              {m}
            </button>
          ))}
        </nav>
      ) : (
        <section className={o.pane} key={open}>
          <h2>{open}</h2>
          {open === "MEMORY" && (
            <>
              <p>
                XBOX HARD DISK · {used.toLocaleString()} BLOCKS USED · 50,000+ FREE
              </p>
              <ul className={o.saves}>
                {saves.map((s) => (
                  <li key={s.name}>
                    <i />
                    <b>{s.name}</b>
                    <span>{s.blocks.toLocaleString()} blocks</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {open === "MUSIC" && (
            <ul className={o.saves}>
              {TRACKS.map((t) => (
                <li key={t.name}>
                  <button
                    type="button"
                    onClick={() => [0, 0.16, 0.32, 0.56].forEach((d, k) => window.setTimeout(() => partyBlip(t.pitch * [1, 1.25, 1.5, 2][k]), d * 1000))}
                  >
                    ▶
                  </button>
                  <b>{t.name}</b>
                  <span>0:0{3 + (t.pitch % 6)}</span>
                </li>
              ))}
            </ul>
          )}
          {open === "XBOX LIVE" && (
            <p className={o.notice}>
              YOUR XBOX CAN&apos;T CONNECT TO XBOX LIVE.
              <br />
              <br />
              THE SERVICE FOR ORIGINAL XBOX GAMES ENDED ON 15 APRIL 2010.
              <br />
              THE LAST FOURTEEN PLAYERS STAYED ON FOR ANOTHER THREE WEEKS.
            </p>
          )}
          {open === "SETTINGS" && (
            <dl className={o.settings}>
              <dt>CLOCK</dt>
              <dd>{now ? now.toLocaleString("en-GB") : ""}</dd>
              <dt>LANGUAGE</dt>
              <dd>ENGLISH</dd>
              <dt>VIDEO</dt>
              <dd>480p · WIDESCREEN</dd>
              <dt>AUDIO</dt>
              <dd>STEREO</dd>
              <dt>GAMERSCORE</dt>
              <dd>{score} — NOT INVENTED YET</dd>
              <dt>SYSTEM INFO</dt>
              <dd>K:1.00.5838.01 D:1.00.5960.01</dd>
            </dl>
          )}
        </section>
      )}

      <footer className={o.keys}>
        {open ? (
          <button type="button" onClick={() => setOpen(null)}>
            <i data-k="b">B</i> BACK
          </button>
        ) : (
          <span>
            <i data-k="a">A</i> SELECT
          </span>
        )}
        <button type="button" onClick={onClose}>
          <i data-k="x">✕</i> BACK TO XBOX 360
        </button>
      </footer>
    </div>
  );
}
