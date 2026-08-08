# 14 · Wii Menu

**Fiction:** *The Channel Menu.* The page is meta on purpose — a Wii-style menu for
the whole site, and a legitimate second entry point alongside the world map.

**Canvas:** 1600×900, `fit`. No scroll. Letterbox `#c3d2da`. **No assets.**

## The argument this page makes

A console menu is a **material**, not a layout. The same 4×3 grid of cards is a web
dashboard unless four things are true:

1. **It is not white.** The ground is a pale blue-grey that gets paler toward the
   centre. Pure white removes the sense of a lit plastic housing.
2. **Every edge is a material edge.** A tile is a 1px cool border **plus** a bright
   inset highlight along the top **plus** a soft wide shadow beneath. Drop any one
   and it flattens into a card.
3. **The blue is light, not fill.** It appears as glow — the hover ring, the slot
   LED, the page dot. Large blue areas kill it instantly.
4. **The pointer has mass.** See below; this is the single most recognisable part of
   the whole aesthetic and it is almost entirely physics, not art.

## Interaction inventory

| Element | Behaviour |
|---|---|
| Pointer | Spring-follows the cursor (never catches it), tilts with horizontal velocity and springs upright, folds into a fist on press. Replaces the system cursor |
| Tiles | Lift + blue ring + tick on hover; click transitions to that channel |
| Unvisited channels | Carry a blue "new" dot, from the shell's real `visited` list |
| Unbuilt channels | Fully desaturated, captioned "not yet installed" |
| Mii Parade tile | 9 canvas Miis walking, bobbing out of phase, blinking independently, wrapping |
| Galaxy tile | Drag to spin a Fibonacci-lattice planetoid. Throw it and momentum decays back to an idle drift, never to a stop |
| Map Channel tile / ScrapBook button | Opens the world map |
| Disc slot / Disc Channel | First click loads a disc (motor whir), second boots it — into a channel the visitor hasn't seen yet, if there is one |
| Message Board | Real letters: one per visited channel, with the date it was first opened, persisted under `sb:wii:stamps` |
| Clock | Live, ticking, correct |
| Menu music | A plucked bossa figure, scheduled one bar ahead. Only runs while unmuted |
| **Easter egg** | Shake the pointer left-right over the disc slot (6 direction changes inside 900ms) → the Health and Safety screen |

## Notes and gotchas

- **The shell's dial eats the bottom-right corner.** The Message Board button was at
  the authentic bar-end position (`right: 96`) and was completely unclickable — the
  fixed dial sits over roughly the last 320×60 canvas px at 1.0×, and swallows the
  pointer silently. Both bar buttons moved inward to ±360. This is now written up as
  the *chrome exclusion zone* in `TECHNICAL_SPECS.md §2b`; it will bite every page.
- **Tile numbers are `color-mix(accent 58%, slate)`.** White numerals vanished on the
  pale half of the roster and a fixed grey severed the tile from the channel it
  stands for.
- **Pending tiles are `grayscale(1)`, not `0.85`.** Partial desaturation left the
  cream and tan channels looking like a smudge of dirty pink instead of an empty slot.
- The planetoid is a **point lattice, not a mesh** — stipple sorted back-to-front and
  scaled by depth reads as a rounded body at 44px radius where flat-shaded triangles
  read as a polygon. Continents exist purely so the spin is legible; a uniform sphere
  gives no motion cue at all.
- The menu loop schedules **a whole bar at a time** through `lib/audio`, so the timer
  count stays at one however long the page is open, and the shared mute still applies.

## Still to do

- A real rounded display face (the Wii used FOT-Rodin). `Trebuchet MS` is standing in;
  this is the one place a self-hosted font would visibly lift the page.
- Tile *content* previews — live miniatures of each channel rather than an accent wash.
- Disc-eject: currently a disc goes in and only ever comes out by booting.
