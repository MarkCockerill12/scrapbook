"use client";

import { useEffect, useMemo, useState } from "react";
import { src } from "@/lib/assets";
import { audioBus, noiseLoop } from "@/lib/audio";
import { playNote, playNoise, useMusic, type Score } from "@/lib/music";
import { sbGet, sbSet } from "@/lib/storage";
import { useShell } from "@/lib/store";
import s from "./page.module.css";

/**
 * Channel — Video Store. Friday, 7:42 PM.
 *
 * New 2026-09-28 (from the AiContext candidate pool: "Blockbuster / video rental
 * Friday night"). The aisle of a real video store (Flickr CC) with the New Releases
 * wall stocked with real VHS covers (Wikipedia film posters, 1975–1997). Pull a tape
 * off the shelf, turn it over, carry up to three to the counter, get your card
 * swiped — and the late fees accrue for real, between visits.
 */

const A = "blockbuster";

const FILMS = [
  { n: 1, t: "Back to the Future", y: 1985, r: "PG", m: 116, g: "comedy", blurb: "A teenager, a DeLorean, 1.21 gigawatts. Rewind before returning." },
  { n: 2, t: "Jurassic Park", y: 1993, r: "PG-13", m: 127, g: "action", blurb: "An adventure 65 million years in the making. Objects in mirror are closer than they appear." },
  { n: 3, t: "Ghostbusters", y: 1984, r: "PG", m: 105, g: "comedy", blurb: "Who you gonna call? (Not the store. We close at midnight.)" },
  { n: 4, t: "The Goonies", y: 1985, r: "PG", m: 114, g: "family", blurb: "Goonies never say die. Tape may skip during the organ scene." },
  { n: 5, t: "Home Alone", y: 1990, r: "PG", m: 103, g: "family", blurb: "Kevin is eight and has been left behind. Keep the change, ya filthy animal." },
  { n: 6, t: "Jaws", y: 1975, r: "PG", m: 124, g: "horror", blurb: "You'll never go in the water again. Two-tape edition." },
  { n: 7, t: "E.T.", y: 1982, r: "PG", m: 115, g: "family", blurb: "He is afraid. He is alone. He is 3 million light years from home." },
  { n: 8, t: "Terminator 2", y: 1991, r: "R", m: 137, g: "action", blurb: "It's nothing personal. ID required to rent." },
  { n: 9, t: "The Matrix", y: 1999, r: "R", m: 136, g: "action", blurb: "Free your mind. (Also available at the next channel over.)" },
  { n: 10, t: "Titanic", y: 1997, r: "PG-13", m: 194, g: "drama", blurb: "Nothing on Earth could come between them. Except the two tapes." },
  { n: 11, t: "Toy Story", y: 1995, r: "G", m: 81, g: "family", blurb: "The adventure takes off! Every copy is out. This is the last one." },
  { n: 12, t: "The Lion King", y: 1994, r: "G", m: 88, g: "family", blurb: "Masterpiece Collection. Do not leave in a hot car." },
  { n: 13, t: "Clueless", y: 1995, r: "PG-13", m: 97, g: "comedy", blurb: "Sex. Clothes. Popularity. Is there a problem here? Whatever." },
  { n: 14, t: "Space Jam", y: 1996, r: "PG", m: 88, g: "family", blurb: "Get ready to jam. Website still online." },
  { n: 15, t: "Men in Black", y: 1997, r: "PG-13", m: 98, g: "action", blurb: "Protecting the Earth from the scum of the universe. Please do not flash staff." },
  { n: 19, t: "Beetlejuice", y: 1988, r: "PG", m: 92, g: "horror", blurb: "Say it three times. Don't." },
  { n: 20, t: "Gremlins", y: 1984, r: "PG", m: 106, g: "horror", blurb: "Don't get it wet. Don't feed it after midnight. Don't forget to rewind." },
  { n: 22, t: "Scream", y: 1996, r: "R", m: 111, g: "horror", blurb: "What's your favourite scary movie? Late fee: $1.49/night." },
  { n: 23, t: "Hocus Pocus", y: 1993, r: "PG", m: 96, g: "family", blurb: "It's just a bunch of hocus pocus. Every October, every copy." },
  { n: 24, t: "Wayne's World", y: 1992, r: "PG-13", m: 95, g: "comedy", blurb: "Party on. Excellent. (Not.)" },
];
type Film = (typeof FILMS)[number];
const SHELVES = ["NEW RELEASES", "FAMILY", "COMEDY", "ACTION", "HORROR"];
const FEE = 1.49;
const DAY = 86_400_000;

