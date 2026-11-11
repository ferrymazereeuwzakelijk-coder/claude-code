"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import type { Dictionary } from "@/content/dictionaries";
import { href, type Locale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { TrustList } from "@/components/ui/trust-list";
import { HeroShowcase } from "./hero-showcase";

const ease = [0.16, 1, 0.3, 1] as const;

export function Hero({ locale, dict }: { locale: Locale; dict: Dictionary["hero"] }) {
  const reduce = useReducedMotion();
  // Always animate to the visible state. The server renders the initial
  // (hidden) frame before it knows the visitor's motion preference, so
  // dropping the animation entirely would leave the text invisible.
  const item = (delay: number) => ({
    initial: { opacity: 0, y: reduce ? 0 : 20 },
    animate: { opacity: 1, y: 0 },
    transition: reduce ? { duration: 0 } : { duration: 0.9, delay, ease },
  });

  return (
    <section className="relative isolate overflow-hidden pb-20 pt-32 md:pb-28 md:pt-40" aria-labelledby="hero-title">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="glow-blue absolute -right-[10%] top-[0%] h-[80vh] w-[60vw]" />
      </div>

      <div className="container-x grid items-center gap-14 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
        <div>
          <motion.p {...item(0.05)} className="mb-6 flex items-center gap-3 text-sm text-fog">
            <span className="h-px w-8 bg-blue" aria-hidden />
            {dict.eyebrow}
          </motion.p>

          <motion.h1 {...item(0.15)} id="hero-title" className="type-hero text-white">
            {dict.title}
          </motion.h1>

          <motion.p {...item(0.3)} className="type-lead mt-7 max-w-[36rem]">
            {dict.body}
          </motion.p>

          <motion.div {...item(0.42)} className="mt-9 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" variant="accent">
              <Link href={href(locale, "/contact")}>{dict.primary}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#work">{dict.secondary}</a>
            </Button>
          </motion.div>

          <motion.div {...item(0.55)}>
            <TrustList items={dict.trust} className="mt-8" />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduce ? { duration: 0 } : { duration: 1.2, delay: 0.25, ease }}
          className="mx-auto w-full max-w-[640px]"
        >
          <HeroShowcase alt={dict.showcaseAlt} />
        </motion.div>
      </div>
    </section>
  );
}
