"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

/**
 * Real screenshots of the demo products, arranged in 3D space.
 * The stack leans towards the pointer and drifts slightly as you scroll.
 * Touch devices and reduced-motion visitors get the same composition, still.
 */
export function HeroShowcase({ alt }: { alt: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let rx = 0, ry = 0, tx = 0, ty = 0, raf = 0;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const loop = () => {
      rx += (tx - rx) * 0.06;
      ry += (ty - ry) * 0.06;
      const s = Math.min(window.scrollY / 600, 1);
      el.style.setProperty("--px", rx.toFixed(3));
      el.style.setProperty("--py", ry.toFixed(3));
      el.style.setProperty("--s", s.toFixed(3));
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div ref={ref} className="showcase relative aspect-[5/4] w-full [perspective:1800px]" role="img" aria-label={alt}>
      <div className="showcase-stage absolute inset-0 [transform-style:preserve-3d]">
        <Frame src="/projects/vlootzicht.webp" className="left-[4%] top-[2%] w-[70%]" z={-80} />
        <Frame src="/projects/kadeboek.webp" className="right-[0%] top-[36%] w-[70%]" z={30} />
        <div className="showcase-layer absolute bottom-[0%] left-[6%] w-[21%]" style={{ ["--z" as string]: "110px" }}>
          <div className="overflow-hidden rounded-[22px] border-[5px] border-[#14162B] bg-[#14162B] shadow-[0_40px_80px_-20px_rgb(0_0_0/0.7)]">
            <Image src="/projects/veldwerk-phone.webp" alt="" width={585} height={1266} sizes="160px" className="h-auto w-full" priority />
          </div>
        </div>
      </div>
    </div>
  );
}

function Frame({ src, className, z }: { src: string; className: string; z: number }) {
  return (
    <div className={`showcase-layer absolute ${className}`} style={{ ["--z" as string]: `${z}px` }}>
      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0d1220] shadow-[0_40px_100px_-30px_rgb(0_0_0/0.8)]">
        <div className="flex items-center gap-1.5 border-b border-white/10 px-3 py-2">
          <span className="size-2 rounded-full bg-white/20" />
          <span className="size-2 rounded-full bg-white/20" />
          <span className="size-2 rounded-full bg-white/20" />
        </div>
        <Image src={src} alt="" width={2400} height={1500} sizes="(min-width: 1024px) 45vw, 90vw" className="h-auto w-full" priority />
      </div>
    </div>
  );
}
