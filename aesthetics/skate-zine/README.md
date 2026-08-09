# 18 · Skate Zine

**Fiction:** *SHRED WEEKLY #12 — cut, pasted, photocopied, stapled.*

**Canvas:** 1600×900, `fit`. Letterbox `#141210`.
**Assets:** `raw/skate-zine/` — real skaters, skateparks and graffiti, thresholded.

## The argument this page makes

The roster calls this the project's thesis statement, so the rules matter more here.

1. **A photocopy is 1-bit, not greyscale.** Mid-tones do not survive — they resolve
   to solid black or to nothing. `grayscale(1) contrast(N)` with N large *is* the
   effect. This is why this is the one channel where a merely-adequate photograph
   becomes **correct** material: threshold it hard enough and any snapshot is zine
   stock. Every other page needed curated photography; this one is forgiving by
   construction.
2. **Nothing is square to anything.** Every scrap is a degree or three off. A
   grid-aligned collage reads as a layout, not as glue.
3. **Edges are torn or cut, never rounded.** Hard irregular clip paths. Scraps are
   torn on three sides and cut on one, which is what happens when you rip something
   out against a ruler. A `border-radius` anywhere on this page is a mistake.
4. **Generation loss compounds.** Ten copies is not ten times worse, it is unreadable.

## Interaction inventory

| Element | Behaviour |
|---|---|
| Scraps (5) | Drag any of them anywhere. Positions **persist** under `sb:skate-zine:places` |
| Staples (3) | Pull each one out. Pull all three and the spread comes apart |
| Sharpie | Draw on the whole spread. Line weight thins with speed and every stroke is drawn twice at different alphas, because a marker bleeds and never has a clean edge. Persisted as a bitmap |
| Spray can | The ball rattles, then the hiss holds while you paint. Droplets are a cone with no edge — density falls off as `pow(random, 0.6)` |
| Photocopier | Ten generations. Each pass raises contrast, thickens the halftone and adds toner speckle. Persisted, so you come back to the copy you left |
| **Easter egg** | At generation 10 the body copy has dissolved into noise and **"KEEP MAKING THINGS NOBODY ASKED FOR"** is the boldest thing on the spread |

## Notes and gotchas

- **The hidden message is modelled on toner build-up, not on opacity.** Each
  generation a copier *thickens* the dark end, so a mark that starts as a hint of grey
  gets heavier every pass — its colour is interpolated from near-paper to mid-grey by
  generation. Fading it in on opacity would have produced the same picture for the
  wrong reason, and it would not have survived the contrast crush the way this does.
- **The marker layer is a data URL, not a stroke list** — the opposite choice to the
  3DS flipnote, and for a stated reason: nothing here needs replaying, and a bitmap
  captures spray droplets, which are not strokes.
- The whole degradation lives on the `.spread` container, because you cannot
  photocopy one scrap.

## Still to do

- **The ransom lettering is composited from fonts and is a stand-in.** See
  `Ransom.tsx`. It varies family, size, rotation, paper colour and ink colour per
  character — vary only size and rotation, the usual shortcut, and every letter still
  reads as one typeface, which is the one thing a ransom note is not. But on this page
  the lettering *is* the aesthetic rather than a supporting texture, so a real
  alphabet cut from magazines (`FOR_MARK.md`, priority 4) is a genuine upgrade and not
  a nicety.
- Tearing a corner off. The brief asks for it; the clip-path work is there to build on.
- `zine_sticker` / `zine_tape` / `zine_staple` — real ones, to sit over the scraps.
