"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

type Item =
  | { kind: "video"; src: string; poster: string; title: string; text: string; alt: string }
  | { kind: "image"; src: string; title: string; text: string; alt: string };

type Props = { label: string; title: string; items: Item[] };

/** Three upright tiles of recent work. Clips play muted and only while on screen. */
export default function ClipStrip({ label, title, items }: Props) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const videos = Array.from(root.querySelectorAll("video"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const v = e.target as HTMLVideoElement;
          if (e.isIntersecting && !still) v.play().catch(() => {});
          else v.pause();
        }
      },
      { threshold: 0.35 },
    );
    videos.forEach((v) => io.observe(v));
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} className="bg-navy py-24 text-white sm:py-32">
      <div className="container-x">
        <p data-reveal className="eyebrow text-teal-light">{label}</p>
        <h2 data-reveal className="display mt-6 max-w-4xl text-[2.3rem] sm:text-6xl lg:text-6xl xl:text-7xl">{title}</h2>
        <ul className="mt-14 grid gap-4 sm:grid-cols-3 sm:gap-5">
          {items.map((it, i) => (
            <li key={it.title} data-reveal style={{ ["--reveal-delay" as string]: `${i * 120}ms` }} className="group">
              <figure className="relative aspect-[9/14] overflow-hidden rounded-3xl bg-navy-800">
                {it.kind === "video" ? (
                  <video
                    className="absolute inset-0 h-full w-full object-cover"
                    src={it.src}
                    poster={it.poster}
                    muted
                    loop
                    playsInline
                    preload="none"
                    aria-label={it.alt}
                  />
                ) : (
                  <Image src={it.src} alt={it.alt} fill sizes="(min-width:640px) 33vw, 100vw" className="object-cover object-[60%_50%]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/10 to-transparent" />
                <span className="hud absolute top-4 left-4 bg-navy/60 px-2.5 py-1.5 text-white/80 backdrop-blur">
                  {String(i + 1).padStart(2, "0")} {it.kind === "video" && <span className="ml-1 inline-block h-1.5 w-1.5 animate-blink rounded-full bg-signal align-middle" />}
                </span>
                <figcaption className="absolute inset-x-0 bottom-0 p-6">
                  <h3 className="display text-2xl xl:text-3xl">{it.title}</h3>
                  <p className="mt-2 text-white/75">{it.text}</p>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
