"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";
import type { Dictionary } from "@/content/dictionaries";
import { SectionHeading } from "./section-heading";

export function Process({ dict }: { dict: Dictionary["process"] }) {
  const ref = useRef<HTMLOListElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 80%", "end 60%"] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 });

  return (
    <section id="process" aria-labelledby="process-title" className="scroll-mt-24 border-t border-line py-24 md:py-36">
      <div className="container-x">
        <SectionHeading id="process-title" title={dict.title} intro={dict.intro} />

        <ol ref={ref} className="relative mt-20 grid gap-12 md:grid-cols-4 md:gap-8">
          {/* Track */}
          <div aria-hidden className="absolute left-[11px] top-0 h-full w-px bg-line md:left-0 md:top-[11px] md:h-px md:w-full" />
          <motion.div
            aria-hidden
            style={reduce ? undefined : { scaleX: progress }}
            className="absolute left-0 top-[11px] hidden h-px w-full origin-left bg-gradient-to-r from-blue to-violet md:block"
          />
          <motion.div
            aria-hidden
            style={reduce ? undefined : { scaleY: progress }}
            className="absolute left-[11px] top-0 h-full w-px origin-top bg-gradient-to-b from-blue to-violet md:hidden"
          />

          {dict.steps.map((step, i) => (
            <li key={step.title} className="relative pl-12 md:pl-0 md:pt-14">
              <span
                aria-hidden
                className="absolute left-0 top-0 grid size-[23px] place-items-center rounded-full border border-line-strong bg-ink"
              >
                <span className="size-[7px] rounded-full bg-white" />
              </span>
              <p className="font-display text-sm tabular-nums text-mist">{String(i + 1).padStart(2, "0")}</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] md:text-3xl">{step.title}</h3>
              <p className="mt-4 text-[0.9375rem] leading-relaxed text-mist">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
