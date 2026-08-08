# 18 · Windows 98

**Fiction:** SYNERGYCORP INTRANET v2.1. Nobody has updated it since 1999 and the
assistant has opinions.

**Canvas:** 1600×900, `fit`. No scroll. **No assets.** Drawn entirely in CSS.

## Why drawn and not screenshotted

This interface is **pure geometry** — four colours and a bevel rule — so CSS reproduces
it exactly *and* it stays interactive, which a pasted screenshot never could. That's the
whole argument for rebuilding rather than compositing on the UI-heavy channels
(Wii, PS1, Xbox 360 follow the same reasoning).

**The bevel rule, which is the entire aesthetic:**
- **Raised** = white top/left, dark bottom/right, mid-grey face
- **Sunken** = the same, inverted
- **Pressed** = a raised element with its borders swapped

Two-pixel borders, not one. A single-pixel border reads as flat and modern; the doubling
is what makes it look like plastic.

The only gradient anywhere is the title bar — that arrived in 98 and is the period marker
separating it from 95.

## Interaction inventory

| Element | Behaviour |
|---|---|
| Window manager | Real: drag by title bar, focus, z-order, minimise, maximise, close, double-click to maximise |
| Taskbar | A button per window; click to focus, click again to minimise |
| Start menu | Cascading items, pressed-state Start button, vertical banner |
| Desktop icons | My Computer, Network, Recycle Bin, Solitaire |
| Network Neighborhood | Lists all 23 channels; clicking one is a real route change |
| **Error cascade** | Closing an error spawns **two more**. Capped at 7 — the joke is the cascade, uncapped would just lock the page |
| Clippy | Cycles seven lines on its own schedule. "Yes" opens an error. There is no dismiss button… |
| **Easter egg** | …until the last line, where "Stop talking" appears. You have to let it finish to get rid of it |
| Solitaire | A waste of time you have apparently been at for four hours |

## Notes and gotchas

- **React StrictMode runs mount effects twice in dev.** The portal opened twice and left
  two identical taskbar buttons. Guarded with a `booted` ref.
- **The hint sits at `left: 120px`** — the viewport-fixed dial covers bottom-right. Third
  channel to hit this; it's now a known trap.
- Window drag goes through `toCanvasSpace()`, so it tracks the cursor at any scale.
- The error cascade reads `wins` from the closure deliberately — it needs the count
  *before* the removal, to decide whether to spawn.

## Still to do

- Right-click context menus on the desktop.
- Window resize handles (drag is done; resize isn't).
- A real Clippy sprite instead of the 📎 glyph — one of the few places a genuine asset
  would beat drawing it, since Clippy's charm is in the animation.
- `win98_stockphoto` — 90s corporate stock photography for the portal page. 15 harvested,
  quality unverified.
