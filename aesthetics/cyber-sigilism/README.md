# 23 · Cyber Sigilism — ✦ Cyber Sigil ✦

Redesigned 2026-09-28. Mark: *"needs redesigned — there's no diamond shapes or stylistic
things, the devices are cool but don't look realistic. Everything needs fleshed out
and overhauled."*

- **Actual cyber-sigilism.** `Sigil.tsx` generates tattoo-flash sigils from a seed:
  mirror-symmetric, a vertical spine, thorned branches with barbs, needle-tapered
  points, a diamond heart — rendered as liquid chrome (sky/ground reflection gradient
  with a hard horizon flip, SVG specular lighting, white rim). Four-point diamond
  sparkles twinkle everywhere; the cursor leaves a trail of ✦. Blackletter chrome
  title (Pirata One), Syne Mono body.
- **Real devices** (Wikipedia/Evan-Amos and Flickr CC, matted; the Razr flood-keyed by
  `scripts/images/whitekey.mjs`): iPod 4G, Motorola RAZR V3, GBA SP, PSP, Tamagotchi —
  each with a **live screen** laid onto its real glass.
- **Flash sheet:** nine sigils; pick one (or "generate new") and it's inked onto the hero
  and every device screen. Persisted.

| Device | Behaviour |
|---|---|
| iPod | drag around the real click wheel to scroll the track list (piezo tick); centre plays the generated "sigilcore" track (supersaw pad, gliding 808, triplet hats, bells) |
| RAZR | outer screen shows the time + sigil; inner screen cycles messages |
| GBA SP | boots SIGIL QUEST |
| PSP | the XMB wave; tap to move along the categories |
| Tamagotchi | feed it; the pet is your sigil, pixelated |

Also fixed in `lib/assets.ts`: `cutN()` now prefers the file in `cutout/` — Wikipedia
PNGs already carry alpha, so the original (white box and all) used to win.
