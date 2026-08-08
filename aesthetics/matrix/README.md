# 08 · Matrix

**Fiction:** an unauthorised session. You're inside something, it noticed, and it has
started tracing you.

**Canvas:** 1600×900, `fit`. No scroll — the terminal scrolls internally, which is a
widget, not the page. Letterbox `#020604`.

**Assets: none.** Entirely code-generated. This channel was built specifically because
it needs nothing from the image manifest.

## What makes this aesthetic work

Green text on black is trivially easy and looks like a student project. What separates
it from the real thing:

1. **Phosphor, not paint.** Green *glows* — `text-shadow` at the same hue, bright core,
   wide dim halo. A flat `#0f0` is the tell.
2. **Two greens and black, nothing else.** Red is reserved exclusively for the trace,
   so when it appears it means danger. Any third hue has to be earned.
3. **Everything slightly transparent and slightly askew.** Panels sit at ±0.4–0.6°,
   never square, so the rain shows through and the composition feels handheld.
4. **Scanlines and a vignette over the whole frame**, tying the layers together.

## The rain

Column-based. Each column has a head falling at its own rate; the trail comes from
painting a low-alpha black rect over the whole canvas each frame instead of clearing
it. That fade-to-black *is* the taper — drawing N trailing glyphs by hand is slower and
looks worse.

**The head glyph is near-white, not green.** That's the detail most recreations miss:
the leading character is blown out and only the tail is phosphor.

Columns near the cursor stall to 25% speed and dim, so the rain *parts* around the
pointer rather than pouring through it.

## Interaction inventory

| Element | Behaviour |
|---|---|
| Terminal | A real shell over a real (small) filesystem |
| Commands | `help` `ls` `cd` `cat` `pwd` `whoami` `channels` `connect` `ps` `uname` `date` `echo` `clear` `exit` `sudo` |
| Tab | Path completion; ambiguous prefixes list matches |
| ↑ / ↓ | Command history |
| `connect <slug>` | Genuine route change through the shell's transition |
| Files worth finding | `~/readme.txt`, `~/.bash_history`, `/etc/channels.conf` (generated from the registry), `/var/log/access.log` |
| Node list | Names render as ciphertext, flicker, and resolve character-by-character on hover |
| Panels | All three draggable with inertia via the shared `<Draggable>` primitive; positions persist |
| Globe | Wireframe, rotating, with target pings. Far-side lines drawn dimmer — that's what sells the depth |
| Trace bar | Fills over 45s of *inactivity*, resets on any input. Turns red past 66% |
| **Easter egg** | `sudo rm -rf /` — everything detaches and falls off the bottom, then restores after 4s |

## Notes and gotchas

- **The initial scramble must be deterministic.** Seeding `Decrypt` with `Math.random()`
  produced different ciphertext on server and client and threw a hydration mismatch on
  every node in the list. It's now seeded by character index; the random flicker starts
  from an effect, after hydration has already agreed on the markup.
- **The terminal input stops arrow-key propagation.** The dial listens globally; inside
  a prompt those keys mean history.
- **`.panel` is `position: relative`** — `<Draggable>` owns `left`/`top`/`transform` on
  the wrapper. Both trying to position is how you get an element that won't move.
- **The trace ticks on `setInterval`, not rAF.** It's a once-a-second readout, and rAF
  would wake the main thread 60× more often on a page already running two canvases.
- Floating text (header, trace, hint) gets a double `drop-shadow` black wash rather than
  a panel border — glyphs falling behind a letterform make it unreadable, but a box
  would be wrong for things that aren't windows.
- The hint sits at `left: 790px` because the trace bar ends at 750 and the viewport-fixed
  dial starts around 1280. Bottom-right hid it under the dial; raising it hid it under
  the nodes panel.

## Still to do

- `SYSOP` easter egg: someone starts typing back.
- Sampled audio — modem chatter and a low drone. Keystrokes and the trace alarm are
  synthesised and fine as they are.
- Only the first 9 channels show in the node list; it wants a scroll or a second column.
