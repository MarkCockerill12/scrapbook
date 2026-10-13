"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { cutN, img } from "@/lib/assets";
import { noiseLoop, tone, unlock } from "@/lib/audio";
import { playNote, useMusic, type Score } from "@/lib/music";
import { sbGet, sbSet } from "@/lib/storage";
import { useShell } from "@/lib/store";
import n from "./night.module.css";

/**
 * Channel — Tropical Night.
 *
 * Eighth build (2026-10). Mark, on the seventh: "needs revamped as it looks bad, the
 * objects shouldn't be affected by the parallax."
 *
 * It looked bad because things lit by a midday sun had been stood in front of a sunset
 * and then slid about over it. So: nothing moves with the pointer any more, and the
 * scene is lit the way dusk lights it. You are at the rail of a beach bar. The beach is
 * one photograph; the palms leaning over the water are a real pair from another Maui
 * dusk; the torches and the carved ki'i are backlit, almost shapes; the fire on each
 * torch is a photograph of a torch flame. Your drink is on the rail in front of you.
 */

const A = "tiki";

interface Torch {
  id: string;
  /** centre of the pole, where it meets the sand, and how tall the cut-out stands */
  x: number;
  foot: number;
  h: number;
}

// Nearest first, running away up the beach.
const TORCHES: Torch[] = [
  { id: "near", x: 770, foot: 860, h: 560 },
  { id: "mid", x: 1012, foot: 770, h: 340 },
  { id: "far", x: 1184, foot: 684, h: 200 },
];

interface Drink {
  id: string;
  name: string;
  slot: string;
  n: number;
  h: number;
  sips: number;
}

const DRINKS: Drink[] = [
  { id: "maitai", name: "Mai Tai", slot: "tiki_cocktail", n: 3, h: 200, sips: 5 },
  { id: "lava", name: "Lava Flow", slot: "tiki_cocktail", n: 1, h: 270, sips: 5 },
  { id: "zombie", name: "Zombie", slot: "tk_mug", n: 5, h: 220, sips: 6 },
];

// Four slow major-seventh chords, every note eased in over most of a second, and
// one high note now and then that is eased in too. Nothing here has an attack.
const CHORDS = [
  [48, 55, 59, 64],
  [45, 52, 55, 60],
  [41, 48, 52, 57],
  [43, 50, 53, 59],
];
const BELL = [76, 79, 83, 79, 72, 76, 81, 77];
const score: Score = (step, time) => {
  const bar = Math.floor(step / 8);
  const c = CHORDS[bar % CHORDS.length];
  if (step % 8 === 0) c.forEach((m, i) => playNote({ freq: m, midi: true, dur: 5.2, type: "sine", gain: 0.03, attack: 1.1, release: 2.6, wet: 0.5, pan: (i - 1.5) * 0.25 }, time + i * 0.14));
  if (step % 8 === 4 && bar % 2 === 0) playNote({ freq: BELL[(bar / 2) % BELL.length | 0], midi: true, dur: 1.6, type: "sine", gain: 0.022, attack: 0.3, release: 2.4, wet: 0.7 }, time);
};

