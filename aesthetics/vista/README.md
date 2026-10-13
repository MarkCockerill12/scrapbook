# 01 · Frutiger Aero — AquaOS

**Fiction:** *AquaOS*, a 2007 desktop that never shipped: Vista glass, the Windows 7
superbar, a Zune in the drive bay and a green hill for a wallpaper.

Redesigned 2026-09-28 (Mark: "more like the actual theme, more green, more
interactions, keep the UI and buttons"). The old single product-tour panel over a
drawn aquarium is gone.

**Canvas:** 1600×900 `fit`.

## What it's made of

- **Real photography** — wallpapers are Commons landscapes and genuine Frutiger Aero
  stock art from the Aesthetics Wiki (`fa_ref`, `fa_hills`, `fa_dew`, `fa_aurora`);
  butterflies and aquarium fish are rembg cutouts (`fa_butterfly`, `fa_fish`).
- **Rebuilt UI** — every window, button, gadget and icon is CSS/SVG (OPEN_QUESTIONS
  #15). Glass is `backdrop-filter: blur saturate` over a `--tint` rgb token.
- **Generated music** — four Media Player tracks written as scores in `music.ts`
  on `lib/music.ts` (maj7 e-piano, bell arpeggio, sine bass, reverb).

## Interaction inventory

| Element | Behaviour |
|---|---|
| Desktop | click = bubble burst + droplet; drag = Vista selection rectangle over icons |
| Desktop icons | select / double-click to open; Recycle Bin empties into bubbles |
| Windows | drag by title, min/max/close, double-click title to maximise, focus z-order, inactive windows desaturate |
| Start orb | Win7 start menu: programs, search filter, Games › other channels, Shut down → reboot |
| Taskbar | show desktop, Flip 3D (wheel/Tab/Esc, click to pick), task buttons minimise/restore |
| Welcome Center | launches everything, incl. Flip 3D and the screen saver |
| Media Player | 4 generated tracks, play unmutes the site, visualiser driven by the score |
| Messenger | contacts are other channels' residents; chat with replies + typing, Nudge shakes the window, "Visit their page" travels |
| Photo Gallery | 24 stock images, rotate, full-screen Ken Burns slide show |
| Personalize | 8 wallpapers (crossfade), 8 Win7 glass colours, transparency, intensity — persisted |
| AquaTank | real fish cutouts swim; click to sprinkle food, fish chase and eat it |
| Gadgets | live clock, weather (sunny → rain w/ drops + rain audio → rainbow → night aurora), CPU meter, slideshow → Gallery |
| Idle 50s | Vista "Bubbles" screen saver over the live desktop |
| Toasts | contacts sign in with the three-note chime |

## Gotchas

- Hand-picked photos use `img(a, slot, n)` (file number). `pic()` skips PNGs with
  alpha, and two stock images are PNGs — every later pick was shifted by two.
- Persisted settings load in an effect, not `useState` initialisers (hydration).
- Butterflies run their own rAF component so the desktop isn't re-rendered 60×/s
  under a dozen `backdrop-filter`s.
