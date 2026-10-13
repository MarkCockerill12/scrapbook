"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { img } from "@/lib/assets";
import { blip, partyBlip } from "./sound";
import styles from "./extras.module.css";

const A = "xbox-360";

/** Gamerpics are crops of real box art — the way half of 2008's actually were. */
export const GAMERPICS: { n: number; pos: string }[] = [
  { n: 1, pos: "48% 22%" }, // Master Chief
  { n: 2, pos: "50% 55%" }, // Marcus
  { n: 3, pos: "50% 30%" }, // Soap
  { n: 8, pos: "50% 45%" }, // Big Daddy
  { n: 9, pos: "50% 55%" }, // the hand
  { n: 17, pos: "40% 60%" }, // a Castle Crasher
];

export function Gamerpic({ pic, size = 56 }: { pic: number; size?: number }) {
  const g = GAMERPICS[pic % GAMERPICS.length];
  return (
    <span
      className={styles.gpic}
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${img(A, "x360_cover", g.n)?.src ?? ""})`,
        backgroundPosition: g.pos,
      }}
    />
  );
}

const PARTY = [
  { tag: "xX_no_scope_420_Xx", pic: 0, pitch: 420 },
  { tag: "MLGxDoritos99", pic: 3, pitch: 520 },
  { tag: "sn1per_pete", pic: 2, pitch: 640 },
  { tag: "HALO_M0M", pic: 1, pitch: 300 },
];

const LINES = [
  "who's got the flag",
  "bro ur mic is so loud",
  "my mom says i have to get off at 9",
  "no scope or it doesn't count",
  "brb getting doritos",
  "LAG. that was LAG",
  "invite me to the next one",
  "someone mute the kid",
  "1v1 me on rust",
  "ok ok last game",
];

const MESSAGES = [
  { from: "sn1per_pete", kind: "Friend Request", body: "add me i was on ur team" },
  { from: "MLGxDoritos99", kind: "Game Invite", body: "Halo 3 — Team Slayer on Guardian" },
  { from: "TrueSkill_Andy", kind: "Voice Message", body: "(0:04)" },
  { from: "Xbox LIVE", kind: "Message", body: "Your Gold membership expires in 3 days." },
  { from: "n0scope_nathan", kind: "Text", body: "gg no re" },
];

type View = "home" | "party" | "messages";

export function Guide({
  onClose,
  onBlade,
  score,
  pic,
}: {
  onClose: () => void;
  onBlade: (i: number) => void;
  score: number;
  pic: number;
}) {
  const [view, setView] = useState<View>("home");
  const [talking, setTalking] = useState<number | null>(null);
  const [caption, setCaption] = useState<{ who: number; text: string }[]>([]);

  // The party is always mid-conversation.
  useEffect(() => {
    if (view !== "party") return;
    const id = window.setInterval(() => {
      const who = Math.floor(Math.random() * PARTY.length);
      setTalking(who);
      partyBlip(PARTY[who].pitch);
      setCaption((c) => [...c.slice(-4), { who, text: LINES[Math.floor(Math.random() * LINES.length)] }]);
      window.setTimeout(() => setTalking(null), 700);
    }, 1400);
    return () => window.clearInterval(id);
  }, [view]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const tabs = [
    { name: "Xbox LIVE", color: "#8fd400" },
    { name: "Games", color: "#4a8a12" },
    { name: "Media", color: "#2b7fd4" },
    { name: "System", color: "#8b969d" },
  ];

  return (
    <div className={styles.guideShade} onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className={styles.guide}>
        <div className={styles.guideOrb}>
          <span />
        </div>
        <header className={styles.guideHead}>
          <Gamerpic pic={pic} size={52} />
          <div>
            <b>xX_no_scope_420_Xx</b>
            <span>G {score} · ★★★★☆ · Gold</span>
          </div>
        </header>
        <div className={styles.guideTabs}>
          {tabs.map((t, i) => (
            <button key={t.name} type="button" style={{ ["--tc" as string]: t.color }} onClick={() => { onBlade([1, 2, 3, 4][i]); onClose(); }}>
              {t.name}
            </button>
          ))}
        </div>

        {view === "home" && (
          <div className={styles.guideList}>
            <button type="button" onClick={() => { setView("messages"); blip(); }}>
              Messages <em>{MESSAGES.length} new</em>
            </button>
            <button type="button" onClick={() => { setView("party"); blip(); }}>
              Party <em>4 in party</em>
            </button>
            <button type="button" onClick={() => { onBlade(1); onClose(); }}>
              Friends <em>6 online</em>
            </button>
            <button type="button" onClick={() => { onBlade(2); onClose(); }}>
              Achievements
            </button>
            <button type="button" onClick={() => { onBlade(0); onClose(); }}>
              Xbox LIVE Marketplace
            </button>
            <button type="button" className={styles.guideHome} onClick={onClose}>
              Xbox Dashboard
            </button>
          </div>
        )}

        {view === "messages" && (
          <div className={styles.guideList}>
            <button type="button" className={styles.guideBack} onClick={() => setView("home")}>
              ‹ Messages
            </button>
            {MESSAGES.map((m) => (
              <button key={m.from + m.kind} type="button" onClick={() => (m.kind === "Voice Message" ? partyBlip(260) : blip())}>
                <span>
                  <b>{m.from}</b>
                  <small>
                    {m.kind} — {m.body}
                  </small>
                </span>
              </button>
            ))}
          </div>
        )}

        {view === "party" && (
          <div className={styles.party}>
            <button type="button" className={styles.guideBack} onClick={() => setView("home")}>
              ‹ Party — Halo 3 lobby
            </button>
            {PARTY.map((p, i) => (
              <div key={p.tag} className={styles.partyRow}>
                <span className={`${styles.partyRing} ${talking === i ? styles.partyTalk : ""}`}>
                  <Gamerpic pic={p.pic} size={40} />
                </span>
                <b>{p.tag}</b>
                <i className={styles.headset} />
              </div>
            ))}
            <div className={styles.captions}>
              {caption.map((c, k) => (
                <p key={k}>
                  <b>{PARTY[c.who].tag}:</b> {c.text}
                </p>
              ))}
            </div>
          </div>
        )}
        <p className={styles.guideHint}>Esc or click outside to close</p>
      </aside>
    </div>
  );
}
