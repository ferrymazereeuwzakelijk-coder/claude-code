"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { LuChevronLeft, LuChevronRight, LuExpand, LuX } from "react-icons/lu";
import { photos, type PhotoKey } from "@/content/site";

type Props = {
  items: readonly PhotoKey[];
  alts: Record<PhotoKey, string>;
  labels: { open: string; close: string; prev: string; next: string };
};

// Bento layout pattern on large screens (the two upright deck photos span two rows)
const spans = [
  "lg:col-span-2 lg:row-span-2",
  "lg:row-span-2",
  "lg:row-span-2",
  "lg:col-span-2 lg:row-span-2",
  "",
  "",
  "lg:col-span-2",
  "",
  "lg:col-span-2",
  "",
  "",
  "lg:col-span-2",
  "",
  "",
  "lg:col-span-2",
];

export default function Gallery({ items: allItems, alts, labels }: Props) {
  const [index, setIndex] = useState<number | null>(null);
  // Photos that fail to load (e.g. once the old hosting is gone) drop out of the grid
  const [failed, setFailed] = useState<ReadonlySet<PhotoKey>>(new Set());
  const items = allItems.filter((k) => !failed.has(k));
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastTrigger = useRef<HTMLButtonElement | null>(null);

  const close = useCallback(() => {
    setIndex(null);
    lastTrigger.current?.focus();
  }, []);
  const step = useCallback(
    (d: number) => setIndex((i) => (i === null ? i : (i + d + items.length) % items.length)),
    [items.length],
  );

  useEffect(() => {
    if (index === null) return;
    closeRef.current?.focus();
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [index, close, step]);

  return (
    <>
      <ul className="grid grid-flow-row-dense auto-rows-[200px] grid-cols-2 gap-3 sm:auto-rows-[240px] sm:gap-4 lg:grid-cols-4">
        {items.map((key, i) => (
          <li key={key} data-reveal style={{ ["--reveal-delay" as string]: `${(i % 4) * 80}ms` }} className={`${spans[i % spans.length]} ${i === 0 ? "col-span-2" : ""}`}>
            <button
              type="button"
              onClick={(e) => {
                lastTrigger.current = e.currentTarget;
                setIndex(i);
              }}
              className="group relative block h-full w-full overflow-hidden rounded-xl bg-marine"
              aria-label={`${labels.open}: ${alts[key]}`}
            >
              <Image
                src={photos[key].src}
                alt={alts[key]}
                fill
                sizes="(min-width:1024px) 33vw, 50vw"
                onError={() => setFailed((prev) => new Set(prev).add(key))}
                className="object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.06]"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-navy/70 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <span className="absolute right-3 bottom-3 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-navy opacity-0 transition-all duration-500 group-hover:opacity-100">
                <LuExpand aria-hidden className="h-4 w-4" />
              </span>
            </button>
          </li>
        ))}
      </ul>

      {index !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alts[items[index]]}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-navy/95 p-4 backdrop-blur-sm sm:p-10"
          onClick={(e) => e.target === e.currentTarget && close()}
        >
          <figure className="relative h-full max-h-[82vh] w-full max-w-6xl">
            <Image src={photos[items[index]].src} alt={alts[items[index]]} fill sizes="100vw" className="object-contain" />
            <figcaption className="absolute -bottom-10 left-0 text-sm text-white/70">
              {index + 1} / {items.length} — {alts[items[index]]}
            </figcaption>
          </figure>
          <button ref={closeRef} type="button" onClick={close} aria-label={labels.close} className="absolute top-4 right-4 grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20">
            <LuX aria-hidden className="h-6 w-6" />
          </button>
          <button type="button" onClick={() => step(-1)} aria-label={labels.prev} className="absolute top-1/2 left-3 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:left-6">
            <LuChevronLeft aria-hidden className="h-6 w-6" />
          </button>
          <button type="button" onClick={() => step(1)} aria-label={labels.next} className="absolute top-1/2 right-3 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:right-6">
            <LuChevronRight aria-hidden className="h-6 w-6" />
          </button>
        </div>
      )}
    </>
  );
}
