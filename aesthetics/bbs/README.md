# 16 · BBS / Teletext

**Fiction:** *THE ATTIC BBS*, one node, 1987. You dialled in and you are the only caller.

**Canvas:** 1600×900, `fit`. No scroll. Letterbox `#000000`. **No assets** — every glyph
comes from the character set.

## Why this isn't the Matrix channel in another palette

Matrix is cinematic hacking. This is what a modem actually connected to, and the
differences are specific:

1. **A hard 80×25 character grid.** Everything snaps to it. No free positioning, no
   floating panels, nothing rounded. The grid *is* the layout engine.
2. **The flat 16-colour ANSI palette.** No gradients, no glow on individual elements —
   a CGA monitor couldn't do a gradient and faking one is the tell. The glow lives on
   the whole screen instead, which is how a phosphor tube actually behaves.
3. **Amber, not green**, to put clear distance between this and channel 08.
4. **Text arrives at baud rate.** A 1987 board did not paint instantly, and that
   slowness is the defining sensation of the era.
5. **Keyboard only.** There is no pointer. Menus are numbered.

## Interaction inventory

| Element | Behaviour |
|---|---|
| Connect sequence | `ATZ` → `ATDT` → `CONNECT 9600`, painted at rate, with a modem handshake tone |
| `[1]` Bulletins | Board history, 1987 |
| `[2]` Message base | Six seeded messages plus anything you've posted |
| `[3]` Post | TAB switches field, ENTER posts. Persisted — it's there when you come back |
| `[4]` Channel directory | All 23 channels with ONLINE/NO ANSWER. Type a number + ENTER to dial — a real route change |
| `[5]` Door games | All "not registered". The SysOp says he'll pay. He will not |
| `[6]` Connection speed | **300 / 1200 / 2400 / 9600 / 19200.** Cycles with a resync flicker and a carrier tone |
| `[G]` Goodbye | `NO CARRIER` |
| **Easter egg** | Type `SYSOP` anywhere and someone answers |

**300 baud is the toy.** Every screen repaints at the selected rate — 30 characters per
second, per line, weighted by line length. Watching a menu crawl in is the single most
period-accurate thing on the page, and making it adjustable rather than hiding it is the
"tech demo" brief for this aesthetic.

## Notes and gotchas

- **The banner is composed from a 5×5 block font at runtime.** Hand-drawing it with
  half-block characters produced letterforms that read as "THE ATTE" — wrong shapes,
  misaligned columns. Real ANSI art was built on a character grid, so building it from
  one is both more authentic and impossible to misalign.
- **This channel claims the keyboard.** It calls `stopPropagation` on every keydown,
  because the dial listens globally and here every key is input.
- **The status bar has 320px of right padding** — the viewport-fixed dial was covering
  the caller/uptime segment.
- Message base loads in an effect, not during render: localStorage doesn't exist on the
  server.
- All paint goes through `emit()`. Anything that bypassed it and rendered instantly
  would break the channel's one big idea.

## Still to do

- Real ANSI art (`.ANS` files) for the bulletin screens rather than box-drawing.
- A working door game — "Guess the Number" is the obvious one.
- Teletext mode: a second palette with chunky 2×3 block graphics.
