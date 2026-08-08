"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { useCanvas } from "@/components/CanvasStage";
import { sbGet, sbSet } from "@/lib/storage";

/**
 * Pick something up and throw it.
 *
 * Behaviour only — no styling whatsoever. Pages decide what a dragged thing looks
 * like; a polaroid on the JDM desk and a Win98 window need identical physics and
 * nothing else in common.
 *
 * All movement maths goes through toCanvasDelta(), because pointer deltas arrive in
 * client pixels and the canvas is scaled. Skipping that conversion is the single
 * easiest way to make a drag drift away from the cursor — it looks fine at 1.0x on a
 * desktop and falls apart everywhere else.
 */

export interface DraggableProps {
  children: ReactNode;
  /** Starting position in canvas coordinates. */
  x: number;
  y: number;
  /**
   * Persist the position under this key so a rearranged desk survives a reload.
   * Namespaced to the aesthetic. Omit for things that should always reset.
   */
  persistAs?: { aesthetic: string; key: string };
  /** Keep the thing inside these canvas bounds. */
  bounds?: { left: number; top: number; right: number; bottom: number };
  /** Carry momentum after release. Off for anything that should stay put. */
  inertia?: boolean;
  /** Degrees. Preserved through drag so scattered items keep their scatter. */
  rotate?: number;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  onDragStart?: () => void;
  onDragEnd?: (pos: { x: number; y: number }) => void;
}

const FRICTION = 0.94;
const MIN_VELOCITY = 0.04;

export function Draggable({
  children,
  x,
  y,
  persistAs,
  bounds,
  inertia = true,
  rotate = 0,
  disabled = false,
  className,
  style,
  onDragStart,
  onDragEnd,
}: DraggableProps) {
  const { toCanvasDelta } = useCanvas();

  const [pos, setPos] = useState(() =>
    persistAs ? sbGet(persistAs.aesthetic, `pos:${persistAs.key}`, { x, y }) : { x, y },
  );
  const [dragging, setDragging] = useState(false);

  const posRef = useRef(pos);
  posRef.current = pos;

  const velocity = useRef({ x: 0, y: 0 });
  const lastMove = useRef(0);
  const rafRef = useRef(0);
  const pointerId = useRef<number | null>(null);

  const clamp = useCallback(
    (p: { x: number; y: number }) => {
      if (!bounds) return p;
      return {
        x: Math.min(Math.max(p.x, bounds.left), bounds.right),
        y: Math.min(Math.max(p.y, bounds.top), bounds.bottom),
      };
    },
    [bounds],
  );

  const commit = useCallback(
    (p: { x: number; y: number }) => {
      if (persistAs) sbSet(persistAs.aesthetic, `pos:${persistAs.key}`, p);
    },
    [persistAs],
  );

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    cancelAnimationFrame(rafRef.current);
    pointerId.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    velocity.current = { x: 0, y: 0 };
    lastMove.current = performance.now();
    setDragging(true);
    onDragStart?.();
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerId.current !== e.pointerId) return;

    const dx = toCanvasDelta(e.movementX);
    const dy = toCanvasDelta(e.movementY);
    if (!dx && !dy) return;

    const now = performance.now();
    const dt = Math.max(now - lastMove.current, 1);
    lastMove.current = now;
    // px per frame at 60fps, which is what the inertia loop consumes.
    velocity.current = { x: (dx / dt) * 16, y: (dy / dt) * 16 };

    setPos((p) => clamp({ x: p.x + dx, y: p.y + dy }));
  };

  const release = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (pointerId.current !== e.pointerId) return;
      pointerId.current = null;
      setDragging(false);

      const v = velocity.current;
      if (!inertia || Math.hypot(v.x, v.y) < MIN_VELOCITY) {
        commit(posRef.current);
        onDragEnd?.(posRef.current);
        return;
      }

      const glide = () => {
        v.x *= FRICTION;
        v.y *= FRICTION;
        if (Math.hypot(v.x, v.y) < MIN_VELOCITY) {
          commit(posRef.current);
          onDragEnd?.(posRef.current);
          return;
        }
        setPos((p) => {
          const next = clamp({ x: p.x + v.x, y: p.y + v.y });
          // Stop dead against a wall rather than sliding along it.
          if (next.x === p.x) v.x = 0;
          if (next.y === p.y) v.y = 0;
          return next;
        });
        rafRef.current = requestAnimationFrame(glide);
      };
      rafRef.current = requestAnimationFrame(glide);
    },
    [inertia, clamp, commit, onDragEnd],
  );

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  return (
    <div
      className={className}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={release}
      onPointerCancel={release}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        transform: `translate3d(${pos.x}px, ${pos.y}px, 0) rotate(${rotate}deg)`,
        touchAction: "none",
        cursor: disabled ? undefined : dragging ? "grabbing" : "grab",
        // Lift while held so a dragged item is never behind its neighbours.
        zIndex: dragging ? 999 : undefined,
        userSelect: "none",
        ...style,
      }}
      data-dragging={dragging || undefined}
    >
      {children}
    </div>
  );
}
