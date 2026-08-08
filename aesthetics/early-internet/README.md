# 02 · Early Internet

**Fiction:** *ZACK'S UFO & PARANORMAL HOMEPAGE ☆ v3.0 ☆* — last updated 11/23/99, still
counting visitors.

**Canvas:** 1600×900, `fit`. No scroll — and deliberately so: the page *looks* like it
should scroll and doesn't, which is funnier than letting it. Letterbox `#000018`.

## What makes this aesthetic work

Bad-on-purpose reads as broken-by-accident unless the composition is deliberate. Real
GeoCities pages were badly laid out in **specific, repeatable** ways, and copying those
beats inventing new ugliness:

1. **Nested bevels.** Tables inside tables, each with its own `outset`/`inset` border
   and a different bgcolor. Depth by border, never by shadow.
2. **Centred everything, at inconsistent widths.** `<center>` was the layout engine, so
   blocks stack down the middle and never line up with each other.
3. **Competing tiled backgrounds** that don't consider contrast with the text on them.
4. **Too many typefaces at too many sizes** — Comic Sans, Times and Arial at once.
5. **Saturated primaries on black.** `#0f0`, `#ff0`, `#f0f`. Never a tint, never a tone.

Restraint is the one thing that would be wrong here.

## Density is the joke

This page needed **real artefacts in bulk**, not forty hand-made approximations. The 230
88×31 badges are genuine ones scraped from the wild (`Pres7o/88x31`, sampled with an even
stride across the alphabetised archive so the selection isn't all "a"-names). 139 of them
are still animated. That authenticity does more work here than any amount of CSS could.

Same principle applied to the guestbook: four seed entries left a black void that read as
a broken layout. Fifteen reads as a guestbook that's been up for two years.

## Interaction inventory

| Element | Behaviour |
|---|---|
| Visitor counter | Real, persisted, increments every visit. Starts at 12,043 |
| Guestbook | Genuinely signable and persisted; entries render in randomised colours and fonts |
| Nav buttons | Bevel inverts on press, each plays a square-wave blip |
| Badge walls | 45 real 88×31 badges across two walls, many animated |
| Marquee | Scrolling ticker of period nonsense |
| `<blink>` | Recreated in CSS, on the NEW!! and the webring stars |
| Webring | PREV/NEXT genuinely cycle to adjacent channels |
| **Easter egg** | Click the broken-image icon 5× — pitch rises each click — for the SECRET PAGE, which reports how many channels you've found |

## Notes and gotchas

- **`<Cutout>` bypasses next/image for animated entries.** The optimiser re-encodes
  animated WebP to a still frame, which would silently kill every blinking badge — on
  the one page where blinking is the point.
- **Counter and guestbook load in an effect**, not during render. Both read
  localStorage, which doesn't exist on the server; reading during render is a hydration
  mismatch.
- **The webring has 320px of right padding.** The dial is fixed to the viewport's
  bottom-right and was sitting directly on top of the NEXT button.
- Guestbook and badge-wall boxes are flex columns with `min-height: 0` children — fixed
  heights left dead space that read as broken rather than period.
- The custom cursor is an inline SVG data URI, so it needs no asset.

## Still to do

- `earlynet_uglytile` — competing tiled backgrounds per cell. Currently one CSS starfield.
- `earlynet_construction`, `earlynet_flamebar`, `earlynet_dancing` — the animated GIF
  furniture. Manual grabs; no open API serves these.
- A MIDI player widget with a playlist.
- Sparkle cursor trail.
- Dial-up handshake on entry — wants a real sample, not a synth.