export default function TropicalNight() {
  const muted = useShell((s) => s.muted);
  const [lit, setLit] = useState<Record<string, boolean>>({ near: true, mid: true, far: true });
  const [late, setLate] = useState(false);
  const [radio, setRadio] = useState(true);
  const [glass, setGlass] = useState(0);
  const [sips, setSips] = useState(0);
  const [tip, setTip] = useState(0);

  useEffect(() => {
    setLate(sbGet(A, "late", false));
    setRadio(sbGet(A, "radio", true));
    setGlass(sbGet(A, "glass", 0) % DRINKS.length);
  }, []);

  useMusic(score, 40, radio, 2);

  // The sea: continuous, faded in, and swelling on a timer by gain alone. No bursts.
  useEffect(() => {
    if (muted) return;
    const wind = noiseLoop({ gain: 0.012, lowpass: 800, highpass: 200, attack: 3 });
    const wash = noiseLoop({ gain: 0.05, lowpass: 520, highpass: 90, attack: 4 });
    const hiss = noiseLoop({ gain: 0.012, lowpass: 3800, highpass: 1500, attack: 6 });
    return () => {
      wind();
      wash();
      hiss();
    };
  }, [muted]);

  const burning = Object.values(lit).filter(Boolean).length;
  useEffect(() => {
    if (muted || !burning) return;
    // the flames: a low flutter, nothing that pops
    return noiseLoop({ gain: 0.007 * burning, lowpass: 260, highpass: 60, attack: 2 });
  }, [muted, burning]);

  const drink = DRINKS[glass];
  const left = drink.sips - sips;

  const torch = (t: Torch) => {
    unlock();
    setLit((l) => ({ ...l, [t.id]: !l[t.id] }));
    tone({ freq: lit[t.id] ? 220 : 160, toFreq: lit[t.id] ? 110 : 300, duration: 0.5, gain: 0.03 });
  };

  const sip = () => {
    unlock();
    setTip((k) => k + 1);
    if (left <= 0) {
      const next = (glass + 1) % DRINKS.length;
      setGlass(next);
      setSips(0);
      sbSet(A, "glass", next);
      return;
    }
    setSips((s) => s + 1);
    // ice against glass
    [0, 0.09, 0.2].forEach((dl, i) => tone({ freq: 2200 + i * 420, duration: 0.09, gain: 0.025, delay: dl }));
  };

  const photo = img(A, "hw_sand", 1);
  const torchCut = cutN(A, "hw_tt", 1);
  const fire = img(A, "hw_flame", 1);
  const pair = cutN(A, "hw_pair", 1);
  const post = cutN(A, "hw_prop", 3);
  const hula = cutN(A, "tk_hula", 1);
  const wood = img(A, "tk_wood", 1);
  const flower = cutN(A, "tiki_flower", 1);
  const cut = cutN(A, drink.slot, drink.n);

  return (
    <div
      className={n.root}
      data-late={late || undefined}
      style={{ "--fire": burning / TORCHES.length } as CSSProperties}
      onPointerDown={() => unlock()}
    >
      {/* the beach: one photograph, and the same one again in blue for later */}
      <div className={n.view}>
        {photo && <img className={n.photo} src={photo.src} alt="Kāʻanapali beach, Maui, just after sunset" draggable={false} />}
        {photo && <img className={`${n.photo} ${n.night}`} src={photo.src} alt="" draggable={false} />}
        <div className={n.stars} />
        <div className={n.firelight} />
      </div>

      {pair && <img className={n.pair} src={pair.src} alt="" draggable={false} />}
      {post && <img className={n.post} src={post.src} alt="" draggable={false} />}

      {/* three torches up the beach: click one to put it out or light it */}
      {torchCut &&
        TORCHES.map((t, i) => {
          const w = (t.h * torchCut.width) / torchCut.height;
          return (
            <button
              key={t.id}
              type="button"
              className={n.torch}
              data-lit={lit[t.id] || undefined}
              style={{ left: t.x - w / 2, top: t.foot - t.h, width: w, height: t.h, "--i": i, "--h": `${t.h}px` } as CSSProperties}
              onClick={() => torch(t)}
              aria-label={lit[t.id] ? "Put the torch out" : "Light the torch"}
            >
              <i className={n.pool} />
              <i className={n.glow} />
              <img className={n.stick} src={torchCut.src} alt="" draggable={false} />
              {fire && (
                <span className={n.fire}>
                  <img src={fire.src} alt="" draggable={false} />
                </span>
              )}
            </button>
          );
        })}

      {/* on the rail: a flower, your drink, and a hula girl who never quite stops */}
      {flower && <img className={n.flower} src={flower.src} alt="" draggable={false} />}
      {cut && (
        <button type="button" className={n.drink} key={`${drink.id}${tip}`} data-tip={tip > 0 || undefined} style={{ height: drink.h }} onClick={sip} aria-label={left > 0 ? "Take a sip" : "Order the next one"}>
          <img src={cut.src} alt={drink.name} draggable={false} data-crop={drink.id === "maitai" || undefined} />
        </button>
      )}
      {hula && <img className={n.hula} src={hula.src} alt="" draggable={false} />}
      <div className={n.rail} style={wood ? { backgroundImage: `url(${wood.src})` } : undefined} />
      <div className={n.tally}>
        <b>{drink.name}</b>
        <span>
          {Array.from({ length: drink.sips }, (_, k) => (
            <i key={k} data-gone={k >= left || undefined} />
          ))}
        </span>
        <small>{left > 0 ? `${left} sip${left === 1 ? "" : "s"} left` : "empty — click for another"}</small>
      </div>

      <div className={n.grade} />

      <header className={n.brand}>
        <b>Tropical Night</b>
      </header>

      <nav className={n.dials}>
        <button
          type="button"
          data-on={late || undefined}
          onClick={() => {
            unlock();
            setLate((l) => {
              sbSet(A, "late", !l);
              return !l;
            });
          }}
        >
          <i data-k="hour" /> {late ? "back to dusk" : "let it get late"}
        </button>
        <button
          type="button"
          data-on={radio || undefined}
          onClick={() => {
            unlock();
            setRadio((r) => {
              sbSet(A, "radio", !r);
              return !r;
            });
          }}
        >
          <i data-k="radio" /> {radio ? "music: on" : "music: off"}
        </button>
      </nav>
    </div>
  );
}
