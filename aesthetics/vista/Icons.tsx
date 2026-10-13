import { useId } from "react";

/**
 * Windows Vista icon set. Vista-era icons were rendered objects — a glass orb with a hard
 * specular cap, a soft floor reflection and a saturated body — so every icon here is
 * built from the same three layers: body gradient, the white "wet" highlight over the
 * top half, and a rim light along the bottom edge.
 *
 * SVG rather than raster: they're UI chrome (see OPEN_QUESTIONS #15 — interface is
 * rebuilt, photography is real) and have to stay crisp at 16px and 64px.
 */

export type IconName =
  | "computer"
  | "recycle"
  | "media"
  | "messenger"
  | "gallery"
  | "personalize"
  | "aquarium"
  | "welcome"
  | "internet"
  | "folder"
  | "games"
  | "flip"
  | "desktop"
  | "power"
  | "music"
  | "search";

export function Icon({ name, size = 48 }: { name: IconName; size?: number }) {
  const id = useId().replace(/:/g, "");
  const g = (s: string) => `${id}${s}`;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id={g("gloss")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".95" />
          <stop offset="1" stopColor="#fff" stopOpacity=".08" />
        </linearGradient>
        <radialGradient id={g("rim")} cx=".5" cy="1" r=".6">
          <stop offset="0" stopColor="#fff" stopOpacity=".7" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={g("blue")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7fd4ff" />
          <stop offset=".5" stopColor="#1f8fe0" />
          <stop offset="1" stopColor="#0a4fa8" />
        </linearGradient>
        <linearGradient id={g("green")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c8f77a" />
          <stop offset=".5" stopColor="#56c421" />
          <stop offset="1" stopColor="#1f7a12" />
        </linearGradient>
        <linearGradient id={g("aqua")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9ff5ea" />
          <stop offset=".5" stopColor="#1cc2b0" />
          <stop offset="1" stopColor="#0a7a78" />
        </linearGradient>
        <linearGradient id={g("orange")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe08a" />
          <stop offset=".5" stopColor="#ff9d1c" />
          <stop offset="1" stopColor="#c35a05" />
        </linearGradient>
        <linearGradient id={g("silver")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".55" stopColor="#c9d4de" />
          <stop offset="1" stopColor="#7d8c99" />
        </linearGradient>
        <linearGradient id={g("screen")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#bdf0ff" />
          <stop offset=".45" stopColor="#3aa7ef" />
          <stop offset=".46" stopColor="#62c84a" />
          <stop offset="1" stopColor="#2a8a1c" />
        </linearGradient>
        <filter id={g("sh")} x="-30%" y="-30%" width="160%" height="170%">
          <feDropShadow dx="0" dy="1.6" stdDeviation="1.4" floodColor="#002" floodOpacity=".45" />
        </filter>
      </defs>
      <g filter={`url(#${g("sh")})`}>{BODY[name](g)}</g>
    </svg>
  );
}

type Body = (g: (s: string) => string) => React.ReactNode;

const orb = (g: (s: string) => string, fill: string, inner?: React.ReactNode) => (
  <>
    <circle cx="24" cy="24" r="20" fill={`url(#${g(fill)})`} stroke="rgba(0,40,80,.35)" strokeWidth=".8" />
    {inner}
    <ellipse cx="24" cy="15" rx="15" ry="9.5" fill={`url(#${g("gloss")})`} />
    <ellipse cx="24" cy="40" rx="12" ry="4" fill={`url(#${g("rim")})`} />
  </>
);

const BODY: Record<IconName, Body> = {
  computer: (g) => (
    <>
      <rect x="4" y="6" width="40" height="29" rx="3" fill={`url(#${g("silver")})`} stroke="#56626e" strokeWidth=".8" />
      <rect x="7" y="9" width="34" height="22" rx="1.5" fill={`url(#${g("screen")})`} />
      <path d="M7 9h34v9C30 14 18 14 7 20z" fill="#fff" opacity=".45" />
      <path d="M18 35h12l2 6H16z" fill={`url(#${g("silver")})`} stroke="#56626e" strokeWidth=".6" />
      <rect x="12" y="41" width="24" height="3" rx="1.5" fill={`url(#${g("silver")})`} stroke="#56626e" strokeWidth=".6" />
    </>
  ),
  recycle: () => (
    <>
      <path d="M11 12h26l-3 31H14z" fill="rgba(210,235,255,.55)" stroke="#6f8fa8" strokeWidth=".9" />
      <ellipse cx="24" cy="12" rx="13" ry="3.5" fill="rgba(235,248,255,.8)" stroke="#6f8fa8" strokeWidth=".9" />
      <path d="M17 28l4-6 4 6h-3v5h-2v-5zM30 30l-2 7-6-2 2-1-1-3 2-1 1 3z" fill="#2fa84a" />
      <path d="M13 14h9L17 40h-2z" fill="#fff" opacity=".35" />
    </>
  ),
  media: (g) =>
    orb(g, "orange", <path d="M19 14l14 10-14 10z" fill="#fff" stroke="rgba(120,50,0,.4)" strokeWidth=".6" />),
  messenger: (g) => (
    <>
      <circle cx="17" cy="15" r="7" fill={`url(#${g("green")})`} stroke="#1c6a10" strokeWidth=".7" />
      <path d="M5 38c0-10 5-15 12-15s12 5 12 15z" fill={`url(#${g("green")})`} stroke="#1c6a10" strokeWidth=".7" />
      <circle cx="31" cy="17" r="7" fill={`url(#${g("blue")})`} stroke="#0a3f80" strokeWidth=".7" />
      <path d="M19 41c0-10 5-15 12-15s12 5 12 15z" fill={`url(#${g("blue")})`} stroke="#0a3f80" strokeWidth=".7" />
      <ellipse cx="31" cy="13.5" rx="4.5" ry="2.6" fill="#fff" opacity=".7" />
      <ellipse cx="17" cy="11.5" rx="4.5" ry="2.6" fill="#fff" opacity=".7" />
      <path d="M21 30c3-3 17-3 20 2" stroke="#fff" strokeOpacity=".45" strokeWidth="2" fill="none" />
    </>
  ),
  gallery: (g) => (
    <>
      <rect x="9" y="5" width="32" height="26" rx="2" transform="rotate(8 25 18)" fill="#fff" stroke="#8aa" strokeWidth=".7" />
      <rect x="5" y="12" width="34" height="28" rx="2" fill="#fff" stroke="#789" strokeWidth=".8" />
      <rect x="8" y="15" width="28" height="19" fill={`url(#${g("screen")})`} />
      <circle cx="30" cy="20" r="3" fill="#fff6a0" />
      <path d="M8 34l8-9 6 6 4-4 10 7z" fill="#2f8f22" />
    </>
  ),
  personalize: (g) => (
    <>
      <rect x="4" y="8" width="40" height="30" rx="3" fill={`url(#${g("silver")})`} stroke="#667" strokeWidth=".7" />
      <rect x="7" y="11" width="34" height="23" fill={`url(#${g("screen")})`} />
      <circle cx="14" cy="42" r="4" fill="#ff4f7b" />
      <circle cx="24" cy="42" r="4" fill="#ffd12e" />
      <circle cx="34" cy="42" r="4" fill="#3ad16a" />
      <path d="M7 11h34v7C28 14 18 15 7 19z" fill="#fff" opacity=".45" />
    </>
  ),
  aquarium: (g) =>
    orb(
      g,
      "aqua",
      <>
        <path d="M13 26c5-6 12-6 16 0-4 6-11 6-16 0zM29 26l7-5v10z" fill="#ffb02e" stroke="#b35a00" strokeWidth=".6" />
        <circle cx="17" cy="25" r="1.2" fill="#123" />
        <circle cx="33" cy="15" r="1.6" fill="none" stroke="#fff" strokeWidth=".7" />
        <circle cx="36" cy="10" r="1" fill="none" stroke="#fff" strokeWidth=".6" />
      </>,
    ),
  welcome: (g) =>
    orb(
      g,
      "green",
      <path d="M24 12c-2 6-9 7-9 14a9 9 0 0018 0c0-7-7-8-9-14z" fill="#e9ffd0" opacity=".9" />,
    ),
  internet: (g) =>
    orb(
      g,
      "blue",
      <>
        <path d="M10 20c4-4 8-2 10 1s6 1 5 5-6 3-7 8-5 3-7-1-4-9-1-13z" fill="#5fd13c" opacity=".95" />
        <path d="M28 10c3 2 7 2 9 7s-2 6-5 5-4-5-4-12z" fill="#5fd13c" opacity=".95" />
        <path d="M31 31c2-2 6 0 5 3s-4 4-6 2z" fill="#5fd13c" />
      </>,
    ),
  folder: () => (
    <>
      <path d="M4 12a2 2 0 012-2h12l4 4h20a2 2 0 012 2v24a2 2 0 01-2 2H6a2 2 0 01-2-2z" fill="#e8b93a" stroke="#9a6d0c" strokeWidth=".7" />
      <path d="M4 19h40v21a2 2 0 01-2 2H6a2 2 0 01-2-2z" fill="#ffd865" stroke="#9a6d0c" strokeWidth=".7" />
      <path d="M4 19h40v8C30 23 16 23 4 28z" fill="#fff" opacity=".45" />
    </>
  ),
  games: (g) => (
    <>
      <path d="M8 18c2-5 8-5 11-3h10c3-2 9-2 11 3l4 14c1 5-5 8-8 3l-3-4H15l-3 4c-3 5-9 2-8-3z" fill={`url(#${g("silver")})`} stroke="#556" strokeWidth=".8" />
      <circle cx="33" cy="21" r="2" fill="#3ad16a" />
      <circle cx="37" cy="25" r="2" fill="#e8413a" />
      <circle cx="29" cy="25" r="2" fill="#2f8ef0" />
      <circle cx="33" cy="29" r="2" fill="#ffc21e" />
      <path d="M13 21h2v3h3v2h-3v3h-2v-3h-3v-2h3z" fill="#445" />
      <path d="M10 16c4-2 24-2 28 0" stroke="#fff" strokeWidth="2" opacity=".7" fill="none" />
    </>
  ),
  flip: (g) => (
    <>
      {[0, 1, 2].map((i) => (
        <rect key={i} x={6 + i * 6} y={10 + i * 4} width="24" height="18" rx="2" fill={`url(#${g("blue")})`} stroke="#fff" strokeOpacity=".7" strokeWidth=".8" transform={`skewY(-8)`} opacity={0.6 + i * 0.2} />
      ))}
    </>
  ),
  desktop: (g) => <rect x="6" y="8" width="36" height="30" rx="2" fill={`url(#${g("screen")})`} stroke="#fff" strokeWidth="1" />,
  power: (g) =>
    orb(
      g,
      "orange",
      <path d="M24 13v11M17 17a10 10 0 1014 0" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />,
    ),
  music: (g) =>
    orb(g, "blue", <path d="M20 32a3 3 0 11-2-3V15l12-3v15a3 3 0 11-2-3V16l-8 2z" fill="#fff" />),
  search: () => (
    <>
      <circle cx="20" cy="20" r="11" fill="rgba(200,240,255,.5)" stroke="#2c6fa8" strokeWidth="3" />
      <path d="M28 28l12 12" stroke="#2c6fa8" strokeWidth="5" strokeLinecap="round" />
    </>
  ),
};

/** The Start orb — its own thing: a glass sphere with the Windows Vista droplet-leaf inside. */
export function StartOrb({ lit }: { lit: boolean }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden style={{ display: "block", overflow: "visible" }}>
      <defs>
        <radialGradient id={`${id}b`} cx=".5" cy=".75" r=".75">
          <stop offset="0" stopColor={lit ? "#b8ff7a" : "#6fe07a"} />
          <stop offset=".45" stopColor={lit ? "#29c05e" : "#139a52"} />
          <stop offset="1" stopColor="#063a2c" />
        </radialGradient>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".9" />
          <stop offset="1" stopColor="#fff" stopOpacity=".05" />
        </linearGradient>
        <radialGradient id={`${id}h`} cx=".5" cy=".5" r=".5">
          <stop offset=".6" stopColor="#bfffd9" stopOpacity={lit ? 0.7 : 0.25} />
          <stop offset="1" stopColor="#bfffd9" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="31" fill={`url(#${id}h)`} />
      <circle cx="32" cy="32" r="24" fill={`url(#${id}b)`} stroke="rgba(0,30,20,.8)" strokeWidth="1.2" />
      <circle cx="32" cy="32" r="22.5" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="1" />
      {/* the droplet-leaf mark */}
      <path d="M32 18c-5 8-10 11-10 17a10 10 0 0020 0c0-6-5-9-10-17z" fill="#eaffea" opacity=".95" />
      <path d="M32 26c-2 4-5 6-5 9a5 5 0 005 5" fill="none" stroke="#1f9a4a" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="32" cy="21" rx="17" ry="10" fill={`url(#${id}g)`} />
    </svg>
  );
}
