/**
 * BinaryRain visual background inspired by GLONECT style.
 */
import { useEffect, useRef } from "react";

interface BinaryRainProps {
  /** Canvas height. Default: 180 */
  height?: number;
  /** Main color opacity range baseline (0-1). */
  opacity?: number;
  className?: string;
}

const CHARS = "01QMETARAM";
const FONT_SIZE = 13;
const GOLD = "hsl(43, 96%, 56%)";
const TEAL = "hsl(187, 80%, 50%)";

export default function BinaryRain({ height = 180, opacity = 0.18, className = "" }: BinaryRainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let columns: number;
    let drops: number[];

    function resize() {
      canvas!.width  = canvas!.offsetWidth;
      canvas!.height = canvas!.offsetHeight;
      columns = Math.floor(canvas!.width / FONT_SIZE);
      drops   = Array.from({ length: columns }, () => Math.random() * -50);
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    function draw() {
      ctx!.fillStyle = `rgba(11, 17, 32, 0.18)`;
      ctx!.fillRect(0, 0, canvas!.width, canvas!.height);

      ctx!.font = `${FONT_SIZE}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const char = CHARS[Math.floor(Math.random() * CHARS.length)];
        const useGold = i % 5 === 0;
        ctx!.fillStyle = useGold ? GOLD : TEAL;
        ctx!.globalAlpha = opacity + Math.random() * 0.2;
        ctx!.fillText(char, i * FONT_SIZE, drops[i] * FONT_SIZE);
        ctx!.globalAlpha = 1;

        if (drops[i] * FONT_SIZE > canvas!.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
      animId = requestAnimationFrame(draw);
    }

    animId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, [opacity]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{ display: "block", width: "100%", height, pointerEvents: "none" }}
    />
  );
}
