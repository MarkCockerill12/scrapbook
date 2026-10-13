# 11 · Aztec / Lost Izalith — The Descent

Redesigned 2026-09-28. Mark: *"a complete rework — a collage of Dark Souls' Lost
Izalith and Aztec/Mayan structure; this is more like a puzzle wall."* The glyph
puzzle and rub panel are gone.

A panorama (3000px at the near layer) you walk by moving the torch to the screen
edges, in four parallax layers:

1. **The far dark** — Lost Izalith and the Demon Ruins (Dark Souls wiki screenshots),
   graded down and blurred.
2. **The pyramids** — real, matted Wikipedia photos of Chichén Itzá, Tikal, the
   Pyramid of the Magician, Palenque and Cobá, relit: daylight killed, lava light
   poured up from below.
3. **The relics** — the Sun Stone, a chacmool, an Olmec colossal head and the Tula
   warriors (real photos), each examined like a Souls item: name, type, and a lore
   paragraph that is true archaeology in Izalith's voice (`lore.ts`).
4. **The ground and the lava** — real paving stone (ambientCG) and a real lava lake
   (Nyiragongo) flowing along the bottom.

| Element | Behaviour |
|---|---|
| Torch | the cursor; everything outside it falls to near-black |
| Relics | examine → item card; relics found persisted |
| Bonfire | light / rest → BONFIRE LIT |
| Orange soapstone | five messages on the floor ("praise the sun \o/", "try jumping"…) |
| Lava | hold the torch in it for two seconds → YOU DIED → back to the bonfire; deaths persisted |
| **Egg (kept)** | the "try jumping" message is by a crack — strike it three times and the floor gives way to the Deep Sea |
| Sound | generated low minor choir, drums inside the temple, fire |
