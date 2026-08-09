# 08 · Game Beach

**Fiction:** *Isle Delfino tourist board — level select.*

**Canvas:** 1600×900, `fit`. Letterbox `#0e8fa8`.
**Assets:** `raw/game-beach/` — a real island, masked and posterised hard.

## The argument this page makes

Toon shading is a **rendering model**, not a bright palette. Four rules, and one soft
gradient anywhere collapses the whole thing into 2015 flat design:

1. **Shading is banded, not smooth.** Two or three flat steps with hard edges between
   them. The sea is drawn scanline by scanline: evaluate two summed sines, quantise
   to three levels, fill. The hard boundary *is* the effect.
2. **Outlines are a darker tint of their own fill, never black.** Black outlines read
   as a cartoon; tinted outlines read as a shader.
3. **The water is the most saturated thing on screen**, and it is a colour no ocean
   has ever been. That impossible turquoise is the whole memory.
4. **The HUD is furniture**, not an overlay: chunky, opaque, hard-shadowed, in the
   corners.

## Interaction inventory

| Element | Behaviour |
|---|---|
| Coins | 12 scattered, bobbing and flipping. Collect them all and the beach respawns after 1.4s, the way a game would. The counter **persists** under `sb:game-beach:coins` |
| Water | Click anywhere on the sea for a hard-edged expanding splash ring |
| Right-drag | Orbits the camera; sky, island and palms parallax at different rates, and the "you are here" blip moves on the minimap |
| Level cards | Four channels as warp pipes, floating out of phase |
| Signpost | Types itself out one character at a time with a beep every other character |
| Day / night | A single filter over the whole page, cross-fading over 1.4s. Night stops the steel drums |
| Minimap | Live: every uncollected coin is a real blip at its real position |
| **Easter egg** | 100 coins — reachable across visits, since the counter persists — gets the 1-UP jingle and opens a warp |

## Notes and gotchas

- **Steel drums are inharmonic.** A pan is a struck metal plate, so each note is a
  fundamental plus partials at 2.76× and 5.4× — neither a whole multiple. Use octaves
  and you get a marimba.
- **The island photograph has to be masked.** Unmasked it is a hard-edged rectangle
  of photography floating in a cel-shaded sky, which is the fastest possible way to
  break this aesthetic. It's masked to an ellipse and sat *on* the horizon line.
- **The palms are drawn even though four were harvested.** Cel shading needs flat
  bands with hard edges and a photograph cannot supply them.
- **`display: block` on the card name and subtitle.** Spans inside a button are
  inline, so the name and the caption ran together — the same bug as the Wii message
  board.
- The sea renders at half resolution and is scaled up `pixelated`: the bands should
  be chunky, and it halves the per-frame work.

## Still to do

- The camera orbit is a translate, not an orbit. Real yaw would sell the depth.
- Coins should be collectible by *touching* them with a character, not by clicking.
- Day/night should also swap the sea's three levels rather than filtering the page.
