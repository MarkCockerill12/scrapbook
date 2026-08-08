# 05 · Tropical Night — BUILT, NOT SHIPPED

**Fiction:** Kai's Tiki Lounge, tonight's menu. Somewhere warm, after dark.

**Status: held back.** The code is complete and the cutout pipeline works. It is not
live because **the photography is the wrong material**, and shipping it would breach
rule R4 (quality gate before moving on).

## What went wrong — worth recording

This was the first channel composited from real photography, and it's the honest test
of auto-harvesting. It failed, in an instructive way. What the harvester returned for
these queries:

| Slot | Query | What actually arrived |
|---|---|---|
| `tiki_sunset` | "beach sunset ocean orange sky" | **An airport.** Aeroplane tail, runway lights |
| `tiki_lantern` | "paper lantern lit night" | A Japanese castle, and some flowers |
| `tiki_carving` | "tiki carving wooden totem" | Grey stone posts |
| `tiki_torch` | "tiki torch flame night" | Wooden posts with small unrelated flames |

**The lesson: open-licensed search is good at CATEGORIES and bad at SCENES.** It reliably
returns "a thing broadly matching these words". It does not return "a thing that belongs
in *this* picture". For a page whose whole substance is one coherent place, that gap is
fatal, and no amount of colour grading closes it — a graded airport is still an airport.

Contrast the channels that work: Frutiger Aero, Matrix, BBS, Deep Sea and Neon are all
drawn, and all stronger. Photography only pays off when it is *curated*.

## What the code does (all working)

| Element | Behaviour |
|---|---|
| Torches (4) | Click to extinguish or relight. Two nested glows on different periods so the flicker never loops |
| Scene light | Every lit torch raises brightness on the cutouts, lanterns and shelf |
| Sun slider | Drives exposure, saturation and hue together — dimming alone reads as a screenshot with the brightness down, not as dusk |
| Wind slider | Sways palms and lanterns on independent phases |
| Menu | Eight drinks; picking one pours a layered glass. Persisted |
| Water | Click for a ripple |
| **Easter egg** | Put every torch out — the water fills with bioluminescent plankton and the ripples turn green |

## Compositing rules the stylesheet follows

1. **Cutouts need a shadow or they float** — and a *warm* one. A black drop-shadow on a
   firelit scene is the fastest way to make a cutout look pasted on.
2. **Tint everything to one light.** Photos arrive with their own white balance; a shared
   warm grade is what makes unrelated images read as one place at one time.
3. **The light is low, warm, and comes from the torches.**
4. **Darkness is the point** — but the first pass over-graded it. A dark sun default plus
   a multiply grade plus a heavy vignette compounded into mud. All three were reduced.

## To ship this

Needs curated photography for `tiki_sunset`, `tiki_torch`, `tiki_lantern`, `tiki_carving`
and `tiki_mug` — real tiki-bar material, not category matches. Then flip `status` to
`"live"` in the registry and uncomment the entry in `aesthetics/index.ts`.

Alternative worth considering: redraw the torches, lanterns and carvings as SVG the way
`AquaIcon` does for Frutiger, and keep photography only for the sky and sea, where a
merely-adequate photo still reads.
