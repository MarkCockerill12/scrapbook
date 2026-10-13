# 10 · Vaporwave — PLAZA 95

Redesigned 2026-09-28. Mark: *"get rid of the statue and do more interesting things
with it — we need more synth stuff, cool mountains and an overall redesign."*

A sunset synth studio on the edge of a wireframe mountain range. The statue/bust
collage is gone.

- **Sky:** sliced vaporwave sun (breathes on the kick), stars, and **real Mount Fuji**
  (Wikipedia lead photo, matted, duotoned into the sunset — `vw_fuji`).
- **Mountains:** `Mountains.tsx`, a flown-over wireframe heightfield drawn far→near with
  painter's occlusion, valley kept flat for the grid road; lines flash on the kick.
- **The machines are real photographs, and playable** (`vw_synth` 1 = TR-808, 2 = Juno-60),
  hotspots measured off the photos as fractions (`Instruments.tsx`):
  - **Juno-60:** all 61 keys (mouse, glissando, or type A W S E D F T G Y H U J K O L P ;),
    ARP on/off (arpeggiates what's held; walks maj7s when nothing is), HOLD (latch),
    CHORUS off/I/II, eight patches with the red LED readout.
  - **TR-808:** pick an instrument by its label (BD SD LT HT RS CP CB CY OH CH),
    16 step buttons with LEDs, START/STOP (or space), click the tempo knob to cycle
    84–132 BPM. Pattern persists. Default groove loaded.
- **slowed_reverb.dll** — the genre's one trick, done live: drags pitch AND tempo down
  and floods the reverb send (`engine.ts` `slow`). Persisted.
- **Egg:** hold a Cmaj7 → a dolphin leaps across and the tape's secret title glitches in.

Engine (`engine.ts`): Juno voice = detuned saws through a lowpass with a stereo chorus
twin and optional sub; 808 = sine pitch-drops, filtered noise, two-square cowbell —
the way the 808 did it. All on `lib/music.ts`.
