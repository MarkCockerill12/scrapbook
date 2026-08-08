/**
 * Icons, drawn rather than typed.
 *
 * Emoji were the obvious shortcut and the wrong answer twice over: newer glyphs like
 * 🫧 render as tofu on machines without an up-to-date emoji font (headless Chromium
 * included, which is how this was caught), and flat emoji are exactly the aesthetic
 * this page is arguing against. 2004 icons were rendered objects with a light source.
 *
 * Each shape gets the same treatment: a body, a hard specular cap on the top third,
 * and a soft floor shadow.
 */

export type AquaIconName = "fish" | "droplet" | "bubble" | "wave" | "sun" | "island";

export function AquaIcon({
  name,
  size = 34,
}: {
  name: AquaIconName;
  size?: number;
}) {
  const id = `aq-${name}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden
      style={{ display: "block", filter: "drop-shadow(0 2px 3px rgba(0,30,60,.45))" }}
    >
      <defs>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity=".97" />
          <stop offset="45%" stopColor="#d8f4ff" stopOpacity=".92" />
          <stop offset="100%" stopColor="#8ed4f2" stopOpacity=".95" />
        </linearGradient>
        <linearGradient id={`${id}-spec`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity=".95" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {name === "fish" && (
        <>
          <path
            d="M31 24c0 6-6 10-12 10S8 30 8 24s5-10 11-10 12 4 12 10Z"
            fill={`url(#${id}-body)`}
          />
          <path d="M31 24l9-7v14l-9-7Z" fill={`url(#${id}-body)`} />
          <ellipse cx="17" cy="18" rx="7" ry="2.6" fill={`url(#${id}-spec)`} />
          <circle cx="13" cy="22" r="2" fill="#0b3c62" />
        </>
      )}

      {name === "droplet" && (
        <>
          <path d="M24 6c8 11 12 16 12 22a12 12 0 0 1-24 0c0-6 4-11 12-22Z" fill={`url(#${id}-body)`} />
          <ellipse cx="20" cy="18" rx="4" ry="7" fill={`url(#${id}-spec)`} />
        </>
      )}

      {name === "bubble" && (
        <>
          <circle cx="19" cy="27" r="13" fill={`url(#${id}-body)`} opacity=".9" />
          <circle cx="34" cy="15" r="7" fill={`url(#${id}-body)`} opacity=".8" />
          <ellipse cx="15" cy="20" rx="5" ry="3.4" fill={`url(#${id}-spec)`} />
          <circle cx="32" cy="12" r="2.2" fill="#ffffff" opacity=".95" />
        </>
      )}

      {name === "wave" && (
        <>
          <path
            d="M4 30c6 0 6-7 12-7s6 7 12 7 6-7 12-7 4 3 8 3v12H4V30Z"
            fill={`url(#${id}-body)`}
          />
          <path d="M4 30c6 0 6-7 12-7s6 7 12 7 6-7 12-7 4 3 8 3" stroke="#ffffff" strokeWidth="2" opacity=".85" />
        </>
      )}

      {name === "sun" && (
        <>
          {Array.from({ length: 8 }).map((_, i) => (
            <rect
              key={i}
              x="22.5"
              y="2"
              width="3"
              height="8"
              rx="1.5"
              fill="#fff3c4"
              opacity=".9"
              transform={`rotate(${i * 45} 24 24)`}
            />
          ))}
          <circle cx="24" cy="24" r="11" fill="#ffe27a" />
          <circle cx="24" cy="24" r="11" fill={`url(#${id}-spec)`} opacity=".7" />
        </>
      )}

      {name === "island" && (
        <>
          <path d="M6 36h36c-4 4-10 6-18 6s-14-2-18-6Z" fill={`url(#${id}-body)`} />
          <path d="M25 35c-1-8-2-13-4-19" stroke="#c79a63" strokeWidth="3.4" strokeLinecap="round" />
          <g fill="#6fd97f">
            <path d="M21 16c-7-4-13 0-14 4 5-4 10-3 14-1Z" />
            <path d="M21 16c7-4 14-1 15 3-6-4-11-2-15-1Z" />
            <path d="M21 16c-3-6 0-11 4-12-3 4-3 8-2 12Z" />
          </g>
        </>
      )}
    </svg>
  );
}
