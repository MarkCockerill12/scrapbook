# 22 · Channel 7 News

**Fiction:** *CHANNEL 7 ACTION NEWS at 6 — with your weather.* You are in the
gallery; the 4:3 signal is on the wall and the strips either side are your mixer.

**Canvas:** 1600×900, `fit`. Letterbox `#0c0d10`. **Assets:** real feeds — `nw_anchor` (empty set), `nw_chopper`, `nw_traffic`, `nw_sat`, `news_camera` (control room).

## The argument this page makes

1998 broadcast graphics come out of a **character generator with two effects** — a
bevel and a hard drop shadow — applied to everything, in condensed italic, over
hard-keyed colour. Four rules, and any one of them broken drags it into the present:

1. **Everything is bevelled and everything has a hard shadow.** The CG could do
   exactly two things and it did both to all of them.
2. **Type is condensed, italic and outlined.** Italic implies urgency; the outline
   exists so the graphic survives being keyed over live video.
3. **Gradients run vertically and band.** Smooth gradients are a 2005 idea.
4. **Nothing is transparent.** Broadcast keys were hard-edged; soft alpha reads as
   modern instantly.

The fifth is structural: **the signal is 4:3 and the studio is not.** The 200px
strips either side aren't padding, they're the gallery you're watching from.

## Interaction inventory

| Element | Behaviour |
|---|---|
| Sources | Weather wall / studio cam / go to break, with a cut sound |
| Lower third | **Type straight into it.** Name and role are live text fields, persisted under `sb:news:name` / `:role` |
| Ticker | Scrolls real headlines. Add your own from the right strip — yours run first and survive a reload |
| Doppler | 48-frame radar loop. Runs itself, and the timeline **scrubs properly**: every cell's position is a pure function of the frame index, so rewinding shows the weather you already saw |
| Chroma key | Replaces the wall with flat key green |
| Breaking | Slides the band in with two urgent stabs |
| Commercial | Full-frame local ad, with a jingle and unreadable small print |
| Clock | Live, on the bug and in the gallery |
| **Easter egg** | EAS test → colour bars and the Emergency Alert System attention signal: **853Hz and 960Hz together**, which beat at 107Hz and are physically unpleasant by design |

## Notes and gotchas

- **A scrubbable radar cannot be random.** Anything driven by `Math.random` per frame
  can't be rewound, and a radar loop you can't rewind is just an animation.
- **Reflectivity is three nested hard blobs, not a gradient.** Real NEXRAD products
  quantise at fixed dBZ thresholds; a smooth falloff looks like a heat map.
- **The anchor is framed camera right.** On the left they spend the whole bulletin
  behind their own name caption — which is why real galleries frame them opposite the
  graphic.
- **The anchor is lit, not silhouetted.** The weather wall behind is already dark
  navy, so a black figure vanishes into it. Faceless, though: a rendered face is
  uncanny at this size.
- The news sting **ends on a held fifth rather than resolving**, because local news
  music is arranged so the last chord can sit under the anchor indefinitely.

## Still to do

- `news_lowerthird` / `news_bug` / `news_ident` reference grabs, to check the
  proportions against real 1998 station packages.
- A weather *forecast* strip — five days of icons under the map.
- The commercial should cut back on its own after 20 seconds, like a real break.

## Fleshed out 2026-09-28

Mark: "cool but could be fleshed out more". New sources on the left strip, all keyed
under the same CG (lower third, bug, ticker):

| Source | Feed |
|---|---|
| Studio cam | a real (empty) news set — the drawn anchor is gone; "ANCHOR STEPPED AWAY · BACK IN 2" |
| Satellite | a real satellite image of a hurricane, slowly rotating, with the forecast cone and timed track points |
| 5-day forecast | the classic bevelled board |
| SKY 7 chopper | a real aerial of downtown at dusk with hand-held helicopter shake |
| Traffic cams | three real night traffic cams; click again to cycle |
| Sports desk | the scoreboard |

The gallery strips are now translucent over a real, blurred control-room photo.
