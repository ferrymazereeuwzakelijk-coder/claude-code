"use client";

import { useEffect, useRef } from "react";
import { createWorld } from "./engine";

/** Scroll-driven 3D world behind the homepage. See ./engine.ts for how it works. */
export function DigitalWorld() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => (ref.current ? createWorld(ref.current) : undefined), []);
  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 -z-10 h-full w-full" />;
}
