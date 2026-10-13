import m from "./meet.module.css";

/**
 * The sticker sheet. These used to be six coloured rectangles with a word in each.
 * Real ones are die-cut: a shape, a white vinyl border the cutter leaves round it,
 * and — on the good ones — holographic film that goes green and pink as you move.
 */

export interface Sticker {
  id: string;
  name: string;
  art: "wakaba" | "sakura" | "wings" | "ring" | "neko" | "turbo" | "flag" | "slap";
  text?: string;
  cls?: string;
}

export const STICKERS: Sticker[] = [
  { id: "wakaba", name: "shoshinsha mark — new driver", art: "wakaba" },
  { id: "sakura", name: "sakura", art: "sakura" },
  { id: "wings", name: "hashiriya heart", art: "wings" },
  { id: "ring", name: "tsurikawa — a train handle, stolen", art: "ring" },
  { id: "neko", name: "lucky cat", art: "neko" },
  { id: "turbo", name: "holo TURBO badge", art: "turbo" },
  { id: "flag", name: "touge champion", art: "flag" },
  { id: "itai", name: "itasha slap", art: "slap", text: "痛車", cls: "pink" },
  { id: "yoro", name: "yoroshiku — bōsōzoku kanji", art: "slap", text: "夜露死苦", cls: "gold" },
  { id: "drift", name: "drift slap", art: "slap", text: "ドリフト ≫", cls: "cyan" },
  { id: "low", name: "low & slow", art: "slap", text: "low & slow", cls: "script" },
  { id: "club", name: "midnight club slap", art: "slap", text: "MID NIGHT", cls: "chrome" },
];

export function Decal({ s }: { s: Sticker }) {
  if (s.art === "slap") return <span className={`${m.slap} ${m[s.cls ?? "pink"]}`}>{s.text}</span>;
  return (
    <svg className={m.art} viewBox="-32 -32 64 64" aria-hidden>
      {s.art === "wakaba" && (
        <>
          <path d="M0 -26 L22 -18 V8 L0 26 L-22 8 V-18Z" fill="#fff" />
          <path d="M0 -21 L-18 -14.5 V6.5 L0 21Z" fill="#ffe100" />
          <path d="M0 -21 L18 -14.5 V6.5 L0 21Z" fill="#2fb344" />
        </>
      )}
      {s.art === "sakura" && (
        <>
          {[0, 72, 144, 216, 288].map((a) => (
            <path key={a} d="M0 0 C-11 -8 -11 -22 -3 -27 L0 -23 L3 -27 C11 -22 11 -8 0 0Z" transform={`rotate(${a})`} fill="#ffb7d5" stroke="#fff" strokeWidth="3" strokeLinejoin="round" paintOrder="stroke" />
          ))}
          <circle r="4.5" fill="#ff5f9e" />
          {[0, 72, 144, 216, 288].map((a) => (
            <circle key={a} r="1.3" cy="-9" transform={`rotate(${a + 36})`} fill="#c2185b" />
          ))}
        </>
      )}
      {s.art === "wings" && (
        <g stroke="#fff" strokeWidth="3.4" strokeLinejoin="round" paintOrder="stroke">
          <path d="M-9 -2 C-22 -16 -30 -10 -30 -3 C-26 -6 -22 -5 -20 -2 C-26 -3 -29 2 -27 7 C-22 3 -17 4 -12 8Z" fill="#fff5fb" stroke="#ff3ea5" strokeWidth="1.6" />
          <path d="M9 -2 C22 -16 30 -10 30 -3 C26 -6 22 -5 20 -2 C26 -3 29 2 27 7 C22 3 17 4 12 8Z" fill="#fff5fb" stroke="#ff3ea5" strokeWidth="1.6" />
          <path d="M0 18 C-22 2 -14 -14 -5 -10 C-2 -9 0 -6 0 -4 C0 -6 2 -9 5 -10 C14 -14 22 2 0 18Z" fill="#ff3ea5" />
        </g>
      )}
      {s.art === "ring" && (
        <>
          <path d="M-7 -28 H7 V-12 H-7Z" fill="#7b3cff" stroke="#fff" strokeWidth="3" paintOrder="stroke" />
          <circle cy="4" r="19" fill="none" stroke="#fff" strokeWidth="13" />
          <circle cy="4" r="19" fill="none" stroke="#ffe9f5" strokeWidth="8" />
          <circle cy="4" r="19" fill="none" stroke="#ff8fc7" strokeWidth="2" strokeDasharray="3 5" />
        </>
      )}
      {s.art === "neko" && (
        <g stroke="#fff" strokeWidth="3.4" strokeLinejoin="round" paintOrder="stroke">
          <path d="M-20 -6 L-18 -26 L-6 -16 H6 L18 -26 L20 -6 C22 12 12 22 0 22 C-12 22 -22 12 -20 -6Z" fill="#fff7ea" stroke="#1a1024" strokeWidth="1.8" />
          <path d="M-18 -26 L-15 -13 L-9 -18Z M18 -26 L15 -13 L9 -18Z" fill="#ff8fc7" stroke="none" />
          <path d="M-12 -2 Q-8 -7 -4 -2 M4 -2 Q8 -7 12 -2" fill="none" stroke="#1a1024" strokeWidth="2" />
          <path d="M-3 5 H3 L0 8Z" fill="#ff3ea5" stroke="none" />
          <path d="M0 8 Q-4 13 -8 10 M0 8 Q4 13 8 10" fill="none" stroke="#1a1024" strokeWidth="1.6" />
          <circle cx="-13" cy="6" r="3" fill="#ffb7d5" stroke="none" />
          <circle cx="13" cy="6" r="3" fill="#ffb7d5" stroke="none" />
        </g>
      )}
      {s.art === "turbo" && (
        <>
          <rect x="-29" y="-13" width="58" height="26" rx="13" className={m.holo} stroke="#fff" strokeWidth="3" />
          <text y="6" textAnchor="middle" fontFamily="'Arial Black', Impact, sans-serif" fontStyle="italic" fontSize="15" fill="#1a1024">
            TURBO
          </text>
        </>
      )}
      {s.art === "flag" && (
        <>
          <path d="M0 -27 L7.5 -9 L27 -8 L12 4.5 L17 23.5 L0 13 L-17 23.5 L-12 4.5 L-27 -8 L-7.5 -9Z" fill="#fff" />
          <path d="M0 -20 L5.5 -6.5 L20 -5.6 L9 3.6 L12.6 17.6 L0 9.8 L-12.6 17.6 L-9 3.6 L-20 -5.6 L-5.5 -6.5Z" className={m.holo} />
          <text y="4" textAnchor="middle" fontFamily="'Arial Black', Impact, sans-serif" fontSize="9" fill="#1a1024">
            峠
          </text>
        </>
      )}
    </svg>
  );
}
