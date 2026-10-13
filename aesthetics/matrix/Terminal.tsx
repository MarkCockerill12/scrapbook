"use client";

import { useEffect, useRef, useState } from "react";
import { tone } from "@/lib/audio";
import { AESTHETICS, getAesthetic } from "@/lib/registry";
import { useShell } from "@/lib/store";
import styles from "./styles.module.css";

/**
 * A real command line, not a prop.
 *
 * The brief for this channel is "you actually type to navigate", so the shell has to
 * do enough to reward poking at it: a filesystem you can walk, files with something in
 * them, tab completion, command history, and `connect` as a genuine route change.
 *
 * A fake terminal that only accepts three magic words is the thing this is trying not
 * to be.
 */

type Kind = "out" | "dim" | "err";
interface Line {
  text: string;
  kind: Kind;
}

interface Dir {
  type: "dir";
  children: Record<string, Node>;
}
interface File {
  type: "file";
  content: string;
}
type Node = Dir | File;

const dir = (children: Record<string, Node>): Dir => ({ type: "dir", children });
const file = (content: string): File => ({ type: "file", content });

const FS: Dir = dir({
  home: dir({
    guest: dir({
      "readme.txt": file(
        [
          "You are inside a scrapbook.",
          "",
          "Twenty-three channels. Each one is a different decade pretending",
          "to be a website. This one is pretending to be a break-in.",
          "",
          "`channels` lists them. `connect <name>` goes there.",
        ].join("\n"),
      ),
      ".bash_history": file(
        [
          "whoami",
          "ls -la /etc",
          "cat /etc/channels.conf",
          "connect frutiger-aero",
          "clear",
          "sudo rm -rf /",
        ].join("\n"),
      ),
    }),
  }),
  etc: dir({
    "channels.conf": file(
      [
        "# channel table — order is dial adjacency, not theme",
        "# see lib/registry.ts",
        ...AESTHETICS.map(
          (a) => `${String(a.channel).padStart(2, "0")}  ${a.slug.padEnd(18)} ${a.status}`,
        ),
      ].join("\n"),
    ),
    hostname: file("scrapbook"),
  }),
  var: dir({
    log: dir({
      "access.log": file(
        [
          "[--:--:--] session opened from an unknown host",
          "[--:--:--] credentials not presented",
          "[--:--:--] access granted anyway",
          "[--:--:--] trace initiated",
          "[--:--:--] ...",
        ].join("\n"),
      ),
    }),
  }),
});

const BANNER: Line[] = [
  { text: "UNAUTHORISED SESSION", kind: "out" },
  { text: "no credentials presented — access granted anyway", kind: "dim" },
  { text: "", kind: "dim" },
  { text: "type `help` for available commands", kind: "dim" },
  { text: "", kind: "dim" },
];

function resolve(cwd: string[], path: string): { node: Node; path: string[] } | null {
  const abs = path.startsWith("/");
  const parts = (abs ? path : [...cwd, path].join("/")).split("/").filter(Boolean);

  const out: string[] = [];
  let node: Node = FS;
  for (const part of parts) {
    if (part === ".") continue;
    if (part === "..") {
      out.pop();
      node = FS;
      for (const p of out) {
        if (node.type !== "dir") return null;
        node = node.children[p];
      }
      continue;
    }
    if (node.type !== "dir") return null;
    const next: Node | undefined = node.children[part];
    if (!next) return null;
    node = next;
    out.push(part);
  }
  return { node, path: out };
}

