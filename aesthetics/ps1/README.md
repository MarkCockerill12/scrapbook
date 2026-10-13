# 17 · PS1 Low-Poly — Saturday, 1998, on the bedroom floor

Overhauled 2026-09-28 (Mark: "cool, but it could use an overhaul, make sure there's
more to it"). The page is now the floor in front of the telly: the **real grey
PlayStation** with its controller (Evan-Amos / Commons, matted), **twelve real jewel
cases** (Wikipedia box art — Crash, Spyro, MGS, FF7, Silent Hill, Gran Turismo, THPS,
Tekken 3, RE2, Symphony of the Night, PaRappa, Tomb Raider) on real carpet (ambientCG).

- **Click a case** → it goes in the tray (spinning disc on the console), the drive
  reads, the **white SCE diamond boot** and the black "PlayStation / Licensed by…"
  screen play with a generated boot swell, then **the game runs** on the TV.
- **Four genres** through the same software rasteriser (`Game.tsx`), all with the
  swim, affine warp, no z-buffer and 240p, and **tank controls** (↑↓ move, ←→ turn,
  space/J act, Esc ejects):
  - *platform* (Crash, Spyro, Castlevania, PaRappa, Tomb Raider) — a jungle ring of
    trees, spinning fruit to collect, crates to smash;
  - *racer* (Gran Turismo, THPS) — a kerbed ring track, a rival car, lap counter;
  - *fog* (MGS, FF7, Silent Hill, RE2) — a village in fog with something walking
    toward you, radio static when it's close, a health bar;
  - *arena* (Tekken 3) — two fighters, J to punch, health bars, K.O., round 2.
- **MEMORY CARD** still opens the original save manager (`MemoryCard.tsx`), with the
  VRAM-fault egg intact.

Also fixed site-wide here: the shell dial's ←/→ channel keys now wait a tick and
respect `preventDefault`, so pages that use the arrow keys keep them.

Debt: the TV is still CSS — Commons rate-limited the Trinitron photos. Drop a frontal
CRT photo in `raw/ps1/ps_tv_01.*` and it's used automatically (`.tvPhoto`).
