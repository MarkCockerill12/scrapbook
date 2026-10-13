"use client";

import { useEffect, useRef, useState } from "react";
import { img, cutN } from "@/lib/assets";
import { tick, tone } from "@/lib/audio";
import styles from "./modules.module.css";

const A = "matrix";
const GLYPHS = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789Z:.=*+-<>¦|";
const rnd = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)];

/* ------------------------------------------------------------ operator monitors */

/**
 * Tank's station: three little CRTs of raw code, each at its own speed and density.
 * Hover one and the operator's line surfaces through the rain.
 */
const MON = [
  { speed: 0.9, size: 11, caption: "blonde" },
  { speed: 0.55, size: 13, caption: "brunette" },
  { speed: 1.3, size: 10, caption: "redhead" },
];

function Monitor({ speed, size, caption }: (typeof MON)[number]) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState(false);
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const cols = Math.floor(c.width / size);
    const drops = Array.from({ length: cols }, (_, i) => (i * 7) % 20);
    let raf = 0;
    let acc = 0;
    let last = performance.now();
    const draw = (now: number) => {
      acc += ((now - last) / 16) * speed;
      last = now;
      if (acc >= 1) {
        acc = 0;
        ctx.fillStyle = "rgba(0,8,2,0.18)";
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.font = `${size}px monospace`;
        for (let i = 0; i < cols; i++) {
          const y = drops[i] * size;
          ctx.fillStyle = "#d8ffe0";
          ctx.fillText(rnd(), i * size, y);
          ctx.fillStyle = "#00ff41";
          ctx.fillText(rnd(), i * size, y - size);
          if (y > c.height && Math.random() > 0.96) drops[i] = 0;
          drops[i] += 1;
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [speed, size]);
  return (
    <div className={styles.mon} onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)} onClick={() => setHover((h) => !h)}>
      <canvas ref={ref} width={114} height={120} />
      <span className={`${styles.monCap} ${hover ? styles.monCapOn : ""}`}>{caption}</span>
    </div>
  );
}

export function Monitors() {
  return (
    <div className={styles.monitors}>
      <div className={styles.monRow}>
        {MON.map((m) => (
          <Monitor key={m.caption} {...m} />
        ))}
      </div>
      <p className={styles.quote}>&ldquo;I don&apos;t even see the code. All I see is…&rdquo; — hover a screen</p>
    </div>
  );
}

/* ------------------------------------------------------------ the pills */

export function Pills({ onChoose, chosen }: { onChoose: (p: "red" | "blue") => void; chosen: "red" | "blue" | null }) {
  const [hover, setHover] = useState<"red" | "blue" | null>(null);
  return (
    <div className={styles.pills}>
      <div className={styles.pillPhoto}>
        <img src={img(A, "mx_pill", 1)?.src ?? ""} alt="A hand holding a red pill and a blue pill" />
        <button
          type="button"
          className={`${styles.pillHot} ${styles.red} ${hover === "red" ? styles.pillHover : ""}`}
          style={{ left: "45.8%", top: "43.2%" }}
          onPointerEnter={() => setHover("red")}
          onPointerLeave={() => setHover(null)}
          onClick={() => onChoose("red")}
          aria-label="Take the red pill"
        />
        <button
          type="button"
          className={`${styles.pillHot} ${styles.blue} ${hover === "blue" ? styles.pillHover : ""}`}
          style={{ left: "56.3%", top: "47.6%" }}
          onPointerEnter={() => setHover("blue")}
          onPointerLeave={() => setHover(null)}
          onClick={() => onChoose("blue")}
          aria-label="Take the blue pill"
        />
      </div>
      <p className={styles.pillText}>
        {hover === "red"
          ? "…you stay in Wonderland, and I show you how deep the rabbit hole goes."
          : hover === "blue"
            ? "…the story ends. You wake up in your bed and believe whatever you want to believe."
            : chosen
              ? `You took the ${chosen} pill. There is no going back. (There is. Click again.)`
              : "This is your last chance. After this, there is no turning back."}
      </p>
    </div>
  );
}

/** The red-pill sequence — typed, one line at a time, like the opening of the film. */
const WAKE = ["Wake up, Neo…", "The Matrix has you…", "Follow the white rabbit.", "Knock, knock, Neo."];

export function WakeUp({ onDone }: { onDone: () => void }) {
  const [line, setLine] = useState(0);
  const [chars, setChars] = useState(0);
  useEffect(() => {
    const text = WAKE[line];
    if (chars < text.length) {
      const t = window.setTimeout(() => {
        setChars((c) => c + 1);
        tone({ freq: 1800 + Math.random() * 200, duration: 0.015, type: "square", gain: 0.03 });
      }, 70 + Math.random() * 90);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => {
      if (line === WAKE.length - 1) {
        tone({ freq: 90, duration: 0.18, type: "square", gain: 0.12 });
        tone({ freq: 90, duration: 0.18, type: "square", gain: 0.12, delay: 0.3 });
        window.setTimeout(onDone, 900);
      } else {
        setLine((l) => l + 1);
        setChars(0);
      }
    }, 1400);
    return () => window.clearTimeout(t);
  }, [line, chars, onDone]);
  return (
    <div className={styles.wake} onClick={onDone}>
      <p>
        {WAKE[line].slice(0, chars)}
        <i className={styles.caret} />
      </p>
    </div>
  );
}

/* ------------------------------------------------------------ programs */

const PROGRAMS = ["Jujitsu", "Kung Fu", "Savate", "Kempo", "Drunken Boxing", "B-212 Helicopter"];

