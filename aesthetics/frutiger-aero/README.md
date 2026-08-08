# 01 · Frutiger Aero

**Fiction:** *AquaOS 2004 — Product Tour, build 2004.11.* A defunct operating system's
marketing demo, still running years after anyone stopped shipping it.

**Canvas:** 1600×900, `fit`. No scroll. Letterbox `#02243f`.

## What makes this aesthetic work

In priority order — get these wrong and it reads as 2010s glassmorphism instead:

1. **Specular highlights.** A hard white gradient across the *top half* of every
   surface (`.glass::after`, `.dockIcon::after`, `.knob::after`). This is what "glossy"
   physically is. It's the single biggest lever on the page.
2. **Transparency with saturation.** `backdrop-filter: blur() saturate(1.5)` — colour
   must bleed *through* panels, not grey out behind them.
3. **Vivid, optimistic blue** with a light source top-left. Resist washing the sky out.
4. **Generous radii.** 2004 was not afraid of a 20px corner.

## Interaction inventory

| Element | Behaviour |
|---|---|
| Anywhere | Click releases a burst of bubbles + a ripple + a droplet sound |
| Bubbles | Rise, wobble, pop on cursor contact and at the surface |
| Fish (14) | Curious beyond ~90px, startle inside it. Only chase when the cursor is below the waterline |
| Caustics | Five crossing sine bands on independent cycles — generated, never looped |
| **Frost** slider | Drives `--aq-blur` on every panel live, including the one it sits in |
| **Water level** slider | Moves the horizon 640px→120px. Fish and caustics re-region live |
| **Specular gloss** toggle | Removes blur *and* every specular. The aesthetic's own A/B test |
| **Marine life** toggle | Empties the tank |
| **Caustics** toggle | Kills the light bands |
| Tabs | Three product-tour steps |
| Dock (6) | Hover lift + label; click bursts bubbles at the icon and plays a pitched droplet |
| **Easter egg** | Water level past 84.5% floods the page — sky desaturates, panels bob, fish swim past the UI |

## Audio

Synthesised, not sampled (`lib/audio.ts`): droplet on click, pop per bubble, two-note
chime on toggle, tick per 10% of slider travel. No files, no bucket bytes, nothing to
load behind a channel transition. Muted by default.

## Notes and gotchas

- **Icons are SVG, not emoji.** `🫧` renders as tofu without a current emoji font
  (headless Chromium included), and flat emoji contradict the aesthetic. See `AquaIcon.tsx`.
- **The glass needs a blue underlay.** The white gloss layer alone left the lower half
  of every panel milky — `backdrop-filter` picks up the bright waterline and blurs it
  into a haze that swallowed white text. The second gradient in `.glass` establishes a
  contrast floor that holds regardless of what's behind, which matters because the
  water level is a *slider*.
- **Centred elements need their offset in every keyframe.** `.dock` is centred with
  `translateX(-50%)`; an animation's `transform` replaces rather than composes, so the
  shared `bob` keyframes threw it half a screen right when flooded. Hence `bobDock`.
- **One rAF loop** for caustics, fish and bubbles. Three separate loops tripled paint
  churn behind a full-screen `backdrop-filter`, which is by far the most expensive
  thing here.

## Still to do

- **Photography.** Currently entirely CSS/canvas. Manifest slots `frutiger_bubble_*`,
  `frutiger_fish_*`, `frutiger_waterdrop_*`, `frutiger_skyscraper_*` and
  `frutiger_vista_wall` are declared but empty — real macro bubbles and cut-out fish
  layered over the canvas ones will lift this a long way.
- Grass/hill layer at the waterline (`frutiger_grass`).
- A real 2004-era UI font; currently Segoe UI/Tahoma.
