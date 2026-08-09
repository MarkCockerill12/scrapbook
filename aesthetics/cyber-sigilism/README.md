# 23 · Cyber Sigilism / Silver Tech

**Fiction:** *A drawer of dead devices, photographed and annotated.*

**Canvas:** 1600×900, `fit`. Letterbox `#262b33`.
**Assets:** `raw/cyber-sigilism/` — matted dead hardware (Discman, MiniDisc, MP3
players, a GBA, earbuds).

## The argument this page makes

**Chrome is a reflection, not a gradient.** A metal surface reflects a horizon —
bright sky above, dark ground below, with a *hard flip* between them. Soften that
flip and you have grey plastic. The wordmark's flip point tracks the cursor's height,
because a reflection has to move when you do.

Three more:

- **Sigil linework goes *over* the photographs**, in silver, screen-blended — the way
  it was airbrushed onto Y2K packaging, not sitting behind as wallpaper.
- **One light source.** Every cutout and every drawn device throws the same shadow in
  the same direction. Mixed shadow directions are what make a collage look assembled.
- **The devices you can switch on are drawn, not photographed.** An object
  photographed on a table cannot have a working click wheel. The photographs are the
  clutter; the drawings are the interface.

## Interaction inventory

| Element | Behaviour |
|---|---|
| iPod | Drag around the click wheel to scroll the track list — one notch per ~26° of rotation, with the piezo tick. Centre button plays |
| Flip phone | Click the keypad half to open and shut the clamshell on a real `rotateX` hinge. The top screen has a message waiting |
| Handheld | Flick the power switch → boot logo, held chime, then a save-select screen |
| Clutter | Every photographed device is draggable and clatters when you let go |
| Catalogue plates | Each item is annotated with a leader line, like a catalogue figure |
| Sigils | Ink themselves on with `stroke-dashoffset`, staggered. **Redraw** replays it |
| Cable | Drag the three white handles. "Tangle" is the **total turning** of the run — sum of the absolute angle change at each control point — so you can't cheat it by dragging everything into a corner |
| **Easter egg** | All three devices alive at once → every screen agrees with every other screen |

## Notes and gotchas

- **The cable SVG killed every device.** It spans the whole canvas at z-index 25, so
  without `pointer-events: none` it swallowed every click meant for the hardware
  underneath — the wheel, the phone and the power switch were all silently dead. Only
  the handles take input now. Same class of bug as the drag-handle/pointer-capture
  one; full-bleed overlays are worth auditing on every page.
- The click wheel's tick is **piezo**, not a speaker sound: 3.2kHz, 8ms, square. It
  came out of a buzzer under the wheel, which is why it is so thin. A rounded UI blip
  is instantly wrong.
- Tangle is measured in radians of turning rather than as a distance, which makes it
  a genuine property of the shape.

## Still to do

- Untangling the cable should *do* something beyond the readout.
- The GBA in the clutter is a photograph while the handheld beside it is drawn; they
  should not both be in frame.
- Sigils are four fixed paths. "Redraw" replays them rather than generating new ones.