export function Programs() {
  const [prog, setProg] = useState<Record<string, number>>({});
  const [msg, setMsg] = useState("Operator: loading programs on request.");
  const running = useRef<Record<string, number>>({});

  const load = (p: string) => {
    if (running.current[p] || (prog[p] ?? 0) >= 1) return;
    tick();
    running.current[p] = window.setInterval(() => {
      setProg((all) => {
        const v = Math.min(1, (all[p] ?? 0) + 0.035 + Math.random() * 0.05);
        if (v >= 1) {
          window.clearInterval(running.current[p]);
          running.current[p] = 0;
          tone({ freq: 880, duration: 0.12, type: "sine", gain: 0.08 });
          tone({ freq: 1320, duration: 0.2, type: "sine", gain: 0.07, delay: 0.1 });
          const done = Object.values({ ...all, [p]: 1 }).filter((x) => x >= 1).length;
          setMsg(
            done === PROGRAMS.length
              ? "Tank: He's been at it ten hours straight. He's a machine."
              : p === "Kung Fu"
                ? "Neo: I know kung fu.   Morpheus: Show me."
                : p === "B-212 Helicopter"
                  ? "Trinity: Let's go."
                  : `${p} loaded.`,
          );
        }
        return { ...all, [p]: v };
      });
    }, 70);
  };

  useEffect(() => () => Object.values(running.current).forEach((id) => window.clearInterval(id)), []);

  return (
    <div className={styles.programs}>
      {PROGRAMS.map((p) => {
        const v = prog[p] ?? 0;
        return (
          <button key={p} type="button" className={styles.prog} onClick={() => load(p)}>
            <span className={styles.progName}>{p}</span>
            <span className={styles.progBar}>
              <i style={{ width: `${v * 100}%` }} />
            </span>
            <span className={styles.progPct}>{v >= 1 ? "LOADED" : v > 0 ? `${Math.round(v * 100)}%` : "[LOAD]"}</span>
          </button>
        );
      })}
      <p className={styles.progMsg}>{msg}</p>
    </div>
  );
}

/* ------------------------------------------------------------ password crack */

const CODE = "Z10N-MAIN-FR4M3";

export function Crack() {
  const [locked, setLocked] = useState(0);
  const [shown, setShown] = useState(() => CODE.replace(/[^-]/g, "·"));
  const [going, setGoing] = useState(false);

  useEffect(() => {
    if (!going) return;
    const id = window.setInterval(() => {
      setShown(() => CODE.split("").map((c, i) => (c === "-" ? "-" : i < locked ? c : rnd())).join(""));
    }, 45);
    return () => window.clearInterval(id);
  }, [going, locked]);

  useEffect(() => {
    if (!going) return;
    if (locked >= CODE.length) {
      setGoing(false);
      setShown(CODE);
      tone({ freq: 660, duration: 0.1, gain: 0.08 });
      tone({ freq: 990, duration: 0.3, gain: 0.08, delay: 0.1 });
      return;
    }
    const t = window.setTimeout(() => {
      setLocked((l) => l + 1);
      tone({ freq: 400 + locked * 60, duration: 0.03, type: "square", gain: 0.04 });
    }, 220 + Math.random() * 380);
    return () => window.clearTimeout(t);
  }, [going, locked]);

  const done = locked >= CODE.length && !going;
  return (
    <div className={styles.crack}>
      <p className={styles.crackLabel}>ZION MAINFRAME — ACCESS CODES</p>
      <div className={styles.crackCode}>
        {shown.split("").map((c, i) => (
          <span key={i} className={i < locked ? styles.crackLock : ""}>
            {c}
          </span>
        ))}
      </div>
      <button
        type="button"
        className={styles.crackBtn}
        onClick={() => {
          setLocked(0);
          setGoing(true);
        }}
      >
        {done ? "ACCESS GRANTED — run again" : going ? "brute forcing…" : "BRUTE FORCE"}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------ the phone */

export function Phone({ onExit }: { onExit: () => void }) {
  const [ringing, setRinging] = useState(false);
  useEffect(() => {
    let alive = true;
    const cycle = () => {
      if (!alive) return;
      setRinging(true);
      const bell = window.setInterval(() => {
        tone({ freq: 1280, duration: 0.35, type: "square", gain: 0.03 });
        tone({ freq: 1600, duration: 0.35, type: "square", gain: 0.02 });
      }, 1100);
      window.setTimeout(() => {
        window.clearInterval(bell);
        if (alive) setRinging(false);
      }, 7000);
    };
    const first = window.setTimeout(cycle, 9000);
    const id = window.setInterval(cycle, 26000);
    return () => {
      alive = false;
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, []);
  return (
    <button type="button" className={`${styles.phone} ${ringing ? styles.ringing : ""}`} onClick={onExit} title="The exit">
      <img src={img(A, "mx_phone", 2)?.src ?? ""} alt="A phone booth at night" />
      <span className={styles.phoneTag}>{ringing ? "☎ RINGING — ANSWER TO EXIT" : "exit: Wells & Lake"}</span>
    </button>
  );
}

/* ------------------------------------------------------------ déjà vu */

/**
 * The black cat walks across the bottom of the frame. Now and then it walks across
 * twice, exactly the same way — and that means they changed something.
 */
export function BlackCat({ onDejaVu }: { onDejaVu: () => void }) {
  const [pass, setPass] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => {
      setPass((p) => p + 1);
      if (Math.random() < 0.5) {
        window.setTimeout(() => {
          setPass((p) => p + 1);
          onDejaVu();
        }, 6200);
      }
    }, 34000);
    const first = window.setTimeout(() => setPass(1), 5000);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(first);
    };
  }, [onDejaVu]);
  if (!pass) return null;
  return <img key={pass} className={styles.cat} src={cutN(A, "mx_cat", 2)?.src ?? ""} alt="" />;
}
