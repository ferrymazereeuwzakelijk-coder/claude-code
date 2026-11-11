"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { AnchorName, FerryJoScene } from "./three/scene";

export type Callout = { anchor: string; value: string; unit: string; label: string; text: string };

type Props = {
  eyebrow: string;
  title: readonly string[];
  sub: string;
  hint: string;
  hud: { local: string; vessel: string; status: string };
  callouts: Callout[];
  final: { title: readonly string[]; text: string };
  fallbackText: string;
  fallbackImage: { src: string; alt: string };
  coords: string;
  actions: ReactNode;
  finalActions: ReactNode;
};

// Scroll windows (0..1) in which each callout is shown
const WINDOWS: [number, number][] = [
  [0.1, 0.3],
  [0.31, 0.52],
  [0.53, 0.72],
  [0.73, 0.88],
];
const ramp = (p: number, a: number, b: number) => Math.min(1, Math.max(0, (p - a) / (b - a)));
const windowAlpha = (p: number, [a, b]: [number, number]) => Math.min(ramp(p, a, a + 0.04), 1 - ramp(p, b - 0.04, b));

/**
 * Full-screen, scroll-driven 3D Ferry-Jo. The section is several screens tall;
 * the canvas sticks while the camera walks around the vessel and spec callouts
 * point at the real parts of the ship. Falls back to a photo without WebGL.
 */
