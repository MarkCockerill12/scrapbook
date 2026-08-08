# 10 · Vaporwave

**Fiction:** *A E S T H E T I C S / 美学* — the landing page of a bootleg tape nobody
pressed.

**Canvas:** 1600×900, `fit`. No scroll. Letterbox `#17032e`.
**Assets:** `raw/vaporwave/` — 26 grabs (busts, statues, dolphins, palms, cassettes,
checkerboard), matted with rembg. **The first channel whose substance is
photographic rather than drawn.**

## The argument this page makes

Vaporwave is the most imitated aesthetic on earth and almost every imitation is a
purple gradient with a grid on it. Four things separate the real thing:

1. **It is a collage of stolen objects.** Marble busts, dolphins, palms, cassettes —
   real photographs, cut out and floated. Drawn shapes read as homage; cut
   photographs read as the thing itself. This is rule R3 doing actual work.
2. **The sun's slits widen downward.** Equal-width bands read as a test card. The
   gaps have to grow toward the horizon.
3. **Everything is slightly out of register.** Chromatic fringing, windows at
   angles, a tape that plays flat. Perfect registration kills it.
4. **The chrome is 1995 and untouched.** Bevels stay grey and correct; only the title
   bars take the pink. Restyling the whole window is the usual giveaway.

## Interaction inventory

| Element | Behaviour |
|---|---|
| Windows (4) | Real: drag by the title bar, minimise, maximise, close, and click-to-raise z-order |
| Tracklist | Click a track to select and start the tape; the cassette label and the cover art both follow it |
| Cassette deck | Working transport — play/pause/stop/rew/ff, reels that only turn while playing, a counter that only advances while playing, and a VU meter |
| Tape audio | Four detuned major-seventh chords at 4.2s a bar, over filtered noise hiss. Pausing stops the chords and **keeps** the hiss, because silence reads as a bug |
| Scroll speed | Drives the grid. At 0 the floor stops dead |
| Convergence | RGB fringing on the grid, the wordmark and the bust, 0–6px |
| Bust | Drag to turn. Past ±34° it swaps to the next bust photograph, so a full sweep genuinely shows another angle |
| **Easter egg** | Close all four windows → the floor stops, the sun sets over 3.2s, `THANK YOU FOR PLAYING`. Click anywhere to restore |

## Notes and gotchas

- **Pointer capture eats the button's click.** The title bar called
  `setPointerCapture` on `pointerdown`, which retargets the matching `pointerup` to
  the capturing element — so `click` fired on the *title bar* and minimise, maximise
  and close were all silently inert. The drag handler now bails when the press
  started on a `<button>`. No error is produced anywhere; the only symptom is that
  nothing happens.
- **Offsets position the FILE, not the subject.** A matted PNG keeps the original
  photograph's frame, so a palm sits wherever it sat in the shot. The right-hand palm
  needed `right: -300` to get its trunk onto the frame edge. `alphaBox` is in the
  manifest for exactly this and `<Cutout>` doesn't use it yet — see below.
- **The sun had to move up to y=330.** The grid canvas starts at y=430 and paints an
  opaque haze, so the entire slitted half of the disc was hidden behind it and the
  sun rendered as a solid semicircle.
- **The cover-art checkerboard is tinted pink/cyan.** In neutral grey at 28px it read
  as the "this pixel is transparent" grid — the worst possible signal on a page made
  of cut-out photographs.
- Chromatic aberration on the grid is **three draw passes under `lighter`**
  compositing (red offset one way, cyan the other, then the main pass), because a CSS
  filter can't fringe directionally.

## Still to do

- `<Cutout>` should honour `alphaBox` and position by visible subject, which would
  remove the hand-tuned palm offsets here and help every collage page after this one.
- A second bust rotating in the background at a different rate, for parallax.
- The tape should audibly wow and flutter — a slow LFO on the chord detune.
