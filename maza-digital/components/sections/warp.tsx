"use client";

import { useRef, useState } from "react";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "framer-motion";
import type { Dictionary } from "@/content/dictionaries";

/**
 * The moment you "enter" the studio: a tall section with a pinned stage.
 * While it scrolls, the 3D world behind it turns into a tunnel and the
 * text flies past the camera.
 */
export function Warp({ dict }: { dict: Dictionary["warp"] }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  const titleScale = useTransform(scrollYProgress, [0, 0.45], [0.85, 4]);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.08, 0.35, 0.45], [0, 1, 1, 0]);
  const titleBlur = useTransform(scrollYProgress, [0.3, 0.45], ["blur(0px)", "blur(12px)"]);
  const lineOpacity = useTransform(scrollYProgress, [0.45, 0.58, 0.88, 1], [0, 1, 1, 0.2]);
  const lineY = useTransform(scrollYProgress, [0.45, 0.6], [60, 0]);
  const lineScale = useTransform(scrollYProgress, [0.45, 1], [0.92, 1.05]);
  const bar = useTransform(scrollYProgress, [0, 0.9], ["0%", "100%"]);

  const [pct, setPct] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => setPct(Math.round(Math.min(v / 0.9, 1) * 100)));

  if (reduce) {
    return (
      <section aria-label={dict.label} className="border-t border-line py-28 md:py-40">
        <div className="container-x text-center">
          <p className="type-hero uppercase text-white">{dict.title}</p>
          <p className="type-lead mx-auto mt-10 text-center">{dict.line}</p>
        </div>
      </section>
    );
  }

  return (
    <section ref={ref} aria-label={dict.label} className="relative h-[260vh]">
      <div className="sticky top-0 flex h-[100svh] items-center justify-center overflow-hidden">
        {/* Edge vignette so the tunnel reads as depth */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(60% 55% at 50% 50%, transparent 40%, rgb(8 11 18 / 0.85) 100%)" }}
        />

        <motion.p
          style={{ scale: titleScale, opacity: titleOpacity, filter: titleBlur }}
          className="type-hero absolute select-none px-4 text-center uppercase text-white will-change-transform md:whitespace-nowrap"
        >
          {dict.title}
        </motion.p>

        <motion.div style={{ opacity: lineOpacity, y: lineY, scale: lineScale }} className="container-x relative text-center">
          <p className="mx-auto max-w-[16ch] font-display text-[clamp(2.25rem,6.5vw,6rem)] font-semibold leading-[0.95] tracking-[-0.045em] text-white">
            {dict.line}
          </p>
          <p className="type-lead mx-auto mt-8 text-center">{dict.sub}</p>
        </motion.div>

        {/* HUD */}
        <div className="container-x absolute inset-x-0 bottom-8 flex items-center gap-4 font-mono text-[11px] uppercase tracking-[0.2em] text-mist">
          <span className="tabular-nums text-white">{String(pct).padStart(3, "0")}%</span>
          <span className="relative h-px flex-1 overflow-hidden bg-line-strong">
            <motion.span style={{ width: bar }} className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue to-violet" />
          </span>
          <span>{pct >= 100 ? dict.done : dict.loading}</span>
        </div>
      </div>
    </section>
  );
}
