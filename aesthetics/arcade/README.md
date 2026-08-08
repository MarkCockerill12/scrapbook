# 21 · Arcade

**Fiction:** *SCRAPBOOK — 1 PLAYER · INSERT COIN.* The page is the cabinet.

**Canvas:** 1600×900, `fit`. Letterbox `#0a0806`. **No assets.**

## The argument this page makes

A cabinet is **hardware you are standing at**, and what makes it hardware is that it
does not care about you until you pay. Four details do the work:

1. **The screen is recessed** — a bezel with a real inner shadow and glass over it. A
   CRT flush with the surrounding panel reads as a div.
2. **The marquee is backlit, not printed.** Light comes from inside, spills onto the
   cabinet below, and flickers, because the tube is thirty years old.
3. **The glass reflects the room** — one soft diagonal sheen. Cheapest detail on the
   page and it does more than the scanlines.
4. **The control panel is a different material** to the cabinet body: brushed dark
   laminate with the button holes punched through it.

## Interaction inventory

| Element | Behaviour |
|---|---|
| CRT warm-up | On load: a bright line opens into a picture, the way a tube actually starts |
| Attract mode | Three pages on a 4.2s loop — title, high scores, and a DEMO of a channel. It also *reclaims* the screen if you idle for 25s mid-select, which is what makes it feel like a machine rather than a menu |
| Coin slot | Real credits, with the mech-and-cashbox sound |
| START | Refuses without a credit. Spends one and opens game select |
| Joystick | Drag it. New direction fires immediately, holding repeats every 180ms, and it springs back on release |
| SELECT (red) | Launches the highlighted channel |
| SIGN (blue) | Enter three initials on the high score table — up/down for letters, left/right to move |
| High scores | Persisted under `sb:arcade:scores`. **Your score is `visited.length × 1000`** — how much of the site you have actually seen |
| **Easter egg** | Insert 99 coins (counted across visits, persisted) → FREE PLAY, permanently |

## Notes and gotchas

- **The coin slot had to move 260px left.** It sat at the panel's right end, directly
  under the shell's fixed dial, which swallows clicks there — on a page whose entire
  premise is that you have to put a coin in. `TECHNICAL_SPECS §2b`.
- Everything audible is a **square wave**. One PSG chip, no room for anything
  cleverer; the moment a sine creeps in it stops sounding like a cabinet.
- The screen component is deliberately **stateless** — the cabinet owns everything.
  Giving the display opinions is how it stops feeling like hardware.

## Still to do

- Free play should genuinely put a cabinet bezel on every other channel, which needs
  a shell-level flag the chrome reads.
- A real playable attract demo rather than a channel card.
- Two-player controls, since the marquee claims them.
