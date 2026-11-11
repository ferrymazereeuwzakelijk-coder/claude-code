"use client";

import { useEffect, useRef, useState } from "react";
import { LuMove3D } from "react-icons/lu";
import type { FerryJoScene } from "./three/scene";

type Props = { hint: string; fallback: string };

/** Drag-to-rotate 3D Ferry-Jo. Loads three.js only when scrolled near. */
export default function ShipViewer({ hint, fallback }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<"idle" | "ready" | "failed">("idle");

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    let scene: FerryJoScene | null = null;
    let started = false;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !started) {
          started = true;
          import("./three/scene")
            .then(({ FerryJoScene }) => {
              try {
                scene = new FerryJoScene(canvas, { interactive: true, still });
                setState("ready");
              } catch {
                setState("failed");
              }
            })
            .catch(() => setState("failed"));
        }
        scene?.setVisible(e.isIntersecting);
      },
      { rootMargin: "200px" },
    );
    io.observe(wrap);
    return () => {
      io.disconnect();
      scene?.dispose();
    };
  }, []);

  return (
    <div ref={wrapRef} className="hud-frame relative aspect-[4/3] w-full overflow-hidden bg-navy text-teal-light sm:aspect-[16/9]">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full cursor-grab touch-pan-y active:cursor-grabbing" aria-label={hint} />
      {state === "ready" && (
        <p className="hud pointer-events-none absolute bottom-5 left-5 flex items-center gap-2 text-white/70">
          <LuMove3D aria-hidden className="h-4 w-4 text-teal" /> {hint}
        </p>
      )}
      {state === "failed" && <p className="hud absolute inset-0 grid place-items-center text-white/50">{fallback}</p>}
    </div>
  );
}
