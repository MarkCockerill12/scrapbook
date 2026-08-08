"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCanvas } from "@/components/CanvasStage";
import { one } from "@/lib/assets";
import { sbGet, sbSet } from "@/lib/storage";
import { useShell } from "@/lib/store";
import { shutter, splash, startAmbience, startMuzak, strike, tick } from "./sound";
import styles from "./styles.module.css";

/**
 * Channel 13 — Dead Mall.
 *
 * Fiction: *Northgate Centre — Directory. 6 of 84 units occupied.*
 *
 * The demo argument: the horror of a dead mall is that **the lights are still on**.
 * Everything is lit, evenly, by fluorescents nobody switched off, and one of them is
 * failing. The palette stays cheerful — teal, salmon, brass, cream — because
 * desaturating to grey turns it into generic decay and loses the specific sadness of
 * a building designed to be busy.
 *
 * Scroll is granted here (R1) because the concept IS a board taller than you are.
 *
 * Assets: `raw/dead-mall/` — real abandoned-mall atrium, fountain and shopfront
 * photography, graded cold rather than desaturated.
 */

const SLUG = "dead-mall";

const FORMER = [
  "Waldenbooks", "Sam Goody", "Suncoast Video", "Radio Shack", "Claire's",
  "Orange Julius", "KB Toys", "Casual Corner", "The Limited", "Pier 1",
  "Foot Locker", "Spencer's", "Bath & Body", "Gadzooks", "Software Etc.",
  "Camelot Music", "Deb Shops", "Lane Bryant", "General Nutrition", "Wicks 'N' Sticks",
  "Thom McAn", "Chess King", "Merry-Go-Round", "Hot Sam Pretzels", "Regis Hairstylists",
  "County Seat", "B. Dalton", "Natural Wonders",
];

const REASONS = [
  "Lease not renewed.",
  "Chain entered Chapter 11.",
  "Relocated to the retail park.",
  "Closed with no notice over a weekend.",
  "Fixtures still inside.",
  "Sign removed, ghost lettering remains.",
];

/** The six that are genuinely still trading, plus the one that shouldn't be. */
const OPEN: Record<number, string> = {
  104: "Northgate Nails",
  118: "Vape & Phone Repair",
  127: "Church of the Living Word",
  133: "GNC (reduced hours)",
  141: "Auntie's Cookie Co.",
  159: "Mall Office",
};

const SECRET_UNIT = 172;

function hash(n: number): number {
  const x = Math.sin(n * 374.761) * 43758.5453;
  return x - Math.floor(x);
}

