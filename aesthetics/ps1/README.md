# 17 · PS1 Low-Poly

**Fiction:** *Memory Card (PS) — Slot 1.* Three saves, and each one is another
channel. Loading a save boots it.

**Canvas:** 1600×900, `fit`. Letterbox `#0b1120`. **No assets** — every polygon and
every texel is generated.

## The argument this page makes

Everything people love about the PS1 look is a **rendering defect**, and a modern GPU
is engineered specifically not to have any of them. Faking them in shaders means
undoing correct behaviour; writing a software rasteriser gets them the way the
hardware did. `renderer.ts` is ~200 lines and produces all five:

| Artefact | Cause, then and here |
|---|---|
| **Vertex swim** | The GTE had no subpixel precision. Projected vertices are `Math.round`ed, so nearby geometry visibly crawls as the camera moves. The single most recognisable one |
| **Affine texture warp** | No perspective divide per pixel. UVs interpolate linearly in *screen* space, so the checkerboard floor bends |
| **Polygon pop** | No z-buffer — ordering was per-primitive by average depth. Triangles are painter-sorted and intersecting geometry resolves wrongly, on purpose |
| **Dither crosshatch** | 15-bit colour with a 4×4 Bayer dither to hide the banding |
| **240p** | 320×240, scaled up with `image-rendering: pixelated`. None of the above reads correctly at any other resolution |

Rendered at **30fps**, not 60 — at 60 the vertex swim becomes a shimmer instead of
the slow wobble it should be.

## Interaction inventory

| Element | Behaviour |
|---|---|
| Viewport | Drag to orbit. Idle rotation resumes when you let go |
| Save list | Three saves, each with its own rotating icon rendered by the same rasteriser at 48×48, 10fps |
| **Load** | Real disc-read pause: drive spin-up glide, motor rumble, seek clicks. Then the save's icon lands on the plinth and the channel takes over |
| **Copy** | Duplicates into free blocks; refuses with a buzz when the card is full. Block grid updates |
| **Delete** | Removes the save, persisted under `sb:ps1:saves` |
| **Easter egg** | Delete all three → the directory goes with them. The card reports corrupt, the viewport takes a VRAM fault (misaddressed scanlines, red fog) and only **Format** brings it back |

## Notes and gotchas

- **The camera orbits, so the world must be smaller than the orbit radius.** A
  32-unit floor viewed from 15 units away has its near half *behind* the near plane;
  those triangles get dropped and the survivors magnify until they fill the frame.
- **Positive pitch has to rotate the camera down.** With the signs the other way the
  floor renders above the horizon, which looks like the entire scene is inverted
  rather than like a sign error.
- **Ground winding faces up.** Wound the other way the whole floor is backface-culled
  and the scene renders over a void — indistinguishable from "the floor didn't load".
- **Body parts must butt up, never interpenetrate.** With no z-buffer, a torso that
  shares space with the legs draws straight over them and the figure appears to have
  none. Games of the era were modelled the same way for the same reason.
- **The ground is tessellated 10×10.** A single quad warps so violently under affine
  mapping that it reads as a bug; the console had this problem and games solved it
  exactly this way.
- Lighting is **baked into face colours at build time**, so the rasteriser only ever
  fills flat colour and the inner loop stays one multiply per pixel.

## Still to do

- Real texture pages with a 16-colour CLUT, rather than one procedural checker.
- A proper "game" per save in the viewport instead of the shared turntable scene.
- Gouraud interpolation across the triangle — currently flat per face.
