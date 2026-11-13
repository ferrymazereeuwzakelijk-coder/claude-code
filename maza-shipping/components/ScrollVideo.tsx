"use client";

import { useEffect, useRef } from "react";

type Props = {
  src: string;
  poster: string;
  label: string;
  title: readonly string[];
  text: string;
};

/**
 * Owner footage that grows from an inset frame to full-bleed as it scrolls into
 * view. Plays muted and inline only while visible; paused for reduced motion.
 */
export default function ScrollVideo({ src, poster, label, title, text }: Props) {
  const ref = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    const video = videoRef.current;
    if (!el || !video) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const onScroll = () => {
      const r = el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (window.innerHeight - r.top) / (window.innerHeight * 1.1)));
      el.style.setProperty("--p", p.toFixed(3));
    };
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !still) video.play().catch(() => {});
      else video.pause();
    }, { threshold: 0.15 });
    io.observe(el);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <section ref={ref} className="relative bg-navy py-10 text-white sm:py-16" style={{ ["--p" as string]: 0 }}>
      <div
        className="relative mx-auto h-[85svh] min-h-[480px] overflow-hidden"
        style={{
          width: "calc(100% - (1 - var(--p)) * 12vw)",
          borderRadius: "calc((1 - var(--p)) * 18px)",
        }}
      >
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ transform: "scale(calc(1.18 - var(--p) * 0.18))" }}
          src={src}
          poster={poster}
          muted
          loop
          playsInline
          preload="metadata"
          aria-label={title.join(" ")}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/20 to-navy/40" />
        <div className="hud-frame absolute inset-4 text-white sm:inset-8" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-12">
          <p className="eyebrow text-teal-light">{label}</p>
          <h2 className="display mt-5 text-[2.6rem] sm:text-7xl lg:text-7xl xl:text-8xl">
            {title.map((l, i) => (
              <span key={l} className={`block ${i === title.length - 1 ? "text-teal" : ""}`}>{l}</span>
            ))}
          </h2>
          <p className="mt-5 max-w-lg text-white/80 sm:text-lg">{text}</p>
        </div>
        <p className="hud absolute top-6 right-6 flex items-center gap-2 text-white/80 sm:top-12 sm:right-12">
          <span className="inline-block h-2 w-2 animate-blink rounded-full bg-signal" /> REC · FERRY-JO
        </p>
      </div>
    </section>
  );
}
