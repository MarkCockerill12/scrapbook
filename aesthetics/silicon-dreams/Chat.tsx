"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./styles.module.css";

export interface LogLine {
  id: number;
  name: string;
  text: string;
  kind?: "me" | "sys";
}

/** A name's colour, stable per name, from a small 1996 palette. */
const PALETTE = ["#ffd75e", "#7fe0ff", "#ff8fd0", "#9dff8a", "#ffae5e", "#c3a6ff", "#ff7a7a"];
function colour(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

/** The chat client's log and input line. Enter sends. */
export function Chat({ log, onSay, users }: { log: LogLine[]; onSay: (text: string) => void; users: number }) {
  const [draft, setDraft] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [log]);
  return (
    <div className={styles.chat}>
      <div className={styles.chatHead}>
        chat <span>{users} users here</span>
      </div>
      <div ref={scroller} className={styles.chatLog}>
        {log.map((l) => (
          <p key={l.id} data-kind={l.kind}>
            {l.kind === "sys" ? (
              l.text
            ) : (
              <>
                <b style={{ color: l.kind === "me" ? "#ffffff" : colour(l.name) }}>{l.name}:</b> {l.text}
              </>
            )}
          </p>
        ))}
      </div>
      <form
        className={styles.chatIn}
        onSubmit={(e) => {
          e.preventDefault();
          const t = draft.trim();
          if (!t) return;
          onSay(t.slice(0, 120));
          setDraft("");
        }}
      >
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="say something…" maxLength={120} spellCheck={false} />
        <button type="submit">Say</button>
      </form>
    </div>
  );
}

/** First time in: pick a name. Persisted by the page. */
export function Nickname({ initial, onDone }: { initial: string; onDone: (nick: string) => void }) {
  const [v, setV] = useState(initial);
  return (
    <form
      className={styles.nick}
      onSubmit={(e) => {
        e.preventDefault();
        onDone((v.trim() || initial).slice(0, 16));
      }}
    >
      <h3>Welcome to Hypersphere</h3>
      <p>Choose a nickname. Everyone in the world will see it.</p>
      <input autoFocus value={v} onChange={(e) => setV(e.target.value)} maxLength={16} spellCheck={false} />
      <button type="submit">Enter world</button>
    </form>
  );
}
