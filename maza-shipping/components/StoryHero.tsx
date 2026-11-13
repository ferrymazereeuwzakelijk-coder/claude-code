"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LuArrowDown, LuArrowRight } from "react-icons/lu";
import type { PartnerId, StoryScene } from "./three/story/StoryScene";

type Chapter = { nav: string; eyebrow: string; title: readonly string[]; text: string };
export type StoryCopy = {
  skip: string;
  hint: string;
  loading: string;
  illustration: string;
  chaptersLabel: string;
  chapters: { intro: Chapter; push: Chapter; transition: { text: string }; tow: Chapter; brokerage: Chapter; cta: Chapter & { primary: string; secondary: string } };
  partners: Record<PartnerId, string>;
  partnerNote: string;
  fallback: string;
};

type Props = {
  copy: StoryCopy;
  quoteHref: string;
  servicesHref: string;
  poster: { src: string; alt: string };
};

// Chapter ranges must match components/three/story/timeline.ts
const RANGES = { intro: [0, 0.18], push: [0.18, 0.4], transition: [0.4, 0.48], tow: [0.48, 0.74], brokerage: [0.74, 0.91], cta: [0.91, 1] } as const;
type Id = keyof typeof RANGES;
const NAV = ["intro", "push", "tow", "brokerage", "cta"] as const;
const PARTNERS: PartnerId[] = ["harbourTug", "workboat", "cranePontoon"];

/**
 * Homepage scroll story: one pinned WebGL scene driven by scroll position.
 * Text overlays and labels are updated straight from the render loop (no
 * React re-renders per frame). Without WebGL, the copy is shown over a photo.
 */
