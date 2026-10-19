# Silicon Dreams — HYPERSPHERE 3D Chat

Rebuilt 2026-10-19, the same day as the first version. Mark's review of that version: "is
that actually a silicon dream aesthetic? I thought it would be more like worlds.com or
baldis basics… there should be more. also idk why we have dials… clicking on the paper
just opens the pc". Then: "i like the 3d render stuff you have, like the blobs etc so keep
them in some form".

**The aesthetic** (Aesthetics Wiki): the surreal, uncanny visuals of early CGI animation,
art and games, mid-80s to early 2000s. Sparse landscapes or architecture, low-resolution
textures, simple effects, floating objects.

**Fiction:** an SGI Octane in a computing museum. Press the monitor's power button and it
dials into HYPERSPHERE, a 1996 3D chat server. The camera goes through the glass.

## The worlds

**The camera flies.** Mark asked for it on 2026-10-19 ("just able to wasd, space, shift the
camera around to see anything"), after first rejecting free movement on other channels:

- WASD moves you (W goes where you're looking, including up and down).
- Space rises and Shift sinks.
- Drag to look; the cursor stays visible.
- The wheel pushes forward.
- A press that doesn't travel is a click.

Each world clamps the camera to its `bounds`: inside the room in the café, and down
under the island and into the void. The named viewpoints in the client bar are presets
the camera glides to. Input handling is in `WorldView.tsx`, and only mounts while a
raster world is on screen, so typing in the chat never flies the camera.

Shared props (`world/kit.ts`):
- spinning extruded 3D text (three's helvetiker, loaded on demand)
- MarchingCubes blobs, including lava lamps
- a lens flare on the sun
- floating platonic solids and torus knots
- ringed planets in the daytime sky
- a globe (NASA Blue Marble, `sd_earth`)
- a house-sized eyeball with a real iris photo (`sd_eye`) that watches the camera
- floating CRTs cycling through other ScrapBook channels' thumbnails; click one to go
  to that channel
- **15 avatar kinds** (`world/models.ts`): person, robot, alien, TV-head, orb, giant head,
  ghost, UFO (spinning lights and a tractor beam), fish, sky shark, bird, penguin (waddles),
  rubber duck (waddles), snowman (slides), eyeball on legs (real iris). Each moves its own
  way (walk / waddle / slide / float / circle) and has its own lines ("glub glub", "dun dun",
  "QUACK", "take me to ur leader", "please stand by"), said in the chat or when clicked.
  "fishy" was the first; Mark: "the fishy was really funny".

| World | What's there |
|---|---|
| **Ground Zero** (hub) | Grass plain under a real cumulus sky. The blob mascot turns over the plinth with four textured shapes orbiting it, "HYPERSPHERE" spins in gold over the portals, and two planets hang in the sky. Also: a sculpture garden of floating solids and a torus knot, a blue blob, an "OTHER SERVERS" CRT, signs, lamps, trees. 8 avatars, including a fish and a floating head. |
| **Sky Island** | A floating rock with a cottage, a half-built house, a windmill, a ladder rising toward a ringed green planet, drifting islets with a tree each, a mailbox, a land-for-sale sign. 5 avatars, including a fish circling the island. |
| **CyberCafé** | A bar with a robot barista and a car-sized coffee cup turning over it, a lounge (sofa, globe, lava lamp), a jukebox, a second lava lamp, a TV tuned to other channels, bottles, a pot plant, fans, a window onto the real sky. 7 avatars. |
| **The Void** | Black slabs in a drained sky, a row of arches walking off into nothing, stairs that stop (one set upside down), a lone door frame, a watching eyeball, five drifting CRTs to other channels, a dark blob, a floating column, a torus knot, a far planet. AFK users and a lost fish. |
| **Render Gallery** | The one world drawn by a **ray tracer**: the four pools from the first version (Whitted's glass and gold spheres, Blinn's blobs, Cook's billiards with real motion blur, Perlin's materials), with the chat still running over it. |

Portals show the destination's sky through the arch and are clickable. The teleport bar
does the same. Teleporting runs a progress bar, then the world "downloads": every surface
starts as a flat swatch of its texture's average colour and snaps to the texture at a
random moment, and people pop in last.

## The chat

People wander, wave, jump and talk in 1996 small talk (`world/chat.ts`), with speech
bubbles and name tags. Click someone and they turn to you, wave and say hi. Type in the
chat box and someone answers ("a/s/l", "lol", "hi {nick}!!"). On first entry you pick a
nickname (persisted).

## The look, and why it isn't another channel's

- **Textures are real photographs at period resolution.** ambientCG CC0 scans, shrunk to
  64px in the browser and nearest-filtered. Skies are real Commons cloud photos at 512px.
  Rule 3 holds: nothing is a drawn stand-in. The geometry is boxes, cylinders and cones,
  because that is what these worlds were made of.
- **Not PS1:** no dither, no affine wobble, no 320×240, no fog. The client renders 800×450,
  scaled up with hard pixels, Gouraud-lit.
- **Not Liminal:** outdoors, populated, chatty. The Void is the only empty place, and it is
  an open sky, not a corridor.
- **Not Vaporwave or Y2K:** no checkerboards, sunsets, grids or chrome.
- **Not Windows or Early Internet:** the client has its own skin (navy panels, gold rules,
  Arial), not a grey Win95 bevel.
- **Overlap to watch:** grass under a blue cumulus sky is also Frutiger Aero's motif. Here
  it's a tiled low-res 3D plain rather than a glossy Bliss photo, but it is the same pair
  of things.

## Sound

Room: Octane fan, degauss, a modem handshake while connecting. Worlds: a General-MIDI-ish
loop each (`music.ts`): bright C major for the hub, pentatonic for the island, lounge for
the café, a drone for the void, the D-lydian pads for the gallery. Also chat blips,
teleport sweeps, clacking balls.

## Files

| File | |
|---|---|
| `index.tsx` | page state: modes, worlds, chat, nickname, teleporting |
| `WorldView.tsx` | flying, drag-look, clicking things in a raster world |
| `loop.ts` | the frame loop: room / boot / dive / world / gallery / rise |
| `Room.tsx` | power button, LED and glass hotspots on the photo |
| `Chat.tsx` | chat log, input, nickname prompt |
| `GalleryView.tsx` | Render Gallery controls and captions |
| `world/World.ts` | the rasteriser: pop-in, viewpoints and zoom, picking, ambient chat |
| `world/kit.ts` | the props worlds are built from |
| `world/worlds.ts`, `world/places/*.ts` | world registry; one file per world |
| `world/avatar.ts`, `world/models.ts` | avatar behaviour; the 15 models and their lines |
| `world/textures.ts` | photo → 64px texture, sky crops, text textures |
| `world/chat.ts` | lines and replies |
| `gallery.ts`, `Renderer.ts`, `glsl.ts`, `trace-*.ts`, `balls.ts` | the ray tracer and its gallery |
| `scene.ts` | photo measurements (glass, power button), gallery vistas, camera maths, homography |
| `sound.ts`, `music.ts` | sound and scores |

## Gotchas

1. **The trace shader compiles slowly on Windows** (ANGLE → HLSL, ~2.7s after the fixes
   below). It compiles in the background 600ms after mount via `compileAsync`, long before
   anyone reaches the gallery. Each `fbm` call is inlined, so `procedural()` has one call
   per path. Loop bounds are `+ uZero` so they can't be unrolled. Measure with a fresh
   browser per variant, because ANGLE caches by translated source.
2. **Don't start `compileAsync` in a constructor.** StrictMode disposes the first instance
   while three is still polling it, and three throws `reading 'isReady'`.
   `Raytracer.dispose()` waits for a pending compile.
3. **Gallery lamps are spheres only reflection rays see.** Rays reflected off the floor
   don't see them, or they show as floating orbs.
4. **MarchingCubes balls need strength ≈ 1.1, subtract 10, and centres within ±0.13** of the
   unit cube, or the blob reads as separate spheres.
5. **A mirrored-repeat sky at 4× makes a kaleidoscope.** Two copies, with the seams at the
   sides, and a cylinder tall enough that its top edge is never in view.
6. **The ambientCG "Marble006" scan is black marble.** Tinting can't make it white; use
   another texture for anything meant to read light.

7. **Name tags and bubbles use `sizeAttenuation: false`** (a fixed size on screen). In world
   units they ballooned whenever an avatar walked near the camera.
8. **The iris is a spherical cap with planar UVs**, slightly outside the sclera. A flat
   disc sinks into the sphere, and the cap's own UVs bend the photo.

## Review hooks

`?sd=room` boots the monitor. `?sd=hub|island|cafe|void|gallery` goes straight into that
world as `Guest_0000`. Headless Chromium on this machine uses the real GPU with
`--enable-gpu --use-angle=d3d11 --ignore-gpu-blocklist`.

## Credits

Octane photo: Jonathan Konrath, CC BY 2.0 (Commons). Skies, iris and Earth (NASA): Commons
(see `raw/ATTRIBUTION.json`). Textures: ambientCG, CC0.