export function Terminal({ onSelfDestruct }: { onSelfDestruct: () => void }) {
  const begin = useShell((s) => s.beginTransition);

  const [lines, setLines] = useState<Line[]>(BANNER);
  const [cwd, setCwd] = useState<string[]>(["home", "guest"]);
  const [value, setValue] = useState("");
  const history = useRef<string[]>([]);
  const histIndex = useRef(-1);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  /*
   * The page tells you to type. Make that true.
   *
   * Nothing used to hold focus on load, so the first thing anyone did — read "type
   * `help`" and type it — went to document.body and vanished without a trace. The
   * prompt takes focus on mount, and any printable key pressed while focus is loose
   * gets adopted rather than dropped: the keydown that woke us has already been
   * dispatched, so focusing alone would still eat that first character.
   */
  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (el === inputRef.current) return;
      // Don't steal from another field, or from browser/dial shortcuts.
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const printable = e.key.length === 1;
      if (!printable && e.key !== "Enter" && e.key !== "Backspace") return;

      inputRef.current?.focus({ preventScroll: true });
      if (printable) {
        e.preventDefault();
        setValue((v) => v + e.key);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const push = (...next: Line[]) => setLines((prev) => [...prev, ...next]);
  const out = (text: string): Line => ({ text, kind: "out" });
  const dimLine = (text: string): Line => ({ text, kind: "dim" });
  const err = (text: string): Line => ({ text, kind: "err" });

  const prompt = `guest@scrapbook:/${cwd.join("/")}$`;

  const run = (raw: string) => {
    const input = raw.trim();
    push({ text: `${prompt} ${raw}`, kind: "out" });
    if (!input) return;

    history.current.unshift(input);
    histIndex.current = -1;

    const [cmd, ...args] = input.split(/\s+/);
    const arg = args.join(" ");

    switch (cmd) {
      case "help":
        push(
          dimLine("ls [path]        list directory"),
          dimLine("cd <path>        change directory"),
          dimLine("cat <file>       print a file"),
          dimLine("pwd              working directory"),
          dimLine("whoami           you'd think this was obvious"),
          dimLine("channels         list every channel on the dial"),
          dimLine("connect <name>   change channel"),
          dimLine("ps               running processes"),
          dimLine("uname            system"),
          dimLine("clear            clear the screen"),
        );
        break;

      case "ls": {
        const target = resolve(cwd, arg || ".");
        if (!target) return void push(err(`ls: ${arg}: no such file or directory`));
        if (target.node.type === "file") return void push(out(arg));
        const entries = Object.entries(target.node.children);
        if (!entries.length) return void push(dimLine("(empty)"));
        push(
          out(
            entries
              .map(([name, n]) => (n.type === "dir" ? `${name}/` : name))
              .join("   "),
          ),
        );
        break;
      }

      case "cd": {
        if (!arg) return void setCwd([]);
        const target = resolve(cwd, arg);
        if (!target) return void push(err(`cd: ${arg}: no such file or directory`));
        if (target.node.type !== "dir") return void push(err(`cd: ${arg}: not a directory`));
        setCwd(target.path);
        break;
      }

      case "cat": {
        if (!arg) return void push(err("cat: missing operand"));
        const target = resolve(cwd, arg);
        if (!target) return void push(err(`cat: ${arg}: no such file or directory`));
        if (target.node.type !== "file") return void push(err(`cat: ${arg}: is a directory`));
        push(...target.node.content.split("\n").map(out));
        break;
      }

      case "pwd":
        push(out(`/${cwd.join("/")}`));
        break;

      case "whoami":
        push(out("guest"), dimLine("(you are not supposed to be here)"));
        break;

      case "channels":
        push(
          ...AESTHETICS.map((a) =>
            dimLine(
              `${String(a.channel).padStart(2, "0")}  ${a.slug.padEnd(18)} ${
                a.status === "live" ? "online" : "offline"
              }`,
            ),
          ),
          dimLine(""),
          dimLine("connect <name> to switch"),
        );
        break;

      case "connect": {
        if (!arg) return void push(err("connect: which channel?"));
        const target = getAesthetic(arg);
        if (!target) return void push(err(`connect: unknown channel '${arg}'`));
        push(out(`establishing link to ${target.slug}...`));
        tone({ freq: 220, toFreq: 880, duration: 0.4, type: "sawtooth", gain: 0.09 });
        window.setTimeout(() => begin(target.slug), 420);
        break;
      }

      case "ps":
        push(
          dimLine("  PID  CMD"),
          out("    1  /sbin/init"),
          out("  204  rain --columns=94"),
          out("  512  trace --target=you"),
          err("  666  ???"),
        );
        break;

      case "uname":
        push(out("scrapbook 2.6.11 #1 SMP unknown unknown GNU/Linux"));
        break;

      case "date":
        push(out(new Date().toString()));
        break;

      case "clear":
        setLines([]);
        break;

      case "exit":
        push(dimLine("there is no exit. try the dial."));
        break;

      case "sudo":
        if (/rm\s+-rf\s+\/\s*$/.test(arg)) {
          push(err("sudo: proceeding without confirmation"));
          onSelfDestruct();
          return;
        }
        push(err(`sudo: ${args[0] ?? ""}: permission denied`));
        break;

      case "echo":
        push(out(arg));
        break;

      default:
        push(err(`${cmd}: command not found`));
    }
  };

  const complete = () => {
    const parts = value.split(/\s+/);
    const last = parts[parts.length - 1] ?? "";
    const target = resolve(cwd, ".");
    if (!target || target.node.type !== "dir") return;
    const matches = Object.keys(target.node.children).filter((n) => n.startsWith(last));
    if (matches.length === 1) {
      parts[parts.length - 1] = matches[0];
      setValue(parts.join(" "));
    } else if (matches.length > 1) {
      push(dimLine(matches.join("   ")));
    }
  };

  return (
    <div
      className={styles.termScroll}
      ref={scrollRef}
      /* Presses in here focus the prompt instead of dragging the window. */
      data-no-drag
      onPointerDown={(e) => {
        // Let a click-and-drag select output text; only bare clicks grab the prompt.
        if (e.button === 0) inputRef.current?.focus({ preventScroll: true });
      }}
    >
      {lines.map((l, i) => (
        <div
          key={i}
          className={`${styles.termLine} ${
            l.kind === "dim" ? styles.termDim : l.kind === "err" ? styles.termErr : ""
          }`}
        >
          {l.text || " "}
        </div>
      ))}

      <div className={styles.termPromptRow}>
        <span className={styles.termPrompt}>{prompt}</span>
        <input
          ref={inputRef}
          className={styles.termInput}
          value={value}
          spellCheck={false}
          autoComplete="off"
          aria-label="Terminal input"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            // The dial listens for arrow keys globally; inside a real prompt they mean
            // history, so keep them here.
            e.stopPropagation();

            if (e.key === "Enter") {
              run(value);
              setValue("");
              tone({ freq: 1600, toFreq: 900, duration: 0.03, type: "square", gain: 0.04 });
            } else if (e.key === "Tab") {
              e.preventDefault();
              complete();
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              if (histIndex.current < history.current.length - 1) {
                histIndex.current += 1;
                setValue(history.current[histIndex.current]);
              }
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              if (histIndex.current > 0) {
                histIndex.current -= 1;
                setValue(history.current[histIndex.current]);
              } else {
                histIndex.current = -1;
                setValue("");
              }
            } else if (e.key.length === 1) {
              // One click per keystroke, pitch-jittered so it doesn't sound like a
              // metronome.
              tone({
                freq: 1100 + Math.random() * 500,
                duration: 0.02,
                type: "square",
                gain: 0.03,
              });
            }
          }}
        />
      </div>
    </div>
  );
}
