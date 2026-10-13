# 03 · Cottagecore — Nan's kitchen table

**Fiction:** a slow morning at Nan's kitchen table. Nowhere to be.

Rebuilt 2026-09-28. Mark: *"currently flat and stiff… the graphics and textures don't
work together."* The old window-seat page mixed drawn laundry, drawn flowers and one
real cat. Every surface is now a real photograph, and the page is built around
photographic discipline so twenty photos from twenty cameras read as one moment:

1. **One defocused real room** (`cc_kitchen` 2, blurred 7px) — depth, not wallpaper.
2. **One sharp real oak tabletop** (`cc_wood`) in perspective — the plane everything sits on.
3. **One light source**: the window, upper left. Every cutout gets a contact shadow and a
   long soft shadow to the lower right, plus the same warm grade.
4. **One glue layer**: dappled leaf-shadow, warm multiply grade, vignette and film grain
   over the whole frame.

**Canvas:** 1600×900 `fit`. **Fonts:** Homemade Apple + IM Fell English, self-hosted
under `public/fonts/cottagecore/` (via `scripts/fonts.mjs`).

## Interaction inventory

| Thing | Behaviour |
|---|---|
| Jug of wildflowers | opens a picker of six real flowers; picking one presses it into the herbarium (persisted `sb:cottagecore:herbarium`) |
| Journal (on the table) | opens the herbarium book: pressed specimens with washi tape, Latin names and dates; ribbon tabs for Nan's soda-bread recipe, the garden year, and real Köhler's *Medizinal-Pflanzen* plates |
| Letter with wax seal | Nan's letter on real stained paper |
| Teapot | tilts and pours, a stream falls, the cup fills and steams (pour sound) |
| Bread | steams |
| Candle | lights / goes out; a warm flickering pool of light |
| Cat | breathes and purrs |
| Yarn | rolls |
| Jam, basket | hand-written tags |
| Paper tags (top) | morning / afternoon / golden hour / evening — regrades the room, the beam, the dapple; evening lights the candle |
| Ambience | generated music-box waltz (3/4, D major), birdsong, a distant kettle and church bell |
| **Egg** | sit perfectly still for three minutes and it starts to rain |

Assets: `cc_*` slots (Commons + Openverse; see `raw/ATTRIBUTION.json`), plus the older
`cottage_bread` and `cottage_cat` cutouts.
