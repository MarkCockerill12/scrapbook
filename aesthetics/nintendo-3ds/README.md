# 12 · Japanese 3DS

**Fiction:** *A borrowed 3DS, left on the drawing app.*

**Canvas:** 1600×900, `fit`. Letterbox `#06070c`.
**Assets:** `raw/nintendo-3ds/` — a night street, blurred to bokeh behind the console.

## The argument this page makes

Drawing hardware in CSS is a **materials** problem, not a shape problem. Four things:

1. **A hard specular line along the top edge**, not a soft gradient. Injection-moulded
   ABS has a sharp highlight where the surface turns.
2. **A screen is a hole, not a panel.** Deep inset shadow all round, and glass in
   front of the bezel with its own reflection.
3. **Seams and parting lines.** Two shell halves, a hinge, a bright metal barrel. A
   perfectly smooth object reads as an icon.
4. **The background is out of focus.** A device at arm's length has a shallow depth of
   field; a sharp background is what makes a mockup read as a render.

## Interaction inventory

| Element | Behaviour |
|---|---|
| Bottom screen | Draw on it. Five colours and an eraser. **Persisted** under `sb:nintendo-3ds:flipnote` |
| **Play** | Replays every stroke in the order you drew it — the flipnote. This is the reason the drawing is stored as point lists |
| 3D slider | Genuinely drives parallax: moon, far skyline, near skyline and the Mii parade all move at different rates |
| StreetPass | One Mii per channel you've actually visited. Each lap round the top screen plays the greeting jingle |
| Face buttons | Depress properly. **A** goes to the Wii Menu, because that's where a Nintendo home button should go |
| Lid | Close it — the upper shell rotates away on a real hinge, both screens die, and the notification LED starts pulsing |
| Sound | The touch panel is **resistive**: a low plate-flex plus a tiny high tick, not a phone blip |

## Notes and gotchas

- **Strokes are point lists, not a PNG data URL.** A 456×342 dataURL is 50–200KB of
  base64 in localStorage for something mostly white. Coordinates are a couple of KB,
  redraw at any size, and — the reason it matters — can be replayed in order.
- **`Array.from({length: n}, fn)` calls `fn(element, index)`**, and the element of a
  `{length}` object is `undefined`. Passing a single-argument factory directly hands
  it `undefined` as its index, and every Mii's position computed to `NaN`. React
  reports this as "`NaN` is an invalid value for the `left` css style property", which
  is a long way from the actual mistake.
- **The bottom screen is 456×342, not 496×372.** The taller well's outer shadow
  pushed onto SELECT / START / HOME along the bottom lip of the shell.
- The oldest strokes fall off the top at 6000 points rather than the app refusing new
  ones — a drawing app should never simply stop working.

## Still to do

- `n3ds_ui` reference grabs — Home menu, Mii Plaza, StreetPass — to rebuild the top
  screen as a real system UI rather than a generic night scene.
- The camera. There's a lens drawn on the shell and it does nothing.
- Stereoscopy: the 3D slider should add a true left/right offset with a ghost, not
  just parallax.
