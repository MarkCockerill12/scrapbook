"use client";

import { useEffect, useRef } from "react";

/**
 * The rain.
 *
 * Column-based, the way the real thing is: each column has a head that falls at its
 * own rate, and the trail behind it is drawn by painting a low-alpha black rectangle
 * over the whole canvas each frame rather than clearing it. That fade-to-black is what
 * produces the tapering tail — clearing properly and drawing N trailing glyphs by hand
 * is both slower and worse-looking.
 *
 * The head glyph is near-white, not green. That's the detail most recreations miss:
 * the leading character is blown out, and only the tail is phosphor green.
 *
 * Glyphs are half-width katakana plus digits, which is what the film used.
 */

const GLYPHS =
  "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789:・.=*+-<>";
const FONT_SIZE = 17;

export function DigitalRain({
  width,
  height,
  pointerRef,
}: {
  width: number;
  height: number;
  /** Cursor in canvas space. The rain parts around it. */
  pointerRef: React.RefObject<{ x: number; y: number }>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { alpha: false });
    if (!canvas || !ctx) return;

    canvas.width = width;
    canvas.height = height;
    ctx.fillStyle = "#020604";
    ctx.fillRect(0, 0, width, height);

    const cols = Math.ceil(width / FONT_SIZE);
    // Stagger the start rows or every column lands in a single sheet on frame one.
    const drops = Array.from({ length: cols }, () => -Math.random() * (height / FONT_SIZE));
    const speeds = Array.from({ length: cols }, () => 0.45 + Math.random() * 0.85);

    let frame = 0;

    const tick = () => {
      frame += 1;

      // The trail. Higher alpha = shorter tail.
      ctx.fillStyle = "rgba(2, 6, 4, 0.075)";
      ctx.fillRect(0, 0, width, height);

      ctx.font = `${FONT_SIZE}px "MS Gothic", "Yu Gothic", monospace`;
      ctx.textBaseline = "top";

      const p = pointerRef.current;

      for (let i = 0; i < cols; i++) {
        const x = i * FONT_SIZE;
        const y = drops[i] * FONT_SIZE;

        // Part around the cursor — columns near it stall and dim, so the rain opens
        // up rather than pouring straight through the pointer.
        const dx = Math.abs(x - p.x);
        const dy = Math.abs(y - p.y);
        const near = dx < 130 && dy < 190;

        if (!near || frame % 3 === 0) {
          const ch = GLYPHS[(Math.random() * GLYPHS.length) | 0];

          // Head: blown out, with a halo.
          ctx.shadowColor = "rgba(0,255,65,.9)";
          ctx.shadowBlur = 10;
          ctx.fillStyle = near ? "rgba(120,255,160,.35)" : "#d9ffe4";
          ctx.fillText(ch, x, y);

          // A dimmer glyph a little behind, to thicken the trail.
          ctx.shadowBlur = 0;
          ctx.fillStyle = near ? "rgba(0,255,65,.16)" : "rgba(0,255,65,.62)";
          ctx.fillText(GLYPHS[(Math.random() * GLYPHS.length) | 0], x, y - FONT_SIZE * 2);
        }

        drops[i] += near ? speeds[i] * 0.25 : speeds[i];

        if (y > height && Math.random() > 0.975) {
          drops[i] = -Math.random() * 24;
          speeds[i] = 0.45 + Math.random() * 0.85;
        }
      }

      ctx.shadowBlur = 0;
      rafRef.current = requestAnimationFrame(tick);
    };

    tick();
    return () => cancelAnimationFrame(rafRef.current);
  }, [width, height, pointerRef]);

  return <canvas ref={canvasRef} width={width} height={height} className="" style={{ position: "absolute", inset: 0 }} />;
}
