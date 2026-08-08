# 04 · Xbox 360

**Fiction:** *xX_no_scope_420_Xx's montage upload page*, living inside a blades
dashboard that never got updated to the NXE.

**Canvas:** 1600×900, `fit`. No scroll. Letterbox `#0b1408`. **No assets.**

## The argument this page makes

The blades UI is a stack of **lit glass sheets**, not a row of tabs. Four properties
carry it, and losing any one drops it back to a generic dark dashboard:

1. **The blades overlap in Z.** Unselected blades compress to 46px strips — those
   left of the active one stack against the left edge, those right of it against the
   right — and each casts a hard shadow onto its neighbour.
2. **Every surface is glossy and lit from above.** Top-edge highlight, gradient
   darkening downward, 1px bright rim. Flat fills read as 2015.
3. **The green is environmental.** Background haze, rim light, the glow bleeding off
   the active blade. Green used only as an accent colour doesn't place the era.
4. **The list highlight inverts.** The selected row is a bright glossy pill with
   *dark* text. Every other UI of the period tinted the row instead; the 360 flipped
   it, and it's the single most recognisable detail in the whole dashboard.

## Interaction inventory

| Element | Behaviour |
|---|---|
| Blades (5) | Click any strip to open it. The panel slides, the swoosh plays, the whole page re-tints to that blade's colour |
| Marketplace | All 23 channels as store entries — owned / free / coming soon. "Download" navigates there |
| Xbox Live | 8 fictional gamertags, each in a *real* channel. "Join Session" navigates to it |
| Games → Achievements | 9 real achievements, persisted under `sb:xbox-360:achievements` |
| Games → SNIPEZ 360 | Targets pop; hold **right mouse** to scope; scoped hits score less |
| Media | A fake montage rendered to canvas on a scripted 18s loop, with a working transport readout |
| Montage mode | Saturate + contrast + hue shift + camera shake + lens dirt + vignette, over the entire page |
| Hitmarkers | Every click anywhere spawns one, with sound. Clicks inside 900ms chain into a combo counter |
| Recently played | Real — the shell's `visited` list, most recent first, backfilled with live channels |
| **Easter egg** | In SNIPEZ: sweep the cursor a full revolution around the arena (the meter fills), then land an **unscoped** hit → three red lights |

The achievements are the site's exploration reward: `sightseer` / `tourist` /
`completionist` read the shell's genuine `visited` list, so they unlock from things
the visitor did on other channels, days ago.

## Notes and gotchas

- **The reset ate the blades.** `.root button { background: none }` is (0,1,1) and
  outranks `.strip` at (0,1,0), so the gradient computed to `background-image: none`
  and the blades rendered as black slabs — no error, just wrong. Every aesthetic's
  reset is now wrapped in `:where()`. Written up in `TECHNICAL_SPECS.md §3`.
- **Spin angles are unwrapped per sample.** Accumulating raw `atan2` output means
  every crossing of the twelve o'clock line registers as half a revolution, and the
  meter fills by accident within seconds of idle movement. Taking the shortest signed
  step also makes direction changes cancel, so waggling never counts as a spin.
- **The target does not stop propagation.** The page-wide hit layer is listening on
  the root and is what draws the marker; the target only adds the body thud, because
  two hitmarker sounds stacked read as a bug.
- **The montage renders at 416×234 and scales up pixelated.** The defining quality of
  a 2010 montage is the *compression*, not the gameplay — a crisp render of the same
  scene looks like a modern capture.
- The clip runs a fixed beat list rather than random events, so the on-screen text,
  the recoil kick and the ammo counter always agree with each other.

## Still to do

- Achievement *rarity* percentages, which would need a shared backend.
- The 360's guide button overlay (press to open a mini-menu over anything).
- `x360_dew` — energy drink cans and crisp packets as real cutouts on the desk behind
  the dashboard. 16 harvested, quality unverified.
