# 11 · Aztec / Izalith

**Fiction:** *Expedition Log — Day 47. We should not have opened it.*

**Canvas:** 1600×900, `fit`. Letterbox `#0a0705`.
**Assets:** `raw/aztec/` — a real Maya stone relief as the wall, matted vines at the
corners. The harvested "lava" turned out to be basalt columns, so the lava is drawn.

## The argument this page makes

The whole page is a **lighting problem**. There are exactly two light sources and
they come from different directions: the torch you are carrying, which is at the
cursor, and the lava, which is underneath. Four rules follow:

1. **Nothing is lit from above.** Overhead light instantly reads as a photograph of
   a museum exhibit.
2. **Lava light is orange and it breathes.** A static glow reads as a filter.
3. **Carving is two shadows, not an outline** — dark edge on the lit side, bright
   edge on the dark side. Reverse them and the glyph stands proud of the wall
   instead of sinking into it.
4. **The dark is actually dark.** Most of the frame is near-black, and the dread is
   entirely in what the torch doesn't reach.

## Interaction inventory

| Element | Behaviour |
|---|---|
| Torch | The cursor. Spring-lagged, because a torch has mass and the arm swings. Two-stop falloff: a bright pool, then a long dim reach |
| Glyphs (9) | Press to sink them into the stone, with dust falling out of the recess |
| The lock | Four glyphs, in order. Correct ones light and chime up a pentatonic scale |
| **The rub panel** | Five hundred years of dirt, cleared by dragging (`destination-out` on a canvas). Under it: the four glyphs, in the right order. The journal's handwriting changes once you've read it |
| Lava | Rises one step with **every** glyph press, correct or not, and never goes back down. Heat haze climbs with it |
| The door | Correct sequence → stone grinds open. Behind it the passage is carpeted, and it leads to Liminal |
| **Easter egg** | Three wrong sequences → the floor gives way, a bell rings that nobody rang, and you land in Deep Sea |

## Notes and gotchas

- **The lava sits *above* the darkness overlay (z-index 22 vs 20).** It is a light
  source; shading it like everything else turned the fissure into a dark band with a
  pattern on it.
- **Crust must be irregular islands, not crossed repeating gradients.** Two diagonal
  repeating-linear-gradients read as hazard tape — a barber pole — which is the worst
  possible signal on molten rock.
- **Coverage on the rub panel is sampled every 12th stroke**, not every pointer move:
  `getImageData` on a 414×190 buffer at pointer rate is far too expensive, and
  "roughly how clean is it" doesn't need to be exact.
- Fire is **filtered noise, not a crackle loop** — real fire is broadband hiss with
  occasional pops, and the hiss is what makes a space feel hot.
- Drums are struck on an interval rather than sequenced, so nothing lines up and the
  room never settles into a rhythm you can predict.

## Still to do

- Real lava photography would beat the drawn fissure. The current `aztec_lava` grabs
  are basalt cliffs.
- The glyph sequence should differ per visitor and persist.
- Gold. There are three `aztec_gold` grabs and nothing on the page uses them yet.