export default function StoryHero({ copy, quoteHref, servicesHref, poster }: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<StoryScene | null>(null);
  const overlayRefs = useRef<Partial<Record<Id, HTMLDivElement | null>>>({});
  const labelRefs = useRef<Partial<Record<PartnerId, HTMLDivElement | null>>>({});
  const navRefs = useRef<Partial<Record<Id, HTMLButtonElement | null>>>({});
  const barRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLParagraphElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);
  const [mode, setMode] = useState<"loading" | "3d" | "fallback">("loading");

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas) return;
    let disposed = false;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const probe = document.createElement("canvas");
    if (!(probe.getContext("webgl2") || probe.getContext("webgl"))) {
      setMode("fallback");
      return;
    }

    const progressFromScroll = () => {
      const r = section.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      return total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
    };

    let timeline: typeof import("./three/story/timeline") | null = null;
    const onFrame = (p: number) => {
      if (!timeline || !sceneRef.current) return;
      const alpha = timeline.chapterAlpha(p);
      (Object.keys(RANGES) as Id[]).forEach((id) => {
        const el = overlayRefs.current[id];
        if (!el) return;
        const a = alpha[id];
        el.style.opacity = String(a);
        el.style.transform = `translateY(${(1 - a) * 16}px)`;
        el.style.visibility = a > 0.02 ? "visible" : "hidden";
      });
      const la = timeline.partnerLabelAlpha(p);
      for (const id of PARTNERS) {
        const el = labelRefs.current[id];
        if (!el) continue;
        const pt = sceneRef.current.projectPartner(id);
        const a = pt.visible ? la : 0;
        el.style.opacity = String(a);
        el.style.visibility = a > 0.02 ? "visible" : "hidden";
        // keep labels inside the viewport
        const half = el.offsetWidth / 2, x = Math.min(Math.max(pt.x, half + 8), window.innerWidth - half - 8);
        el.style.transform = `translate3d(${x}px, ${pt.y}px, 0) translate(-50%, -100%)`;
      }
      if (hintRef.current) hintRef.current.style.opacity = String(Math.max(0, 1 - p / 0.03));
      if (tagRef.current) tagRef.current.style.opacity = String(Math.min(1, Math.max(0, (p - 0.47) / 0.03)));
      barRef.current?.style.setProperty("--p", p.toFixed(4));
      NAV.forEach((id) => {
        const [a, b] = RANGES[id];
        const on = id === "push" ? p >= a && p < 0.48 : p >= a && (p < b || (id === "cta" && p >= b));
        navRefs.current[id]?.setAttribute("aria-current", on ? "step" : "false");
      });
    };

    Promise.all([import("./three/story/StoryScene"), import("./three/story/timeline")])
      .then(([{ StoryScene }, tl]) => {
        if (disposed) return;
        timeline = tl;
        try {
          const scene = new StoryScene(canvas, { still, onFrame });
          scene.setProgress(progressFromScroll(), true);
          sceneRef.current = scene;
          setMode("3d");
        } catch (err) {
          console.warn("[story] 3D scene unavailable, showing photo", err);
          setMode("fallback");
        }
      })
      .catch((err) => {
        console.warn("[story] 3D scene failed to load", err);
        setMode("fallback");
      });

    const onScroll = () => sceneRef.current?.setProgress(progressFromScroll());
    const io = new IntersectionObserver(([e]) => sceneRef.current?.setVisible(e.isIntersecting), { rootMargin: "100px" });
    io.observe(section);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      disposed = true;
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, []);

  const goTo = (id: Id) => {
    const section = sectionRef.current;
    if (!section) return;
    const total = section.offsetHeight - window.innerHeight;
    const top = section.getBoundingClientRect().top + window.scrollY;
    const at = id === "push" ? 0.21 : id === "tow" ? 0.6 : id === "brokerage" ? 0.84 : id === "cta" ? 0.97 : 0;
    window.scrollTo({ top: top + total * at, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  const c = copy.chapters;
  const fallback = mode === "fallback";

  const chapterBlock = (id: Exclude<Id, "transition" | "cta">) => {
    const ch = c[id];
    return (
      <div key={id} ref={(el) => { overlayRefs.current[id] = el; }} className="story-overlay" data-chapter={id}>
        <p className="eyebrow text-teal-light">{ch.eyebrow}</p>
        <h2 className="display mt-4 text-[2rem] text-white sm:text-5xl lg:text-[3rem] xl:text-[3.6rem]">
          {ch.title.map((l, i) => (
            <span key={l} className={`block ${i === ch.title.length - 1 ? "text-teal-light" : ""}`}>{l}</span>
          ))}
        </h2>
        <p className="mt-4 max-w-md text-white/85 sm:text-lg">{ch.text}</p>
      </div>
    );
  };

  return (
    <section
      ref={sectionRef}
      id="verhaal"
      aria-label={c.intro.title.join(" ")}
      className={`relative bg-navy text-white ${fallback ? "" : "h-[1000svh]"}`}
    >
      <a href="#content" className="btn-ghost-light absolute top-24 right-4 z-30 min-h-10 px-4 text-[0.7rem] sm:right-8 lg:right-12">
        {copy.skip} <LuArrowDown aria-hidden className="h-3.5 w-3.5" />
      </a>

      {/* Text alternative for screen readers: the whole story in reading order */}
      <div className="sr-only">
        {(["intro", "push", "tow", "brokerage", "cta"] as const).map((id) => (
          <div key={id}>
            {id === "intro" ? <h1>{c[id].title.join(" ")}</h1> : <h2>{c[id].title.join(" ")}</h2>}
            <p>{c[id].text}</p>
          </div>
        ))}
        <p>{copy.partnerNote}</p>
        <p>
          <Link href={quoteHref}>{c.cta.primary}</Link> · <a href={servicesHref}>{c.cta.secondary}</a>
        </p>
      </div>

      {fallback ? (
        <div className="relative isolate">
          <div className="absolute inset-0 -z-10">
            <Image src={poster.src} alt={poster.alt} fill priority sizes="100vw" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-navy/70 via-navy/80 to-navy" />
          </div>
          <div aria-hidden className="container-x grid gap-16 pt-40 pb-24">
            {(["intro", "push", "tow", "brokerage"] as const).map((id) => (
              <div key={id} className="max-w-2xl">
                <p className="eyebrow text-teal-light">{c[id].eyebrow}</p>
                <p className="display mt-4 text-4xl sm:text-6xl">{c[id].title.join(" ")}</p>
                <p className="mt-4 text-lg text-white/80">{c[id].text}</p>
              </div>
            ))}
            <div className="flex flex-wrap gap-3">
              <Link href={quoteHref} className="btn-signal">{c.cta.primary} <LuArrowRight aria-hidden className="h-4 w-4" /></Link>
              <a href={servicesHref} className="btn-ghost-light">{c.cta.secondary}</a>
            </div>
            <p className="hud text-white/50">{copy.fallback}</p>
          </div>
        </div>
      ) : (
        <div className="sticky top-0 h-[100svh] overflow-hidden">
          <div className={`absolute inset-0 transition-opacity duration-1000 ${mode === "3d" ? "opacity-0" : "opacity-100"}`}>
            <Image src={poster.src} alt={poster.alt} fill priority sizes="100vw" className="object-cover" />
            <div className="absolute inset-0 bg-navy/40" />
            <p className="hud absolute bottom-8 left-1/2 -translate-x-1/2 animate-blink text-white/80">{copy.loading}</p>
          </div>
          <canvas ref={canvasRef} aria-hidden className={`absolute inset-0 h-full w-full transition-opacity duration-1000 ${mode === "3d" ? "opacity-100" : "opacity-0"}`} />

          {/* Readability scrims (left on desktop, bottom on phones) */}
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy/85 via-navy/10 to-transparent md:bg-gradient-to-l md:from-navy/80 md:via-navy/30 md:to-transparent" />
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-navy/60 to-transparent" />

          {/* Partner labels (brokerage chapter) */}
          {PARTNERS.map((id) => (
            <div
              key={id}
              ref={(el) => { labelRefs.current[id] = el; }}
              aria-hidden
              className="hud pointer-events-none absolute top-0 left-0 whitespace-nowrap bg-white/90 px-2.5 py-1.5 text-[0.62rem] text-navy shadow-lg"
              style={{ opacity: 0, visibility: "hidden" }}
            >
              <span className="hidden sm:inline">{copy.partners[id]}</span>
              <span className="sm:hidden">{copy.partners[id].split("·")[0].trim()}</span>
              <span className="absolute top-full left-1/2 h-5 w-px -translate-x-1/2 bg-white/90" />
            </div>
          ))}

          {/* Chapter copy */}
          <div aria-hidden className="pointer-events-none absolute inset-0 flex items-end md:items-center">
            <div className="container-x relative flex w-full justify-end pb-24 md:pb-0 md:pr-24 lg:pr-28">
              <div className="relative w-full max-w-[34rem] [&_.story-overlay]:absolute [&_.story-overlay]:bottom-0 [&_.story-overlay]:left-0 md:[&_.story-overlay]:top-1/2 md:[&_.story-overlay]:bottom-auto md:[&_.story-overlay]:-translate-y-1/2">
                {chapterBlock("intro")}
                {chapterBlock("push")}
                <div ref={(el) => { overlayRefs.current.transition = el; }} className="story-overlay" style={{ opacity: 0, top: "auto", bottom: "-32svh" }}>
                  <p className="hud bg-navy/70 px-3 py-2 text-white/85">{c.transition.text}</p>
                </div>
                {chapterBlock("tow")}
                {chapterBlock("brokerage")}
                <div ref={(el) => { overlayRefs.current.cta = el; }} className="story-overlay pointer-events-auto" style={{ opacity: 0 }}>
                  <p className="eyebrow text-teal-light">{c.cta.eyebrow}</p>
                  <h2 className="display mt-4 text-[2.3rem] text-white sm:text-6xl lg:text-[4.4rem]">
                    {c.cta.title.map((l, i) => (
                      <span key={l} className={`block ${i === c.cta.title.length - 1 ? "text-teal-light" : ""}`}>{l}</span>
                    ))}
                  </h2>
                  <p className="mt-4 max-w-md text-white/85 sm:text-lg">{c.cta.text}</p>
                  <div className="mt-7 flex flex-wrap gap-3">
                    <Link href={quoteHref} className="btn-signal" tabIndex={-1}>
                      {c.cta.primary} <LuArrowRight aria-hidden className="h-4 w-4" />
                    </Link>
                    <a href={servicesHref} className="btn-ghost-light" tabIndex={-1}>{c.cta.secondary}</a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p ref={tagRef} className="hud pointer-events-none absolute bottom-4 left-4 text-white/70 sm:left-8 lg:left-12" style={{ opacity: 0 }}>
            {copy.illustration}
          </p>

          {/* Chapter navigation + progress */}
          <nav aria-label={copy.chaptersLabel} className="absolute top-1/2 left-3 z-20 hidden -translate-y-1/2 md:block lg:left-5">
            <ol className="grid gap-3">
              {NAV.map((id, i) => (
                <li key={id}>
                  <button
                    type="button"
                    ref={(el) => { navRefs.current[id] = el; }}
                    onClick={() => goTo(id)}
                    className="hud group flex w-full flex-row-reverse items-center justify-end gap-3 text-white/60 transition-colors hover:text-white aria-[current=step]:text-white"
                  >
                    <span className="hidden bg-navy/60 px-1.5 py-0.5 group-hover:inline group-focus-visible:inline group-aria-[current=step]:inline">{c[id].nav}</span>
                    <span className="grid h-6 w-6 place-items-center border border-white/30 text-[0.6rem] group-aria-[current=step]:border-teal group-aria-[current=step]:bg-teal">{i + 1}</span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>
          <div ref={barRef} aria-hidden className="absolute inset-x-0 bottom-0 h-1 bg-white/10">
            <div className="h-full origin-left scale-x-[var(--p,0)] bg-teal" />
          </div>
          <p ref={hintRef} className="hud pointer-events-none absolute bottom-5 left-1/2 hidden -translate-x-1/2 text-white/70 md:block" aria-hidden>
            {copy.hint}
          </p>
        </div>
      )}
    </section>
  );
}