/* In-store radio: a jangly '96 pop loop, heard from the ceiling. */
const RADIO: Score = (step, time) => {
  const s16 = step % 16;
  const bar = Math.floor(step / 16) % 4;
  const roots = [55, 52, 48, 50];
  const r = roots[bar];
  if (s16 % 4 === 0) playNote({ freq: r - 12, midi: true, dur: 0.18, gain: 0.07, type: "triangle", filter: 700 }, time);
  if (s16 % 2 === 0) [0, 4, 7].forEach((i) => playNote({ freq: r + 12 + i, midi: true, dur: 0.08, gain: 0.012, type: "triangle", filter: 1600, wet: 0.4 }, time));
  if (s16 === 4 || s16 === 12) playNoise({ dur: 0.12, gain: 0.04, highpass: 1500, lowpass: 3000, wet: 0.4 }, time);
};

function beep() {
  const t = audioBus()?.ctx.currentTime;
  if (t === undefined) return;
  playNote({ freq: 2200, dur: 0.08, gain: 0.06, type: "square", filter: 4000 }, t);
}

export default function VideoStore() {
  const muted = useShell((st) => st.muted);
  const [shelf, setShelf] = useState(0);
  const [held, setHeld] = useState<Film | null>(null);
  const [back, setBack] = useState(false);
  const [basket, setBasket] = useState<number[]>([]);
  const [counter, setCounter] = useState(false);
  const [name, setName] = useState("");
  const [rentals, setRentals] = useState<{ n: number; due: number }[]>([]);
  const [now, setNow] = useState(0);
  const [rewinding, setRewinding] = useState(false);

  useEffect(() => {
    setName(sbGet(A, "member", ""));
    setRentals(sbGet(A, "rentals", []));
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useMusic(RADIO, 104, true);
  useEffect(() => {
    if (muted) return;
    return noiseLoop({ gain: 0.02, lowpass: 400, attack: 2 });
  }, [muted]);

  const films = useMemo(() => (shelf === 0 ? FILMS.slice(0, 12) : FILMS.filter((f) => f.g === SHELVES[shelf].toLowerCase())), [shelf]);
  const lateFees = rentals.reduce((sum, r) => sum + Math.max(0, Math.floor((now - r.due) / DAY)) * FEE, 0);

  const rent = () => {
    const due = Date.now() + 2 * DAY;
    const next = [...rentals, ...basket.map((n) => ({ n, due }))].slice(-9);
    setRentals(next);
    sbSet(A, "rentals", next);
    setBasket([]);
    beep();
  };

  const returnAll = () => {
    setRewinding(true);
    window.setTimeout(() => {
      setRewinding(false);
      setRentals([]);
      sbSet(A, "rentals", []);
      beep();
    }, 2400);
  };

  return (
    <div className={s.root}>
      <img className={s.aisle} src={src(A, "bb_store", 3)} alt="" />
      <div className={s.grade} />

      <header className={s.sign}>
        <span className={s.ticket}>
          <b>VIDEO</b>
          <em>STORE</em>
        </span>
      </header>

      <nav className={s.tabs}>
        {SHELVES.map((sh, i) => (
          <button key={sh} type="button" className={i === shelf ? s.tabOn : ""} onClick={() => setShelf(i)}>
            {sh}
          </button>
        ))}
      </nav>

      {/* the wall */}
      <div className={s.wall}>
        {films.map((f) => {
          const out = rentals.some((r) => r.n === f.n);
          return (
            <button key={f.n} type="button" className={`${s.tape} ${out ? s.out : ""}`} onClick={() => { setHeld(f); setBack(false); }} title={f.t}>
              <img src={src(A, "bb_vhs", f.n)} alt={f.t} />
              {shelf === 0 && <span className={s.nr}>NEW!</span>}
              {out && <span className={s.outTag}>ALL COPIES OUT</span>}
            </button>
          );
        })}
        <div className={s.ledge} />
      </div>

      {/* your hands */}
      <div className={s.basket}>
        <b>YOUR PICKS ({basket.length}/3)</b>
        <div>
          {basket.map((n) => (
            <img key={n} src={src(A, "bb_vhs", n)} alt="" />
          ))}
        </div>
        <button type="button" disabled={!basket.length} onClick={() => setCounter(true)}>
          TAKE TO COUNTER ▸
        </button>
      </div>

      <div className={`${s.fees} ${lateFees > 0 ? s.feesDue : ""}`}>
        <b>LATE FEES</b>
        <span>${lateFees.toFixed(2)}</span>
        <small>{rentals.length ? `${rentals.length} tape(s) out · due back in 2 days` : "nothing out"}</small>
        {rentals.length > 0 && (
          <button type="button" onClick={returnAll}>
            {rewinding ? "rewinding…" : "↺ return & rewind"}
          </button>
        )}
      </div>

      {held && (
        <div className={s.lift} onClick={() => setHeld(null)}>
          <div className={`${s.box} ${back ? s.flipped : ""}`} onClick={(e) => { e.stopPropagation(); setBack((b) => !b); }}>
            <div className={s.boxFront}>
              <img src={src(A, "bb_vhs", held.n)} alt={held.t} />
            </div>
            <div className={s.boxBack}>
              <h3>{held.t}</h3>
              <p className={s.meta}>
                {held.y} · RATED {held.r} · {held.m} MIN · COLOR · HI-FI STEREO
              </p>
              <p>{held.blurb}</p>
              <p className={s.warn}>FBI WARNING: Federal law provides severe civil and criminal penalties for the unauthorized reproduction, distribution or exhibition of copyrighted motion pictures.</p>
              <div className={s.barcode} />
              <p className={s.rewind}>BE KIND · PLEASE REWIND</p>
            </div>
          </div>
          <div className={s.liftBtns} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              disabled={basket.length >= 3 || basket.includes(held.n) || rentals.some((r) => r.n === held.n)}
              onClick={() => {
                setBasket((b) => [...b, held.n]);
                setHeld(null);
                beep();
              }}
            >
              {rentals.some((r) => r.n === held.n) ? "already rented" : "✓ grab it"}
            </button>
            <button type="button" onClick={() => setHeld(null)}>
              put it back
            </button>
            <span>click the case to turn it over</span>
          </div>
        </div>
      )}

      {counter && (
        <div className={s.lift}>
          <div className={s.counter}>
            <h3>CHECKOUT · REGISTER 2</h3>
            <div className={s.card}>
              <b>MEMBER</b>
              <input
                value={name}
                placeholder="your name"
                onChange={(e) => {
                  setName(e.target.value.toUpperCase());
                  sbSet(A, "member", e.target.value.toUpperCase());
                }}
                onKeyDown={(e) => e.stopPropagation()}
              />
              <span>#0042 7719 3308</span>
            </div>
            <div className={s.receipt}>
              {basket.map((n) => {
                const f = FILMS.find((x) => x.n === n)!;
                return (
                  <p key={n}>
                    <span>{f.t.toUpperCase()}</span>
                    <span>$3.99</span>
                  </p>
                );
              })}
              <p className={s.total}>
                <span>TOTAL</span>
                <span>${(basket.length * 3.99 + lateFees).toFixed(2)}</span>
              </p>
              <p>DUE BACK: {new Date(Date.now() + 2 * DAY).toDateString().toUpperCase()} BY NOON</p>
            </div>
            <div className={s.liftBtns}>
              <button
                type="button"
                disabled={!name}
                onClick={() => {
                  rent();
                  setCounter(false);
                }}
              >
                ▸ swipe card & rent
              </button>
              <button type="button" onClick={() => setCounter(false)}>
                keep browsing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
