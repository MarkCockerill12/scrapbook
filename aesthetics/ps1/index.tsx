"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { sbGet, sbSet } from "@/lib/storage";
import { useShell } from "@/lib/store";
import { IconCanvas } from "./IconCanvas";
import { blip, confirm, corruptBuzz, deny, formatted, startRead } from "./sound";
import { Viewport } from "./Viewport";
import styles from "./styles.module.css";

/**
 * Channel 17 — PS1 Low-Poly.
 *
 * Fiction: *Memory Card (PS) — Slot 1.* Three saves, and each one is another
 * channel. Loading a save boots it.
 *
 * The demo argument: everything people love about the PS1 look is a **rendering
 * defect** — vertex snapping, affine texture warp, no z-buffer, 15-bit dithered
 * colour, 240p. A GPU is built to not have any of them, so the viewport is a
 * software rasteriser instead and gets them the way the hardware did. See
 * `renderer.ts`.
 *
 * No assets. Every polygon and every texel is generated.
 */

const SLUG = "ps1";

interface Save {
  id: number;
  name: string;
  code: string;
  blocks: number;
  channel: string;
  played: string;
}

const SAVES: Save[] = [
  {
    id: 0,
    name: "AQUAOS 2004",
    code: "BASLUS-01001",
    blocks: 2,
    channel: "frutiger-aero",
    played: "14H 22M",
  },
  {
    id: 1,
    name: "THE ATTIC BBS",
    code: "BASLUS-00417",
    blocks: 1,
    channel: "bbs",
    played: "203H 09M",
  },
  {
    id: 2,
    name: "DSV-4 DESCENT",
    code: "BASLUS-00930",
    blocks: 3,
    channel: "deep-sea",
    played: "6H 41M",
  },
];

const TOTAL_BLOCKS = 15;

