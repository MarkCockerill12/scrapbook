# 16 · Tropical Night — Kai's Tiki Lounge

Rebuilt 2026-09-28. Mark: *"needs an entire rework — it's just a bunch of stuff mashed
together."* The three side-by-side photo panels are gone. It is now **one place**: you're
at the bar of a lanai, looking out through the posts at the sea.

- **Outside:** one real sunset (Flickr CC, `tk_beach` 4), graded by the dusk→midnight
  slider; stars and the moon come out; click the sky to release a real sky lantern.
- **The frame:** real wood and bamboo (ambientCG `tk_wood`, `tk_bamboo`), a thatch
  fringe, a carved panel and mask, two real torch flames (click to douse), a real
  pufferfish lamp swinging from the lintel, a string of bulbs.
- **The menu:** carved into a plank. Order → the shaker rattles → the real drink slides
  down the bar with a note on its history. Your tab persists.
- **The bar:** real tiki mugs, a real hula dashboard doll (click: she dances, a
  ukulele strum), a plumeria.
- **Sound:** generated exotica — vibraphone, bongos, lazy bass, the band doing bird
  calls — and surf.

Gotcha: bulb positions are rounded; unrounded `Math.sin` px values serialised
differently on server and client and broke hydration.
