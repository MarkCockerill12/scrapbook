# 09 · Deep Sea

**Fiction:** *DSV-4 descent log.* You go down, it gets worse, and nothing reassures you.

**Extended 2026-09-28** (Mark: "needs to be longer, start at the surface, fish swim by,
more aesthetic"). Now 1600×**9000**. `Life.tsx` adds real photography zone by zone:

- **Surface (0 m):** a real dawn horizon (Flickr CC), the waterline, a humpback that
  breaches every ~26s, the underside of the surface and god-rays. The porthole
  vignette only closes in once you're below ~150 m.
- **Sunlight (0–200 m):** matted Wikipedia photos swimming across — dolphin, green
  turtle, manta, whale shark, hammerhead, blue shark, ocean sunfish — dimming with
  depth, plus sardine schools screen-blended into the blue.
- **Twilight → Abyss:** ROV photographs on black water (atolla, comb jelly, hatchetfish,
  sea nettle, fangtooth, dragonfish, viperfish, dumbo octopus, gorgonian, yeti crab),
  screen-blended so the black vanishes, dim until your lamp finds them (rAF writes
  opacity from the pointer ref).
- **The bottom:** a black smoker and Riftia tube worms on the silt. The implosion egg
  now waits until you've lingered on the floor for 14s.

Gotcha: `.root` in the CSS had the canvas height hard-coded — it must match the
registry's `canvas.height`, or everything below is silently clipped.

**Canvas:** 1600×9000, `width` mode. **The first page to earn a scroll** under rule
R1 — scrolling *is* descending. Letterbox `#01070a`.

## What makes the deep read as deep

1. **Near-black, not blue.** Below 200 m there is no blue left. A blue "underwater"
   gradient is a shallow-water look and reads as a swimming pool. The column's gradient
   stops are placed to match real light attenuation — most of them in the top 20%.
2. **Light is local.** Nothing has ambient illumination. Your lamp and the animals are
   the only sources, so most of the frame is genuinely empty. Content only exists where
   your light is.
3. **Instruments, not UI.** Etched glass, hairline strokes, tabular numerals. The HUD is
   a physical object in front of you, so it's `position: fixed` — the sub doesn't scroll,
   the ocean does.
4. **Pressure.** The numbers climb, the hull complains, nothing reassures you.

## Interaction inventory

| Element | Behaviour |
|---|---|
| Scroll | Descent. Drives depth, pressure, temperature, O₂, hull status and creak frequency |
| Cursor | A lamp. The only thing that reveals anything |
| Click | Sonar ping — an expanding ring, with a falling tone |
| Creatures (90) | **Flee the light, drift in the dark.** They dim as you approach and brighten as you back off |
| Zone markers | Six, fading in only when your light is near them |
| Hull creaks | Irregular intervals that tighten with depth. Deliberately not a metronome — a regular sound reads as a machine, not a threat |
| **Easter egg** | Reach the bottom and the hull fails. `HULL BREACH · DSV-4 · NO SIGNAL`, then it restores |

**The one behavioural idea:** the thing you're using to see with is the thing driving
everything away. Sit still and the animals come back.

## Notes and gotchas

- **Never read `window` during render.** `window.innerHeight` in the component body is a
  **500**, not a hydration warning — the body runs on the server. Both scroll position
  and viewport height come from state set in an effect.
- **Depth interpolates through the zone anchors**, piecewise-linear, rather than mapping
  linearly to scroll. A linear map put the gauge at 5,541 m beside a marker reading
  3,000 m, which undermines the one thing the page is selling. It's also truer — ocean
  zones aren't evenly spaced by depth.
- **The HUD is `fixed`, the water is `absolute`.** That split is the whole illusion.
- Creatures never spawn above y=900: the top of the column is lit, and lit water is
  empty water.

## Still to do

- `sea_creature` / `sea_jellyfish` photography layered behind the canvas ones.
- A real sub interior frame around the porthole (`sea_viewport`).
- Sampled audio: sonar ping and whale song want real recordings.
- Marine snow drifting *upward* relative to descent, for parallax.
