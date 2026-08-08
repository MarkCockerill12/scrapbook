# 05 · Liminal

**Fiction:** *You are not supposed to be in here.* No stated purpose. That's the point.

**Canvas:** 1600×900, `fit`. Letterbox `#0b0a06`.
**Assets:** one — `lim_carpet_01`. Everything else is drawn; see below.

## The argument this page makes

Dread is made of **stillness and repetition**, not of events. Nothing here moves
except in response to you. Four decisions carry it:

1. **The corridor is real CSS 3D**, not a parallax trick: floor, ceiling and two
   walls per segment, nine segments deep, in one `preserve-3d` world.
2. **The loop is modulo.** Segments sit at fixed z; the world translates by
   `travel % DEPTH`. Cross one segment and the world snaps back exactly one segment
   while the content indexes forward — invisible, because every segment is
   geometrically identical. Infinite in both directions, for 40 DOM nodes.
3. **The vanishing point is fogged, not vignetted.** Distance is at the *centre* of
   the frame, so the dark gradient goes in the middle and fades outward — the inverse
   of a photographic vignette. Getting this backwards is what makes most first-person
   CSS corridors read as a tunnel decal on a wall.
4. **The light is green-yellow and too bright.** Old fluorescents are not white.

## Interaction inventory

| Element | Behaviour |
|---|---|
| Wheel | Walks. Velocity with friction, so it coasts. Works in both directions |
| Footsteps | Every half segment, alternating feet, pitched differently left and right |
| Motion sensors | Lights reach eight segments ahead while you move |
| Idle 30s | The sensors give up one segment at a time, with a strike each time, down to the one above your head |
| Dead / dying tubes | Deterministic per segment: ~12% are out, ~14% flicker in hard steps |
| Doors | ~34% of segments have one. Click to open it — each leads to a specific channel |
| **A door that wasn't there** | Walk *back* over ground you passed more than five segments ago and doors appear on segments that had none. They glow. They go somewhere else |
| **Easter egg** | Keep walking backwards. Four segments behind where you started there is an EXIT sign, and it opens the world map |
| Room tone | Fluorescent hum at 100Hz + 200Hz over hiss, HVAC rumble, and something heavy a long way off every 20–45s |

## Notes and gotchas

- **`fit`, not `width`.** The registry had this as a scrolling page. A scrollbar
  can't express a corridor that is infinite in *both* directions — and backwards is
  where the exit is. Walking is driven by the wheel instead.
- **The camera has to stand inside the corridor.** With the world at z ≤ 0 the near
  opening renders exactly 1:1 — a 560×440 rectangle floating in the middle of a black
  1600×900 frame. The viewer sits at `z = +perspective`, so the world carries a
  permanent `translateZ(DEPTH)` that puts the first walls level with the camera where
  they magnify past the frame edges.
- **Slot dimming is a static class, not a per-frame calculation.** Slot *i* is always
  within one segment of `i × DEPTH` away, so `.d0`–`.d8` are just CSS. Recomputing 40
  filters at 60fps buys nothing visible.
- **Positive modulo.** `travel % DEPTH` goes negative when you walk backwards, which
  jerks the corridor a full segment forward on every wrap.
- **Three of the four harvested textures were unusable** — the "wall" is a street,
  the "ceiling" is a photograph of a whole room, the "door" is a stone lion. This is
  the *categories not scenes* failure from `ASSETS_NEEDED.md` in its purest form, and
  it confirms the project's own conclusion: a drawn wall beats a photograph of the
  wrong wall. Wall, ceiling and door are CSS; the carpet grab is genuine and stays.

## Still to do

- `lim_wall` / `lim_ceiling` / `lim_door` want **curated** grabs — see ASSETS_NEEDED.
  Real mono-yellow wallpaper and a real suspended-ceiling tile would lift this a lot.
- Rooms off the doors, rather than the door being a channel link.
- Head bob while walking, and a slight FOV push at speed.