export default function ShipHero(props: Props) {
  const { eyebrow, title, sub, hint, hud, callouts, final, fallbackText, fallbackImage, coords, actions, finalActions } = props;
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const finalRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const calloutRefs = useRef<(HTMLDivElement | null)[]>([]);
  const lineRefs = useRef<(SVGLineElement | null)[]>([]);
  const dotRefs = useRef<(SVGCircleElement | null)[]>([]);
  const [mode, setMode] = useState<"loading" | "3d" | "fallback">("loading");
  const [clock, setClock] = useState("");

  // Local time in Urk for the HUD
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("nl-NL", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Europe/Amsterdam" });
    const tick = () => setClock(fmt.format(new Date()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const section = sectionRef.current;
    if (!canvas || !section) return;
    let scene: FerryJoScene | null = null;
    let disposed = false;
    let progress = 0;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const probe = document.createElement("canvas");
    const gl = probe.getContext("webgl2") || probe.getContext("webgl");
    if (!gl) {
      setMode("fallback");
      return;
    }

    const layout = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!scene) return;
      progress = scene.currentProgress;
      callouts.forEach((c, i) => {
        const el = calloutRefs.current[i];
        const line = lineRefs.current[i];
        const dot = dotRefs.current[i];
        if (!el || !line || !dot) return;
        const a = windowAlpha(progress, WINDOWS[i]);
        el.style.opacity = String(a);
        el.style.visibility = a > 0.01 ? "visible" : "hidden";
        line.style.opacity = dot.style.opacity = String(a);
        if (a <= 0.01) return;
        const pt = scene!.project(c.anchor as AnchorName);
        const bw = el.offsetWidth;
        const bh = el.offsetHeight;
        const right = pt.x < w * 0.55;
        const mobile = w < 640;
        let bx = mobile ? (w - bw) / 2 : right ? pt.x + 70 : pt.x - bw - 70;
        let by = mobile ? h - bh - 96 : pt.y - bh - 70;
        bx = Math.min(Math.max(16, bx), w - bw - 16);
        by = Math.min(Math.max(90, by), h - bh - 90);
        el.style.transform = `translate3d(${bx}px, ${by}px, 0) translateY(${(1 - a) * 14}px)`;
        dot.setAttribute("cx", String(pt.x));
        dot.setAttribute("cy", String(pt.y));
        line.setAttribute("x1", String(pt.x));
        line.setAttribute("y1", String(pt.y));
        line.setAttribute("x2", String(mobile ? bx + bw / 2 : right ? bx : bx + bw));
        line.setAttribute("y2", String(mobile ? by : by + bh));
      });
      const intro = introRef.current;
      if (intro) {
        const a = 1 - ramp(progress, 0.02, 0.1);
        intro.style.opacity = String(a);
        intro.style.transform = `translateY(${-progress * 300}px)`;
        intro.style.visibility = a > 0.01 ? "visible" : "hidden";
      }
      const fin = finalRef.current;
      if (fin) {
        const a = ramp(progress, 0.88, 0.96);
        fin.style.opacity = String(a);
        fin.style.visibility = a > 0.01 ? "visible" : "hidden";
        fin.style.transform = `translateY(${(1 - a) * 40}px)`;
      }
      railRef.current?.style.setProperty("--p", String(progress));
    };

    const onScroll = () => {
      const r = section.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      scene?.setProgress(Math.min(1, Math.max(0, -r.top / total)));
    };
    const onPointer = (e: PointerEvent) => {
      scene?.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    };

    import("./three/scene")
      .then(({ FerryJoScene }) => {
        if (disposed) return;
        try {
          scene = new FerryJoScene(canvas, { still, onFrame: layout });
          onScroll();
          setMode("3d");
        } catch {
          setMode("fallback");
        }
      })
      .catch(() => setMode("fallback"));

    const io = new IntersectionObserver(([e]) => scene?.setVisible(e.isIntersecting));
    io.observe(section);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    return () => {
      disposed = true;
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointer);
      scene?.dispose();
    };
  }, [callouts]);

  const fallback = mode === "fallback";

  return (
    <section
      ref={sectionRef}
      aria-label={title.join(" ")}
      className={`relative bg-navy text-white ${fallback ? "h-[100svh]" : "h-[520svh]"}`}
    >
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        {/* Poster while the 3D scene loads, and the no-WebGL fallback */}
        <div className={`absolute inset-0 transition-opacity duration-1000 ${mode === "3d" ? "opacity-0" : "opacity-100"}`}>
          <Image src={fallbackImage.src} alt={fallbackImage.alt} fill priority sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/60 to-navy/30" />
        </div>
        <canvas
          ref={canvasRef}
          aria-hidden
          className={`absolute inset-0 h-full w-full transition-opacity duration-1000 ${mode === "3d" ? "opacity-100" : "opacity-0"}`}
        />
        {/* Vignette for legibility */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(7,9,11,0.75)_100%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-navy to-transparent" />

        {/* Callout leader lines */}
        <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full">
          {callouts.map((c, i) => (
            <g key={c.anchor}>
              <line ref={(el) => { lineRefs.current[i] = el; }} stroke="#00a2e0" strokeWidth="1" strokeDasharray="3 4" style={{ opacity: 0 }} />
              <circle ref={(el) => { dotRefs.current[i] = el; }} r="5" fill="#07090b" stroke="#00a2e0" strokeWidth="2" style={{ opacity: 0 }} />
            </g>
          ))}
        </svg>

        {/* Callouts */}
        {mode === "3d" &&
          callouts.map((c, i) => (
            <div
              key={c.anchor}
              ref={(el) => { calloutRefs.current[i] = el; }}
              className="hud-frame pointer-events-none absolute top-0 left-0 w-[min(300px,calc(100vw-32px))] bg-navy/70 p-5 text-teal-light backdrop-blur-md"
              style={{ opacity: 0, visibility: "hidden" }}
            >
              <p className="hud text-white/50">
                {String(i + 1).padStart(2, "0")} / {String(callouts.length).padStart(2, "0")} · {c.label}
              </p>
              <p className="display mt-3 text-5xl text-white sm:text-6xl">
                {c.value}
                {c.unit && <span className="ml-1 text-2xl text-teal">{c.unit}</span>}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-white/75">{c.text}</p>
            </div>
          ))}

        {/* HUD chrome */}
        <div className="hud pointer-events-none absolute inset-x-0 top-[92px] hidden justify-between px-4 text-white/55 sm:flex sm:px-8 lg:px-12">
          <span>
            {hud.vessel}: FERRY-JO · EU 02203689 · <span className="text-teal-light">{coords}</span>
          </span>
          <span>
            <span className="mr-2 inline-block h-1.5 w-1.5 animate-blink rounded-full bg-signal align-middle" />
            {hud.status} · {hud.local} {clock}
          </span>
        </div>

        {/* Progress rail */}
        {mode === "3d" && (
          <div
            ref={railRef}
            aria-hidden
            className="pointer-events-none absolute top-1/2 right-4 hidden h-56 w-px -translate-y-1/2 bg-white/15 sm:right-8 md:block lg:right-12"
          >
            <div className="absolute inset-x-0 top-0 h-full origin-top scale-y-[var(--p,0)] bg-teal" />
            {WINDOWS.map(([a], i) => (
              <span key={a} className="hud absolute -left-8 text-white/40" style={{ top: `${a * 100}%` }}>
                {String(i + 1).padStart(2, "0")}
              </span>
            ))}
          </div>
        )}

        {/* Intro copy */}
        <div ref={introRef} className="absolute inset-0 flex items-end bg-gradient-to-t from-navy/80 via-transparent to-transparent">
          <div className="container-x pb-8 sm:pb-[max(4.5rem,12svh)]">
            <p className="eyebrow animate-hero-in text-teal-light" style={{ animationDelay: "150ms" }}>{eyebrow}</p>
            <h1 className="display mt-4 max-w-[14ch] text-[2.15rem] sm:mt-6 sm:text-6xl lg:text-[5.2rem] xl:text-[6rem]">
              {title.map((line, i) => (
                <span key={line} className="block animate-hero-in" style={{ animationDelay: `${300 + i * 140}ms` }}>
                  {i === title.length - 1 ? <span className="outline-text text-white/80">{line}</span> : line}
                </span>
              ))}
            </h1>
            <div className="mt-5 flex animate-hero-in flex-col gap-6 sm:mt-8 sm:gap-8 lg:flex-row lg:items-end lg:justify-between" style={{ animationDelay: "650ms" }}>
              <p className="max-w-xl leading-relaxed text-white/75 sm:text-xl">{sub}</p>
              <div className="flex flex-wrap gap-3 [&>*:nth-child(2)]:hidden sm:[&>*:nth-child(2)]:inline-flex">{actions}</div>
            </div>
            {!fallback && (
              <p className="hud mt-6 flex items-center gap-3 text-white/50 sm:mt-10">
                <span className="relative block h-8 w-px overflow-hidden bg-white/20">
                  <span className="absolute inset-x-0 top-0 h-1/2 animate-scroll-cue bg-teal" />
                </span>
                {hint}
              </p>
            )}
            {fallback && <p className="hud mt-8 text-white/40">{fallbackText}</p>}
          </div>
        </div>

        {/* Final state */}
        {mode === "3d" && (
          <div ref={finalRef} className="absolute inset-0 flex items-end bg-gradient-to-r from-navy/85 via-navy/40 to-transparent pb-[12svh] md:items-center md:pb-0" style={{ opacity: 0, visibility: "hidden" }}>
            <div className="container-x">
              <p className="display max-w-[12ch] text-[2.6rem] sm:text-6xl lg:text-[5.4rem]">
                {final.title.map((l, i) => (
                  <span key={l} className={`block ${i === final.title.length - 1 ? "text-teal" : ""}`}>{l}</span>
                ))}
              </p>
              <p className="mt-6 max-w-xl text-lg text-white/75">{final.text}</p>
              <div className="mt-8 flex flex-wrap gap-3">{finalActions}</div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

