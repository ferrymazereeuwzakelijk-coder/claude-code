"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import type { Dictionary } from "@/content/dictionaries";
import { site } from "@/content/site";
import { href, t, type Locale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { TrustList } from "@/components/ui/trust-list";

const ease = [0.16, 1, 0.3, 1] as const;

export function Hero({ locale, dict }: { locale: Locale; dict: Dictionary["hero"] }) {
  const reduce = useReducedMotion();
  // Always animate to the visible state. The server renders the initial
  // (hidden) frame before it knows the visitor's motion preference, so
  // dropping the animation entirely would leave the text invisible.
  const item = (delay: number) => ({
    initial: { opacity: 0, y: reduce ? 0 : 28 },
    animate: { opacity: 1, y: 0 },
    transition: reduce ? { duration: 0 } : { duration: 1.1, delay, ease },
  });

  return (
    <section className="relative isolate flex min-h-[100svh] flex-col overflow-hidden" aria-labelledby="hero-title">
      {/* Atmosphere */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="glow-blue absolute -right-[10%] top-[5%] h-[90vh] w-[70vw] opacity-80" />
        <div className="glow-violet absolute right-[15%] top-[40%] h-[60vh] w-[45vw] opacity-70" />
      </div>

      <div className="container-x flex flex-1 flex-col justify-end pb-16 pt-36 md:justify-center md:pb-24">
        <motion.p {...item(0.1)} className="mb-8 flex items-center gap-3 text-sm text-fog">
          <span className="h-px w-10 bg-gradient-to-r from-blue to-violet" aria-hidden />
          {dict.eyebrow}
        </motion.p>

        <h1 id="hero-title" className="type-hero uppercase">
          <motion.span {...item(0.2)} className="block text-mist">
            {dict.titleLine1}
          </motion.span>
          <motion.span {...item(0.35)} className="block text-white">
            {dict.titleLine2}
          </motion.span>
        </h1>

        <motion.p {...item(0.55)} className="type-lead mt-10 max-w-[38rem]">
          {dict.body}
        </motion.p>

        <motion.div {...item(0.7)} className="mt-10 flex flex-wrap items-center gap-3">
          <Button asChild size="lg" variant="accent">
            <Link href={href(locale, "/contact")}>{dict.primary}</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href={href(locale, "/projects")}>{dict.secondary}</Link>
          </Button>
        </motion.div>

        <motion.div {...item(0.85)}>
          <TrustList items={dict.trust} className="mt-8" />
        </motion.div>
      </div>

      <div className="container-x hidden items-center justify-between border-t border-line py-5 text-xs text-mist md:flex">
        <span>
          {site.founder}, {t(site.location, locale)}
        </span>
        <a href="#problems" className="transition-colors hover:text-white">
          {dict.scroll}
        </a>
      </div>
    </section>
  );
}
