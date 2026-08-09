"use client";

import styles from "./styles.module.css";

/**
 * Ransom-note lettering, composited from fonts.
 *
 * **This is a stand-in.** `FOR_MARK.md` asks for a real alphabet cut from magazines,
 * and on this page the lettering *is* the aesthetic rather than a supporting texture,
 * so real scans would be a genuine upgrade rather than a nicety.
 *
 * What makes the fake hold up is variance on FIVE axes at once, all keyed off the
 * character's position so the same headline is identical on every visit:
 *
 *   family · size · rotation · paper colour · ink colour
 *
 * Vary only size and rotation — the usual shortcut — and every letter still reads as
 * the same typeface, which is exactly the thing a ransom note is not. The families
 * below are deliberately chosen to disagree with each other: a slab, a grotesque, a
 * transitional serif, a typewriter and a condensed poster face.
 */

const FAMILIES = [
  '"Impact", sans-serif',
  '"Times New Roman", serif',
  '"Courier New", monospace',
  '"Georgia", serif',
  '"Arial Black", sans-serif',
  '"Trebuchet MS", sans-serif',
  '"Palatino Linotype", serif',
  '"Verdana", sans-serif',
];

/** Newsprint, cheap magazine white, yellowed paper, a colour page. */
const PAPERS = ["#f2efe4", "#ffffff", "#e8dfc6", "#f7e9cf", "#dfe6e8", "#f4dede"];
const INKS = ["#141210", "#1b1a26", "#241414", "#101a14"];

function hash(n: number): number {
  const x = Math.sin(n * 91.7) * 43758.5453;
  return x - Math.floor(x);
}

export function Ransom({
  text,
  size = 34,
  seed = 0,
}: {
  text: string;
  /** Base size in canvas px; each letter deviates from it. */
  size?: number;
  seed?: number;
}) {
  return (
    <span>
      {text.split("").map((ch, i) => {
        if (ch === " ") return <span key={i} style={{ display: "inline-block", width: size * 0.34 }} />;
        const k = seed * 31 + i * 7 + ch.charCodeAt(0);
        const fam = FAMILIES[Math.floor(hash(k) * FAMILIES.length)];
        const paper = PAPERS[Math.floor(hash(k * 3 + 1) * PAPERS.length)];
        const ink = INKS[Math.floor(hash(k * 5 + 2) * INKS.length)];
        const rot = (hash(k * 7 + 3) - 0.5) * 15;
        const scale = 0.78 + hash(k * 11 + 4) * 0.5;
        const upper = hash(k * 13 + 5) > 0.35;
        return (
          <span
            key={i}
            className={styles.ransom}
            style={{
              fontFamily: fam,
              fontSize: size * scale,
              background: paper,
              color: ink,
              transform: `rotate(${rot.toFixed(1)}deg)`,
              fontWeight: hash(k * 17) > 0.5 ? 700 : 400,
            }}
          >
            {upper ? ch.toUpperCase() : ch.toLowerCase()}
          </span>
        );
      })}
    </span>
  );
}