export default function PS1() {
  const begin = useShell((s) => s.beginTransition);

  const [present, setPresent] = useState<number[]>([0, 1, 2]);
  const [selected, setSelected] = useState(0);
  const [reading, setReading] = useState<null | "load" | "copy" | "delete">(null);
  const [loaded, setLoaded] = useState<number | null>(null);
  const [copies, setCopies] = useState(0);
  const stopRead = useRef<null | (() => void)>(null);

  useEffect(() => {
    setPresent(sbGet<number[]>(SLUG, "saves", [0, 1, 2]));
  }, []);

  const commit = (next: number[]) => {
    setPresent(next);
    sbSet(SLUG, "saves", next);
  };

  const corrupt = present.length === 0;
  const live = SAVES.filter((s) => present.includes(s.id));
  const used = live.reduce((n, s) => n + s.blocks, 0) + copies;
  const free = TOTAL_BLOCKS - used;
  const current = live.find((s) => s.id === selected) ?? live[0];

  // The drive noise runs for exactly as long as the operation does.
  useEffect(() => {
    if (!reading) return;
    stopRead.current = startRead();
    return () => {
      stopRead.current?.();
      stopRead.current = null;
    };
  }, [reading]);

  const run = (kind: "load" | "copy" | "delete", after: () => void, ms = 1900) => {
    if (reading) return;
    setReading(kind);
    window.setTimeout(() => {
      setReading(null);
      after();
    }, ms);
  };

  const doLoad = () => {
    if (!current) return;
    confirm();
    run("load", () => {
      setLoaded(current.id);
      // A beat on the plinth before the channel actually takes over.
      window.setTimeout(() => begin(current.channel), 1500);
    });
  };

  const doCopy = () => {
    if (!current) return;
    if (free < current.blocks) {
      deny();
      return;
    }
    confirm();
    run("copy", () => setCopies((c) => c + current.blocks), 2400);
  };

  const doDelete = () => {
    if (!current) return;
    confirm();
    run("delete", () => {
      const next = present.filter((id) => id !== current.id);
      commit(next);
      if (next.length === 0) {
        corruptBuzz();
        setLoaded(null);
      } else {
        setSelected(next[0]);
      }
    }, 1200);
  };

  const doFormat = () => {
    confirm();
    run("copy", () => {
      commit([0, 1, 2]);
      setCopies(0);
      setSelected(0);
      formatted();
    }, 2200);
  };

  /** 15 blocks: used ones carry the owning save's initial, free ones are empty. */
  const blocks = useMemo(() => {
    const out: { label: string; save: number | null }[] = [];
    for (const s of live) {
      for (let i = 0; i < s.blocks; i++) out.push({ label: s.name.slice(0, 1), save: s.id });
    }
    for (let i = 0; i < copies; i++) out.push({ label: "*", save: null });
    while (out.length < TOTAL_BLOCKS) out.push({ label: "", save: null });
    return out.slice(0, TOTAL_BLOCKS);
  }, [live, copies]);

  return (
    <div className={styles.root}>
      <header className={styles.head}>
        <div className={styles.title}>Memory Card (PS)</div>
        <div className={styles.subtitle}>
          Slot 1 · {free} of {TOTAL_BLOCKS} blocks free
        </div>
      </header>

      {/* card blocks */}
      <section className={`${styles.panel} ${corrupt ? styles.warn : ""}`}
        style={{ left: 64, top: 140, width: 560 }}
      >
        <div className={styles.panelTitle}>Card contents</div>
        <div className={styles.blocks}>
          {blocks.map((b, i) => (
            <div
              key={i}
              className={`${styles.block} ${b.save !== null || b.label ? styles.blockUsed : ""} ${
                b.save === current?.id && b.save !== null ? styles.blockSel : ""
              }`}
            >
              {b.label}
            </div>
          ))}
        </div>
      </section>

      {/* saves */}
      <section
        className={`${styles.panel} ${corrupt ? styles.warn : ""}`}
        style={{ left: 64, top: 328, width: 560, height: 330 }}
      >
        <div className={styles.panelTitle}>Saved data</div>

        {corrupt ? (
          <div className={styles.warnText}>
            ⚠ The data in Memory Card (PS) in slot 1 is corrupt.
            <br />
            <br />
            Unformatted card. You deleted the last save and the directory went with
            it, which is exactly what used to happen.
            <br />
            <br />
            Format the card to continue.
          </div>
        ) : (
          live.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`${styles.save} ${s.id === current?.id ? styles.saveOn : ""}`}
              onClick={() => {
                setSelected(s.id);
                blip();
              }}
            >
              <span className={styles.saveIcon}>
                <IconCanvas kind={s.id} />
              </span>
              <span>
                <span className={styles.saveName}>{s.name}</span>
                <span className={styles.saveMeta}>
                  {s.code} · {s.blocks} block{s.blocks > 1 ? "s" : ""} · {s.played}
                </span>
              </span>
            </button>
          ))
        )}
      </section>

      {/* actions */}
      <section className={styles.panel} style={{ left: 64, top: 690, width: 560 }}>
        <div className={styles.actions}>
          {corrupt ? (
            <button type="button" className={styles.action} onClick={doFormat}>
              <span className={`${styles.glyph} ${styles.gTri}`}>△</span> Format card
            </button>
          ) : (
            <>
              <button
                type="button"
                className={styles.action}
                disabled={!!reading}
                onClick={doLoad}
              >
                <span className={`${styles.glyph} ${styles.gCross}`}>✕</span> Load
              </button>
              <button
                type="button"
                className={styles.action}
                disabled={!!reading || free < (current?.blocks ?? 99)}
                onClick={doCopy}
              >
                <span className={`${styles.glyph} ${styles.gSquare}`}>◻</span> Copy
              </button>
              <button
                type="button"
                className={styles.action}
                disabled={!!reading}
                onClick={doDelete}
              >
                <span className={`${styles.glyph} ${styles.gCircle}`}>◯</span> Delete
              </button>
            </>
          )}
        </div>
      </section>

      {/* viewport */}
      <div style={{ position: "absolute", left: 690, top: 140 }}>
        <Viewport loaded={loaded} reading={!!reading} corrupt={corrupt} />
        <div className={styles.viewportLabel}>
          {corrupt
            ? "vram fault · 320×240"
            : loaded !== null
              ? `${current?.name ?? ""} · booting`
              : "drag to orbit · 320×240 · 30fps · no z-buffer"}
        </div>

        {reading && (
          <div className={styles.reading}>
            <div className={styles.spinner} />
            {reading === "load" ? "Loading" : reading === "copy" ? "Copying" : "Deleting"}
            <br />
            Do not remove the Memory Card
          </div>
        )}
      </div>

      <div className={styles.hint}>
        load a save and it boots that channel · delete all three
      </div>
    </div>
  );
}
