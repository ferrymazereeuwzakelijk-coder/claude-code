import type { ReactNode } from "react";
import Photo from "./Photo";
import type { PhotoKey } from "@/content/site";
import { company } from "@/content/site";

type Stat = { value: string; unit?: string; label: string };

type Props = {
  photo: PhotoKey;
  alt: string;
  eyebrow: string;
  title: readonly string[];
  sub: string;
  actions?: ReactNode;
  size?: "full" | "page";
  scrollLabel?: string;
  stats?: Stat[];
};

export default function PageHero({ photo, alt, eyebrow, title, sub, actions, size = "page", scrollLabel, stats }: Props) {
  const full = size === "full";
  return (
    <section
      className={`relative isolate flex overflow-hidden bg-navy text-white ${full ? "min-h-[100svh]" : "min-h-[78svh] lg:min-h-[86svh]"}`}
    >
      <div className="absolute inset-0 -z-10 animate-hero-zoom">
        <Photo name={photo} alt={alt} priority sizes="100vw" />
      </div>
      {/* Overlay: readable text left, image breathes right */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-navy/90 via-navy/60 to-navy/10" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-navy via-navy/10 to-navy/50" />

      <div className="container-x relative flex w-full flex-col justify-end pt-36 pb-14 sm:pb-20 lg:pb-24">
        <p className="eyebrow animate-hero-in text-teal-light" style={{ animationDelay: "150ms" }}>
          {eyebrow}
        </p>
        <h1 className="mt-6 max-w-5xl text-[2.6rem] leading-[0.98] font-extrabold uppercase sm:text-6xl lg:text-[5.4rem] xl:text-[6.2rem]">
          {title.map((line, i) => (
            <span key={line} className="block animate-hero-in" style={{ animationDelay: `${300 + i * 140}ms` }}>
              {i === title.length - 1 ? <span className="text-white/55">{line}</span> : line}
            </span>
          ))}
        </h1>
        <p
          className="mt-7 max-w-2xl animate-hero-in text-lg leading-relaxed text-white/80 sm:text-xl"
          style={{ animationDelay: "650ms" }}
        >
          {sub}
        </p>
        {actions && (
          <div className="mt-10 flex animate-hero-in flex-wrap gap-3 sm:gap-4" style={{ animationDelay: "800ms" }}>
            {actions}
          </div>
        )}

        {stats && (
          <dl
            className="mt-14 grid max-w-3xl animate-hero-in grid-cols-3 divide-x divide-white/15 border-t border-white/15 pt-6"
            style={{ animationDelay: "950ms" }}
          >
            {stats.map((s) => (
              <div key={s.label} className="px-4 first:pl-0">
                <dt className="text-[0.7rem] font-semibold tracking-[0.18em] text-white/55 uppercase">{s.label}</dt>
                <dd className="mt-2 font-heading text-2xl font-extrabold sm:text-4xl">
                  {s.value}
                  {s.unit && <span className="ml-1 text-base font-bold text-teal-light sm:text-lg">{s.unit}</span>}
                </dd>
              </div>
            ))}
          </dl>
        )}

        <div className="pointer-events-none absolute right-5 bottom-6 hidden items-center gap-6 text-[0.68rem] font-semibold tracking-[0.22em] text-white/50 uppercase sm:right-8 md:flex lg:right-12">
          <span>Urk · NL</span>
          <span>{company.geo.label}</span>
        </div>

        {full && scrollLabel && (
          <a
            href="#content"
            className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 text-[0.65rem] font-semibold tracking-[0.3em] text-white/60 uppercase transition-colors hover:text-white md:flex"
          >
            {scrollLabel}
            <span className="relative block h-12 w-px overflow-hidden bg-white/20">
              <span className="absolute inset-x-0 top-0 h-1/2 animate-scroll-cue bg-white" />
            </span>
          </a>
        )}
      </div>
    </section>
  );
}
