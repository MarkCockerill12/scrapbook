# 13 · Dead Mall

**Fiction:** *Northgate Centre — Directory. 6 of 84 units occupied.*

**Canvas:** 1600×**2900**, `width` mode. Letterbox `#0d1616`.
**Assets:** `raw/dead-mall/` — real abandoned-mall atrium, fountain and shopfront
photography, graded cold rather than desaturated.

**Scroll is granted here** under R1 because the concept *is* a board taller than you.

## The argument this page makes

The horror of a dead mall is that **the lights are still on**. Four consequences:

1. **Everything is evenly lit** by fluorescents nobody switched off, and one of them
   is failing. Darkness would be a different, much cheaper feeling.
2. **The palette stays cheerful** — teal, salmon, brass, cream. 1991 optimism, aged.
   Desaturating to grey turns it into generic decay and loses the specific sadness of
   a building designed to be busy.
3. **The directory is backlit plastic**, so the tube positions show through it as
   brighter vertical bands. That one gradient does more than any texture.
4. **"VACANT" repeats until it stops meaning anything.** Eighty-four rows of it. That
   repetition *is* the page.

## Interaction inventory

| Element | Behaviour |
|---|---|
| The board | All 84 units, 101–184. Six are trading. Click any vacant one |
| Unit cards | Every vacant unit remembers what it was: a former tenant, a closing year and a reason, all derived deterministically from the unit number, over a real shopfront photo |
| Fluorescents | One sputters permanently. Clicking anywhere makes all three stutter and strike |
| "You are here" | Drag the dot anywhere on the floorplan. It doesn't snap back |
| Fountain | Click to toss a coin — it arcs, splashes, and the count persists under `sb:dead-mall:coins` |
| Shutter | Drag the roller gate on unit 161 down, with the sound of steel |
| Muzak | Four bars of nothing in particular, on a loop, **lowpassed to 1.4kHz** — which is what a ceiling speaker forty metres away actually does to music |
| **Easter egg** | Unit **172** reads `OPEN — no lease on file`. Nothing marks it; you have to read the board. It goes to Liminal |

## Notes and gotchas

- **The muzak is filtered, not reverberated.** Removing everything above 1.4kHz is far
  more convincing than adding reverb, and it costs one biquad.
- **`mall_carpet` is unusable** — the harvested "mall carpet" is a rug with someone's
  feet in it. The atrium, fountain and abandoned-shopfront grabs are all genuine and
  are what the page is built on.
- Former tenants and closing dates are **hashed from the unit number**, so the board
  is the same board every visit. Randomising it would make the place feel generated.
- The canvas grew from 2700 to 2900 because 28 rows × 3 columns of units pushed the
  board's bottom edge into the fountain court.

## Still to do

- `mall_directory` and `mall_signage` reference grabs (ASSETS_NEEDED priority 4) — a
  real directory board would sharpen the proportions here.
- The upper level. The sign says it's closed; it should be visitable anyway.
- Footsteps with the reverb of an empty concourse, tied to scroll.
