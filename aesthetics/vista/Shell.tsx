"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { cut, img } from "@/lib/assets";
import { A, type AppId } from "./data";
import { Icon, StartOrb, type IconName } from "./Icons";
import styles from "./shell.module.css";

export const APP_META: Record<AppId, { title: string; icon: IconName }> = {
  welcome: { title: "Welcome Center", icon: "welcome" },
  media: { title: "Windows Media Player", icon: "media" },
  messenger: { title: "Windows Live Messenger", icon: "messenger" },
  gallery: { title: "Photo Gallery", icon: "gallery" },
  personalize: { title: "Personalization", icon: "personalize" },
  aquarium: { title: "Aquarium", icon: "aquarium" },
  computer: { title: "Computer", icon: "computer" },
};

/** The other game channels, listed in Start › Games. */
const GAMES = [
  { slug: "xbox-360", name: "Xbox LIVE Arcade" },
  { slug: "wii", name: "Wii Channel Menu" },
  { slug: "game-beach", name: "Game Beach" },
  { slug: "ps1", name: "PlayStation Memory Card" },
  { slug: "arcade", name: "Arcade Cabinet" },
];

export function Taskbar({
  open,
  active,
  startOpen,
  onStart,
  onTask,
  onFlip,
  onDesktop,
  onLaunch,
}: {
  open: { id: AppId; min: boolean }[];
  active: AppId | null;
  startOpen: boolean;
  onStart: () => void;
  onTask: (id: AppId) => void;
  onFlip: () => void;
  onDesktop: () => void;
  onLaunch: (id: AppId) => void;
}) {
  return (
    <div className={styles.taskbar}>
      <button type="button" className={styles.orb} onClick={onStart} aria-label="Start">
        <StartOrb lit={startOpen} />
      </button>
      <div className={styles.quick}>
        <button type="button" onClick={onDesktop} title="Show desktop">
          <Icon name="desktop" size={22} />
        </button>
        <button type="button" onClick={onFlip} title="Switch between windows (Flip 3D)">
          <Icon name="flip" size={22} />
        </button>
        <button type="button" onClick={() => onLaunch("messenger")} title="Windows Live Messenger">
          <Icon name="messenger" size={22} />
        </button>
      </div>
      <div className={styles.tasks}>
        {open.map((w) => (
          <button
            key={w.id}
            type="button"
            className={`${styles.task} ${active === w.id && !w.min ? styles.taskOn : ""}`}
            onClick={() => onTask(w.id)}
          >
            <Icon name={APP_META[w.id].icon} size={20} />
            <span>{APP_META[w.id].title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function StartMenu({
  onLaunch,
  onGame,
  onShutdown,
  onSaver,
  onClose,
}: {
  onLaunch: (id: AppId) => void;
  onGame: (slug: string) => void;
  onShutdown: () => void;
  onSaver: () => void;
  onClose: () => void;
}) {
  const [games, setGames] = useState(false);
  const [q, setQ] = useState("");
  const user = cut(A, "fa_butterfly", 0)?.src ?? img(A, "fa_dew", 2)?.src;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const progs: { id: AppId; sub: string }[] = [
    { id: "welcome", sub: "Get started" },
    { id: "media", sub: "Play music" },
    { id: "messenger", sub: "5 online" },
    { id: "gallery", sub: "View photos" },
    { id: "aquarium", sub: "Feed the fish" },
    { id: "personalize", sub: "Wallpaper & glass" },
  ];
  const shown = progs.filter((p) => APP_META[p.id].title.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className={styles.start} onPointerDown={(e) => e.stopPropagation()}>
      <div className={styles.sLeft}>
        {!games ? (
          <>
            {shown.map((p) => (
              <button key={p.id} type="button" className={styles.sProg} onClick={() => onLaunch(p.id)}>
                <Icon name={APP_META[p.id].icon} size={32} />
                <span>
                  {APP_META[p.id].title}
                  <small>{p.sub}</small>
                </span>
              </button>
            ))}
            <button type="button" className={styles.sProg} onClick={onSaver}>
              <Icon name="internet" size={32} />
              <span>
                Bubbles Screen Saver<small>Preview</small>
              </span>
            </button>
            <div className={styles.sSep} />
            <button type="button" className={styles.sAll} onClick={() => setGames(true)}>
              ▸ Games
            </button>
          </>
        ) : (
          <>
            <button type="button" className={styles.sAll} onClick={() => setGames(false)}>
              ◂ Back
            </button>
            {GAMES.map((g) => (
              <button key={g.slug} type="button" className={styles.sProg} onClick={() => onGame(g.slug)}>
                <Icon name="games" size={32} />
                <span>
                  {g.name}
                  <small>Opens another channel</small>
                </span>
              </button>
            ))}
          </>
        )}
        <label className={styles.sSearch}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search programs and files" />
          <Icon name="search" size={14} />
        </label>
      </div>
      <div className={styles.sRight}>
        <div className={styles.sUser}>
          <img src={user} alt="" />
        </div>
        <button type="button" onClick={() => onLaunch("welcome")}>User</button>
        <button type="button" onClick={() => onLaunch("gallery")}>Pictures</button>
        <button type="button" onClick={() => onLaunch("media")}>Music</button>
        <button type="button" onClick={() => setGames(true)}>Games</button>
        <button type="button" onClick={() => onLaunch("computer")}>Computer</button>
        <button type="button" onClick={() => onLaunch("personalize")}>Control Panel</button>
        <div className={styles.sPower}>
          <button type="button" className={styles.sShut} onClick={onShutdown}>
            Shut down
          </button>
          <button type="button" className={styles.sArrow} onClick={onShutdown}>
            ▸
          </button>
        </div>
      </div>
    </div>
  );
}