export default function DeadMall() {
  const { toCanvasSpace } = useCanvas();
  const begin = useShell((s) => s.beginTransition);
  const muted = useShell((s) => s.muted);

  const [selected, setSelected] = useState<number | null>(null);
  const [cardAt, setCardAt] = useState({ x: 0, y: 0 });
  const [coins, setCoins] = useState(0);
  const [tosses, setTosses] = useState<{ id: number; x: number; y: number }[]>([]);
  const [stutter, setStutter] = useState(0);
  const [you, setYou] = useState({ x: 300, y: 300 });
  const [gate, setGate] = useState(0);
  const seq = useRef(0);
  const planRef = useRef<HTMLDivElement>(null);
  const gateRef = useRef<HTMLDivElement>(null);

  const atrium = one(SLUG, "mall_atrium", 0);
  const fountain = one(SLUG, "mall_fountain", 1);

  useEffect(() => {
    setCoins(sbGet<number>(SLUG, "coins", 0));
  }, []);

  useEffect(() => {
    if (muted) return;
    const stopAmb = startAmbience();
    const stopMuzak = startMuzak();
    return () => {
      stopAmb();
      stopMuzak();
    };
  }, [muted]);

  /** 84 units, 101–184. Most of them are nothing. */
  const units = useMemo(
    () =>
      Array.from({ length: 84 }, (_, i) => {
        const no = 101 + i;
        return {
          no,
          open: OPEN[no],
          secret: no === SECRET_UNIT,
          former: FORMER[Math.floor(hash(no) * FORMER.length)],
          reason: REASONS[Math.floor(hash(no * 3) * REASONS.length)],
          closed: 1996 + Math.floor(hash(no * 7) * 14),
        };
      }),
    [],
  );

  const chosen = units.find((u) => u.no === selected);

  const onUnit = (no: number, e: React.MouseEvent) => {
    tick();
    if (no === SECRET_UNIT) {
      begin("liminal");
      return;
    }
    const p = toCanvasSpace(e.clientX, e.clientY);
    setCardAt({ x: Math.min(p.x, 1150), y: p.y + 14 });
    setSelected(no);
  };

  const toss = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const p = toCanvasSpace(e.clientX, e.clientY);
    const o = toCanvasSpace(rect.left, rect.top);
    const id = ++seq.current;
    setTosses((t) => [...t, { id, x: p.x - o.x, y: p.y - o.y }]);
    window.setTimeout(() => {
      splash();
      setTosses((t) => t.filter((x) => x.id !== id));
    }, 900);
    setCoins((c) => {
      const n = c + 1;
      sbSet(SLUG, "coins", n);
      return n;
    });
  };

  return (
    <div
      className={styles.root}
      onPointerDown={() => {
        // Clicking anywhere makes the tubes think about it.
        setStutter((s) => s + 1);
        strike();
      }}
    >
      {atrium && (
        <Image
          src={atrium.src}
          alt=""
          width={1600}
          height={900}
          priority
          className={styles.atrium}
        />
      )}
      <div className={styles.atriumFade} />

      {/* the ceiling */}
      {[
        { left: 190, top: 96, width: 380, bad: false },
        { left: 640, top: 74, width: 320, bad: true },
        { left: 1040, top: 104, width: 400, bad: false },
      ].map((t, i) => (
        <span
          key={`${i}-${stutter}`}
          className={`${styles.tube} ${t.bad ? styles.tubeBad : ""} ${
            stutter > 0 ? styles.tubeStutter : ""
          }`}
          style={{ left: t.left, top: t.top, width: t.width }}
        />
      ))}

      <div className={styles.sign}>
        <div className={styles.signName}>NORTHGATE</div>
        <div className={styles.signSub}>Centre · est. 1974</div>
        <div className={styles.signOccupancy}>
          6 of 84 units occupied · lower level closed
        </div>
      </div>

      <div className={styles.hint}>
        scroll down for the directory
        <br />
        every vacant unit remembers what it was
      </div>

      {/* ------------------------------------------------ the board */}
      <section className={styles.board}>
        <header className={styles.boardHead}>
          <h1 className={styles.boardTitle}>Directory</h1>
          <span className={styles.boardMeta}>Level 1 · units 101–184</span>
        </header>

        <div className={styles.units}>
          {units.map((u) => (
            <button
              key={u.no}
              type="button"
              className={styles.unit}
              onClick={(e) => onUnit(u.no, e)}
            >
              <span className={styles.unitNo}>{u.no}</span>
              {u.secret ? (
                <span className={styles.oddOne}>OPEN — no lease on file</span>
              ) : u.open ? (
                <span className={styles.open}>{u.open}</span>
              ) : (
                <span className={styles.vacant}>VACANT</span>
              )}
            </button>
          ))}
        </div>
      </section>

      {chosen && !chosen.open && !chosen.secret && (
        <div
          className={styles.card}
          style={{ left: cardAt.x, top: cardAt.y }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {(() => {
            const shot = one(SLUG, "mall_abandoned", chosen.no);
            return shot ? (
              <Image
                src={shot.src}
                alt=""
                width={420}
                height={190}
                className={styles.cardShot}
              />
            ) : null;
          })()}
          <div className={styles.cardName}>{chosen.former}</div>
          <div className={styles.cardMeta}>
            Unit {chosen.no} · closed {chosen.closed}
          </div>
          <div className={styles.cardBody}>{chosen.reason}</div>
          <button
            type="button"
            className={styles.cardClose}
            onClick={() => setSelected(null)}
          >
            close
          </button>
        </div>
      )}

      {/* ------------------------------------------------ floorplan */}
      <div
        ref={planRef}
        className={styles.plan}
        onPointerMove={(e) => {
          if (e.buttons !== 1) return;
          const rect = planRef.current?.getBoundingClientRect();
          if (!rect) return;
          const p = toCanvasSpace(e.clientX, e.clientY);
          const o = toCanvasSpace(rect.left, rect.top);
          setYou({
            x: Math.max(14, Math.min(626, p.x - o.x)),
            y: Math.max(14, Math.min(406, p.y - o.y)),
          });
        }}
      >
        <span className={styles.planLabel} style={{ left: 16, top: 12 }}>
          Level 1 · you are here
        </span>
        <span className={styles.planShape} style={{ left: 40, top: 60, width: 210, height: 120 }} />
        <span className={styles.planShape} style={{ left: 280, top: 60, width: 150, height: 120 }} />
        <span className={styles.planShape} style={{ left: 460, top: 60, width: 140, height: 120 }} />
        <span className={styles.planShape} style={{ left: 40, top: 240, width: 260, height: 130 }} />
        <span className={styles.planShape} style={{ left: 330, top: 240, width: 270, height: 130 }} />
        <span className={styles.planLabel} style={{ left: 300, top: 200 }}>
          fountain court
        </span>
        <span className={styles.youAreHere} style={{ left: you.x, top: you.y }}>
          <span className={styles.youLabel}>you are here</span>
        </span>
      </div>

      {/* ------------------------------------------------ fountain */}
      <div className={styles.fountain} onClick={toss}>
        {fountain && (
          <Image
            src={fountain.src}
            alt=""
            width={640}
            height={420}
            className={styles.fountainShot}
          />
        )}
        <span className={styles.fountainLabel}>
          Fountain court · {coins} coin{coins === 1 ? "" : "s"} in the water
        </span>
        {tosses.map((t) => (
          <span key={t.id} className={styles.coin} style={{ left: t.x, top: t.y }} />
        ))}
        {tosses.map((t) => (
          <span
            key={`r${t.id}`}
            className={styles.ripple}
            style={{ left: t.x, top: t.y + 40 }}
          />
        ))}
      </div>

      {/* ------------------------------------------------ plaque + gate */}
      <div className={styles.plaque}>
        <div className={styles.plaqueTitle}>Centre hours</div>
        {[
          ["Monday – Friday", "10:00 – 18:00"],
          ["Saturday", "10:00 – 17:00"],
          ["Sunday", "closed"],
          ["Public holidays", "closed"],
          ["Management office", "by appointment"],
        ].map(([a, b]) => (
          <div key={a} className={styles.plaqueRow}>
            <span>{a}</span>
            <span>{b}</span>
          </div>
        ))}
      </div>

      <div
        ref={gateRef}
        className={styles.gate}
        onPointerMove={(e) => {
          if (e.buttons !== 1) return;
          const rect = gateRef.current?.getBoundingClientRect();
          if (!rect) return;
          const p = toCanvasSpace(e.clientX, e.clientY);
          const o = toCanvasSpace(rect.left, rect.top);
          const next = Math.max(0, Math.min(140, p.y - o.y));
          if (Math.abs(next - gate) > 18) shutter();
          setGate(next);
        }}
      >
        <span className={styles.gateLabel}>unit 161 · drag the shutter down</span>
        <span className={styles.gateShutter} style={{ height: gate }} />
      </div>
    </div>
  );
}
