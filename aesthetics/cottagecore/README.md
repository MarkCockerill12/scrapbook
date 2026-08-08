# 03 · Cottagecore

**Fiction:** *A window seat, a cup of tea, and no urgency.*

**Canvas:** 1600×900, `fit`. Letterbox `#d8cbb0`.
**Assets:** `raw/cottagecore/` — a real cat and real sill objects, matted. The meadow
is a photograph; the laundry and flowers are drawn (see below).

## The argument this page makes

The failure mode is "beige page with a serif font". What actually makes it:

1. **Paper grain over everything, including the photographs.** One multiply layer
   across the whole frame is what fuses cut-out photos and drawn shapes into a single
   painted image. Without it they read as stickers on a background.
2. **Nothing is still and nothing is fast.** Grass, laundry and curtains all move, on
   different periods, none of them quickly. Stillness reads as a mockup; speed reads
   as a game.
3. **The light is warm and comes from one side**, so everything on the sill throws a
   long soft shadow the same way.
4. **The frame is in focus and the view is not.** You are inside, looking out.

## Interaction inventory

| Element | Behaviour |
|---|---|
| Seasons | Four full repaints — grade, sky, sun height and the colour wash, all cross-fading over 1.6s |
| Wind | One slider drives grass, laundry and both curtains, and feeds the gust sound |
| Flowers | Nine in the meadow. Pick them and they go into the vase on the sill, **persisted** under `sb:cottagecore:vase` |
| The cat | Follows the cursor along the sill at 0.012 lerp — far too slow to keep up. Idle and it slows to 0.002 and settles; click it and it purrs for four seconds |
| Birdsong | Sweeps, not notes: 3–5 glides of 40–80ms with gaps, which is what a blackbird actually does. Steady pitches sound like a synthesiser |
| Kettle, church bell | On long random intervals, whether anyone is listening or not |
| **Easter egg** | Sit completely still for three minutes and it starts raining. Any movement stops it |

## Notes and gotchas

- **`pic()`, not `one()`, for backdrops.** After the cutout stage a slot holds both
  originals and matted versions, and `one()` walks the lot — so asking for "meadow
  #2" silently returned a transparent cut-out and the view rendered as a hole. Added
  `photos()` / `pic()` to `lib/assets.ts` as the inverse of `cutouts()` / `cut()`.
- **The paper texture was a photograph of a stone statue.** `cottage_paper` is a
  Buddha; tiled under multiply it stamped it across the entire scene. The grain is
  now drawn.
- **`cottage_laundry` is euro banknotes pegged to a line** — a search for "laundry"
  doing exactly what you'd expect. The washing is four SVG garments instead.
- **Motion moved from React to CSS.** Rotating ninety grass blades from a rAF meant
  re-rendering the whole page sixty times a second; they're now CSS animations whose
  amplitude is `calc(var(--wind) * Ndeg)`, and the wind slider just sets the variable.
- The cat's follow lerp stops updating state once it has settled within 0.15px,
  otherwise the rAF re-renders forever.

## Still to do

- **A better meadow grab.** The current source is only 768px wide, drawn at 1180 —
  it upscales to mush. It reads acceptably as "the view is out of focus", but a
  sharp 2000px wildflower meadow would transform this page.
- Time of day from the visitor's real clock, layered on top of the season.
- The cat should occasionally knock something off the sill.
