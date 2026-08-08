# 07 · Neon

**Fiction:** *SPECTRUM* — a configurator for an avatar made entirely of light.

**Canvas:** 1600×900, `fit`. No scroll. Letterbox `#0a0210`. **No assets.**

## The argument this page makes

Neon is a **light source**, not a colour. Treating it as a colour is the mistake, and
the difference is four specific things:

1. **Glow is layered, not single.** A real tube has a white-hot core, a saturated halo,
   and a wide dim bloom. One `box-shadow` gives you a sticker; four at increasing radius
   and decreasing alpha give you light.
2. **Light lands on things.** Every surface reads `--hue` from one custom property, so
   dragging the wheel relights the background, panels, floor, figure and tubes together.
   If a magenta tube doesn't tint the surface under it, the brain reads it as a printed
   shape.
3. **The background is never black** — it's a very dark version of the lit colour. Pure
   black kills the sense that light is filling a room.
4. **Saturation over brightness.** Neon reads as neon at 60–70% lightness with maximum
   chroma. At 100% lightness everything blows out to white.

## Interaction inventory

| Element | Behaviour |
|---|---|
| Hue wheel | Drag anywhere on the ring; angle from centre sets hue. Arrow keys nudge by 8° |
| 6 presets | Jump to a hue with a two-note chime |
| RGB cycle | Runs the hue continuously; the button hue-rotates along with it |
| Tubes (6) | Click the tube itself **or** its row switch. Each carries a hue offset from the master, so the rig stays polychromatic at every setting |
| Strike | Switching a cold tube on stutters four times before it holds. Off is instant |
| Intensity | Drives scene-wide `saturate()` + `brightness()`. Warns above 94% |
| **Easter egg** | All six tubes on **and** intensity at 100 blows the rig — whiteout, then everything resets to off |

## Notes and gotchas

- **`gradientUnits="userSpaceOnUse"` is load-bearing.** With the default
  `objectBoundingBox`, a perfectly vertical or horizontal stroke has a zero-width or
  zero-height bounding box, the gradient degenerates, and the stroke renders as
  **nothing**. This silently deleted the figure's torso and both accent lines while
  every diagonal drew fine — a fault that looks like a missing path, not a gradient bug.
- Hue offsets per tube are applied in CSS via `calc(var(--hue) + Ndeg)`, so a single
  state value drives eighteen different glows without any per-tube JS.
- The floor grid is masked with a gradient rather than faded with opacity, so the
  vertical lines vanish into the horizon instead of dimming uniformly.
- Sliders and the wheel stop keyboard propagation — the dial listens for arrows globally.

## Still to do

- `neon_avatar` — real Roblox-style avatars with neon clothing, to replace the SVG figure.
- Light *trails* on the wheel knob while dragging.
- A tube that flickers permanently, because one always does.
