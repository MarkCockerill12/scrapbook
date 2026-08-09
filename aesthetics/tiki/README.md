# 16 · Tropical Night — LIVE

**Fiction:** Kai's Tiki Lounge, tonight's menu. Somewhere warm, after dark.

**Status: shipped 2026-08-09**, after eleven months of nothing — no, after a day on
the shelf. It was held back because the harvested photography was the wrong material.
That judgement was correct and I re-verified every slot myself before overturning it:

| Slot | What is actually in the folder | Verdict |
|---|---|---|
| `tiki_sunset` | **An airport.** Aeroplane tail, runway lights | drawn instead |
| `tiki_torch` | **A burning match** on a white background | drawn instead |
| `tiki_lantern` | A fire bowl shot from above | drawn instead |
| `tiki_ocean` | Dark jungle foliage | drawn instead |
| `tiki_carving` | **Genuine carved masks**, cleanly matted | kept |
| `tiki_mug` | **Excellent** — glass tiki mugs | kept |
| `tiki_palm`, `tiki_flower`, `tiki_cocktail` | fine | kept |

**What changed is not the photography, it's the principle.** Since this page was
shelved, four other channels (Liminal, Aztec, Cottagecore, Game Beach) shipped on the
rule that *a drawn thing beats a photograph of the wrong thing* — and this page's own
README already proposed exactly that in its "alternative worth considering". So the
sky, sea, torches and lanterns are drawn, and the objects that are genuinely good are
photographed. That is the same compositing decision every other channel made.

Curated tiki photography would still improve it — see `FOR_MARK.md`, still priority 1
— but "held back indefinitely" was the wrong state for a finished page to sit in.

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

## What is drawn, and the rules each drawing follows

| Drawn | The rule that makes it read |
|---|---|
| **Sky** | Dusk is a *vertical* ramp through six stops, and the sun sits ON the horizon bleeding upward. A two-stop gradient reads as a colour, not a time of day |
| **Bamboo torch** | Bamboo is two things: a hard vertical highlight down one side of the cylinder, and **nodes** — the raised rings. A plain tapered pole is a stick; three rings make it unmistakable |
| **Flame** | Drawn *inside the torch's own viewBox*, so it is anchored to the bowl. The CSS glow that stood in for it was sized against the old photograph and lined up with nothing |
| **Paper lantern** | Lit from **inside**, so the brightest point is the centre of the belly and the ribs are *darker* lines over it. Invert that and you get a beach ball |
| **Sea** | The reflection column sells water at dusk — a vertical smear of the sun's colour, broken into horizontal bands. Unbroken it reads as a spotlight; broken, as chop |

## Still to do

- The palm cutouts sit further inboard than intended: a matted PNG keeps the original
  photograph's frame, so the trees land well inside their boxes and read as a wall of
  foliage across the lower half rather than as edge silhouettes. Same issue as the
  Vaporwave palms; `<Cutout>` honouring `alphaBox` would fix both.
- Real tiki-bar photography for the sunset, torches and lanterns.
