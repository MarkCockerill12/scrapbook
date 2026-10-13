"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { img } from "@/lib/assets";
import { A, SLIDESHOW } from "./data";
import styles from "./gadgets.module.css";

/**
 * Vista Sidebar gadgets — clock, weather, CPU meter, slide show. They float on the
 * wallpaper with no panel behind them, which is how Win7 left them.
 */

export type Weather = "sunny" | "rain" | "rainbow" | "night";
export const WEATHER_ORDER: Weather[] = ["sunny", "rain", "rainbow", "night"];

function useNow(ms = 1000) {
  // Fixed 10:08:36 until mounted — the classic product-shot time, and hydration-safe.
  const [now, setNow] = useState(() => new Date(2007, 0, 30, 10, 8, 36));
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return now;
}

export function ClockGadget() {
  const now = useNow();
  const s = now.getSeconds();
  const m = now.getMinutes() + s / 60;
  const h = (now.getHours() % 12) + m / 60;
  return (
    <div className={styles.clock}>
      <svg viewBox="0 0 120 120" width="130" height="130" aria-label={now.toLocaleTimeString()}>
        <defs>
          <radialGradient id="fa-clock-face" cx=".5" cy=".4" r=".6">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset=".8" stopColor="#e3f3ea" />
            <stop offset="1" stopColor="#b9d8c6" />
          </radialGradient>
          <linearGradient id="fa-clock-rim" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e9fff0" />
            <stop offset=".5" stopColor="#5fbf7e" />
            <stop offset="1" stopColor="#1d6b3c" />
          </linearGradient>
          <linearGradient id="fa-clock-gloss" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity=".85" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r="56" fill="url(#fa-clock-rim)" />
        <circle cx="60" cy="60" r="49" fill="url(#fa-clock-face)" />
        {Array.from({ length: 12 }, (_, i) => (
          <line
            key={i}
            x1="60"
            y1={i % 3 ? 16 : 14}
            x2="60"
            y2={i % 3 ? 20 : 23}
            stroke="#28553b"
            strokeWidth={i % 3 ? 1.4 : 3}
            transform={`rotate(${i * 30} 60 60)`}
          />
        ))}
        <text x="60" y="44" textAnchor="middle" fontSize="7" fill="#4b7a5f" fontFamily="Segoe UI, sans-serif">
          Windows Vista
        </text>
        <line x1="60" y1="60" x2="60" y2="33" stroke="#123" strokeWidth="4" strokeLinecap="round" transform={`rotate(${h * 30} 60 60)`} />
        <line x1="60" y1="60" x2="60" y2="22" stroke="#123" strokeWidth="2.6" strokeLinecap="round" transform={`rotate(${m * 6} 60 60)`} />
        <line x1="60" y1="68" x2="60" y2="18" stroke="#2fb35a" strokeWidth="1.2" transform={`rotate(${s * 6} 60 60)`} />
        <circle cx="60" cy="60" r="3.5" fill="#2fb35a" stroke="#fff" />
        <ellipse cx="60" cy="36" rx="40" ry="24" fill="url(#fa-clock-gloss)" />
      </svg>
    </div>
  );
}

const WEATHER_TEXT: Record<Weather, { temp: string; sky: string; icon: string }> = {
  sunny: { temp: "24°", sky: "Sunny", icon: "☀" },
  rain: { temp: "17°", sky: "Light rain", icon: "☂" },
  rainbow: { temp: "21°", sky: "Clearing, rainbow", icon: "🌈" },
  night: { temp: "14°", sky: "Clear night", icon: "☾" },
};

export function WeatherGadget({ weather, onCycle }: { weather: Weather; onCycle: () => void }) {
  const w = WEATHER_TEXT[weather];
  return (
    <button type="button" className={`${styles.weather} ${styles[weather]}`} onClick={onCycle} title="Click to change the weather">
      <span className={styles.wIcon}>{w.icon}</span>
      <span className={styles.wTemp}>{w.temp}</span>
      <span className={styles.wSky}>{w.sky}</span>
      <span className={styles.wCity}>Redmond, WA</span>
    </button>
  );
}

export function CpuGadget() {
  const [v, setV] = useState({ cpu: 18, mem: 41 });
  useEffect(() => {
    const id = window.setInterval(
      () => setV((p) => ({ cpu: Math.max(3, Math.min(96, p.cpu + (Math.random() - 0.5) * 22)), mem: Math.max(30, Math.min(70, p.mem + (Math.random() - 0.5) * 4)) })),
      900,
    );
    return () => window.clearInterval(id);
  }, []);
  const needle = (pct: number) => -120 + (pct / 100) * 240;
  return (
    <div className={styles.cpu}>
      {[
        { v: v.cpu, x: 50, r: 38, label: "CPU" },
        { v: v.mem, x: 112, r: 26, label: "RAM" },
      ].map((g) => (
        <div key={g.label} className={styles.gauge} style={{ left: g.x - g.r, top: 50 - g.r, width: g.r * 2, height: g.r * 2 }}>
          <i className={styles.needle} style={{ height: g.r * 0.85, transform: `rotate(${needle(g.v)}deg)` }} />
          <b>{Math.round(g.v)}%</b>
        </div>
      ))}
    </div>
  );
}

export function SlideshowGadget({ onOpen }: { onOpen: (i: number) => void }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setI((x) => (x + 1) % SLIDESHOW.length), 5200);
    return () => window.clearInterval(id);
  }, []);
  return (
    <button type="button" className={styles.slides} onClick={() => onOpen(i)} title="Open in Photo Gallery">
      {SLIDESHOW.map((s, k) => (
        <img key={k} src={img(A, s.slot, s.n)?.src ?? ""} alt="" className={k === i ? styles.slideOn : styles.slide} />
      ))}
      <span className={styles.slideGloss} />
    </button>
  );
}
