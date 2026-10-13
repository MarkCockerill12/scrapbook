# 05 · Liminal — You are not supposed to be in here

**Fiction:** camcorder footage of a corridor that loops forever. 03:14, 12 AUG 1997.

Reworked 2026-09-28 (Mark: "have pictures on the walls of liminal spaces, make the
walls and ceiling more realistic, make sure there are signs of where the doors lead").

## What changed

- **Every surface is a real photo-scanned texture** (ambientCG, CC0 — `scripts/images/acg.mjs`):
  wallpaper (`lim_wall`, multiplied down to mono-yellow), suspended ceiling with lay-in
  light panels (`lim_ceiling` = OfficeCeiling002), damp beige carpet (`lim_carpet2`),
  a wooden door with glass panes (`lim_door`). Textures are CSS custom properties on
  the scene and tiled per quad.
- **Photographs of liminal spaces hang on the walls** (`lim_art` — Aesthetics Wiki
  "Liminal Space"; `lim_art2` — Backrooms wiki levels). Click one to look at it properly.
- **Every door has a plaque** saying where it goes (`012 · JAPANESE 3DS`). Hover to read
  it closer. Doors that appear on ground you've already walked say `B2 · NO ACCESS`
  and lead down to the Deep Sea.
- **EXIT signs** (real photo) hang every fourth segment, pointing back the way you came
  — which is where the exit genuinely is.

## Gotchas

- **Never put `mix-blend-mode` on anything inside the preserve-3d world.** It's a
  grouping property; it flattens the whole corridor and the page renders black.
- Left-wall quads (`rotateY(90deg)`) face away from the camera, so their content is
  mirrored — they get `scaleX(-1)`.

Everything else (infinite modulo corridor, lights dying when you stand still, the VHS
OSD, doors appearing behind you) is as before — see git history.
