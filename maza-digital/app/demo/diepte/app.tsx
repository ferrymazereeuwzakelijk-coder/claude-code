"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, X } from "lucide-react";

type Creature = { id: string; name: string; depth: number; fact: string; x: number; kind: "fish" | "jelly" | "turtle" | "squid" | "angler" | "worm" | "octo" | "shark" };

const CREATURES: Creature[] = [
  { id: "makreel", name: "Makreel", depth: 30, x: 18, kind: "fish", fact: "Zwemt in scholen van duizenden vissen en kan 5,5 km/u halen." },
  { id: "zeeschildpad", name: "Lederschildpad", depth: 120, x: 64, kind: "turtle", fact: "Duikt tot 1.200 meter diep op zoek naar kwallen." },
  { id: "haai", name: "Blauwe haai", depth: 280, x: 22, kind: "shark", fact: "Legt elk jaar duizenden kilometers af door de oceaan." },
  { id: "kwal", name: "Atolla-kwal", depth: 700, x: 68, kind: "jelly", fact: "Knippert met blauw licht als alarmsignaal: 'help, ik word aangevallen'." },
  { id: "inktvis", name: "Vampierinktvis", depth: 1300, x: 30, kind: "squid", fact: "Leeft waar bijna geen zuurstof is en draait zich binnenstebuiten als verdediging." },
  { id: "hengelvis", name: "Hengelvis", depth: 2100, x: 62, kind: "angler", fact: "Lokt prooi met een lichtgevend 'hengeltje' boven zijn bek." },
  { id: "dumbo", name: "Dumbo-octopus", depth: 3400, x: 24, kind: "octo", fact: "Zwemt met oorvormige vinnen en is gezien op 7.000 meter diepte." },
  { id: "worm", name: "Kokerworm", depth: 4600, x: 66, kind: "worm", fact: "Leeft bij hete bronnen op de zeebodem, zonder enig zonlicht." },
];

const ZONES = [
  { from: 0, name: "Zonlichtzone", sub: "0 – 200 m" },
  { from: 200, name: "Schemerzone", sub: "200 – 1.000 m" },
  { from: 1000, name: "Middernachtzone", sub: "1.000 – 4.000 m" },
  { from: 4000, name: "Abyss", sub: "4.000 m en dieper" },
];

const QUIZ = [
  { q: "Welke zone krijgt nog zonlicht?", a: ["Zonlichtzone", "Middernachtzone", "Abyss"], ok: 0 },
  { q: "Waarvoor gebruikt de hengelvis zijn licht?", a: ["Om te zien", "Om prooi te lokken", "Om warm te blijven"], ok: 1 },
  { q: "Hoe diep is de Dumbo-octopus gezien?", a: ["700 m", "2.000 m", "7.000 m"], ok: 2 },
];

const MAX = 5000;
const PX_PER_M = 1.6;

export function DiepteApp() {
  const [y, setY] = useState(0);
  const [found, setFound] = useState<string[]>([]);
  const [card, setCard] = useState<Creature | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([null, null, null]);

  useEffect(() => {
    const on = () => setY(window.scrollY);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  const depth = Math.min(MAX, Math.max(0, Math.round(y / PX_PER_M)));
  const t = depth / MAX;
  const zone = [...ZONES].reverse().find((z) => depth >= z.from)!;
  const bg = `rgb(${Math.round(40 * (1 - t) ** 3)}, ${Math.round(150 * (1 - t) ** 2.2 + 4)}, ${Math.round(200 * (1 - t) ** 1.6 + 12)})`;
  const light = Math.max(0, 1 - t * 4);
  const snow = useMemo(() => Array.from({ length: 40 }, (_, i) => ({ l: (i * 37) % 100, d: 8 + (i % 7) * 2, delay: -(i * 1.3) % 14, s: 1 + (i % 3) })), []);
  const score = answers.filter((a, i) => a === QUIZ[i]!.ok).length;
  const allAnswered = answers.every((a) => a !== null);

  return (
    <div className="relative text-white" style={{ background: bg, transition: "background 0.2s linear" }}>
      {/* Fixed scene layers */}
      <div className="pointer-events-none fixed inset-0" style={{ background: `repeating-linear-gradient(105deg, transparent 0 60px, rgb(255 255 255 / ${0.06 * light}) 60px 110px)`, maskImage: "linear-gradient(180deg, black, transparent 70%)" }} />
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        {snow.map((p, i) => (
          <span key={i} className="absolute bottom-0 rounded-full bg-white/50" style={{ left: `${p.l}%`, width: p.s, height: p.s, animation: `rise ${p.d}s linear ${p.delay}s infinite` }} />
        ))}
      </div>

      <div className="fixed left-4 top-4 z-20 md:left-8 md:top-8">
        <p className="font-display text-sm font-semibold tracking-[0.3em]">DIEPTE</p>
        <p className="text-[11px] text-white/60">Zeeaquarium Noordkust</p>
      </div>
      <div className="fixed right-4 top-4 z-20 text-right md:right-8 md:top-8">
        <p className="font-display text-4xl font-semibold tabular-nums md:text-6xl">−{depth.toLocaleString("nl-NL")} m</p>
        <p className="text-sm text-white/70">{zone.name} · {zone.sub}</p>
        <p className="mt-2 text-xs text-white/60">Ontdekt: {found.length} / {CREATURES.length}</p>
      </div>
      <div className="fixed right-4 top-1/2 z-20 h-48 w-1 -translate-y-1/2 rounded-full bg-white/15 md:right-8">
        <div className="w-full rounded-full bg-white" style={{ height: `${t * 100}%` }} />
      </div>

      {/* Surface */}
      <section className="relative flex h-[100svh] flex-col items-center justify-center px-6 text-center">
        <h1 className="max-w-3xl font-display text-5xl font-semibold leading-[0.95] tracking-tight md:text-8xl">Hoe diep durf jij?</h1>
        <p className="mt-6 max-w-md text-lg text-white/80">Scroll om te duiken. Tik op de dieren die je tegenkomt om ze te ontdekken.</p>
        <p className="mt-12 animate-bounce text-sm text-white/60">↓ Duik</p>
      </section>

      {/* The water column */}
      <section className="relative" style={{ height: MAX * PX_PER_M }}>
        {ZONES.slice(1).map((z) => (
          <div key={z.name} className="absolute inset-x-0 border-t border-dashed border-white/15 px-6 pt-3 text-xs uppercase tracking-[0.25em] text-white/40" style={{ top: z.from * PX_PER_M }}>
            {z.name}
          </div>
        ))}
        {CREATURES.map((c) => {
          const isFound = found.includes(c.id);
          const glow = c.depth > 600;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setCard(c);
                if (!isFound) setFound([...found, c.id]);
              }}
              className="group absolute flex w-36 -translate-x-1/2 flex-col items-center md:w-48"
              style={{ top: c.depth * PX_PER_M, left: `${c.x}%` }}
            >
              <span className="w-full transition duration-500 group-hover:scale-110" style={{ filter: glow ? "drop-shadow(0 0 14px #5EEAD4)" : undefined, animation: "fadeup 1s both" }}>
                <CreatureSvg kind={c.kind} glow={glow} />
              </span>
              <span className={`mt-2 rounded-full px-3 py-1 text-xs ${isFound ? "bg-white text-[#06222f]" : "bg-white/10 backdrop-blur"}`}>
                {isFound ? `✓ ${c.name}` : "Wat is dit?"}
              </span>
            </button>
          );
        })}
      </section>

      {/* Seabed + quiz */}
      <section className="relative px-6 pb-32 pt-16">
        <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur md:p-10">
          <p className="text-sm text-[#5EEAD4]">Je hebt de bodem bereikt</p>
          <h2 className="mt-2 font-display text-3xl font-semibold">Weet jij het nog?</h2>
          <div className="mt-6 space-y-6">
            {QUIZ.map((q, i) => (
              <div key={q.q}>
                <p className="font-medium">{q.q}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {q.a.map((a, k) => {
                    const chosen = answers[i] === k;
                    const right = k === q.ok;
                    return (
                      <button
                        key={a}
                        type="button"
                        disabled={answers[i] !== null}
                        onClick={() => setAnswers(answers.map((x, j) => (j === i ? k : x)))}
                        className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition ${
                          chosen ? (right ? "border-emerald-300 bg-emerald-300 text-[#06222f]" : "border-red-300 bg-red-300/90 text-[#06222f]") : answers[i] !== null && right ? "border-emerald-300" : "border-white/20 hover:bg-white/10"
                        }`}
                      >
                        {chosen && (right ? <Check className="size-3.5" /> : <X className="size-3.5" />)}
                        {a}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          {allAnswered && (
            <div className="animate-fadeup mt-8 rounded-2xl bg-[#5EEAD4] p-5 text-[#06222f]">
              <p className="text-sm">{score} van 3 goed{score === 3 ? ". Echte diepzee-expert!" : "."}</p>
              <p className="mt-1 font-display text-2xl font-semibold">Je kortingscode: DIEPTE{10 + score * 5}</p>
              <p className="mt-1 text-sm">{10 + score * 5}% korting op je bezoek aan het aquarium.</p>
            </div>
          )}
        </div>
      </section>

      {card && (
        <div className="fixed inset-x-4 bottom-20 z-30 mx-auto max-w-md animate-fadeup rounded-2xl bg-white p-5 text-[#06222f] shadow-2xl md:bottom-8">
          <button type="button" aria-label="Sluiten" onClick={() => setCard(null)} className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-black/5">
            <X className="size-4" />
          </button>
          <p className="text-xs uppercase tracking-wider text-[#06222f]/50">Ontdekt op {c2(card.depth)} m</p>
          <p className="mt-1 font-display text-xl font-semibold">{card.name}</p>
          <p className="mt-2 text-sm text-[#06222f]/75">{card.fact}</p>
        </div>
      )}
    </div>
  );
}

const c2 = (n: number) => n.toLocaleString("nl-NL");

function CreatureSvg({ kind, glow }: { kind: Creature["kind"]; glow: boolean }) {
  const body = glow ? "#5EEAD4" : "#BFE9F5";
  switch (kind) {
    case "fish":
      return (
        <svg viewBox="0 0 160 70" className="w-full">
          {[0, 1, 2].map((i) => (
            <g key={i} transform={`translate(${i * 40} ${i % 2 ? 26 : 0})`}>
              <path d="M10 22 C30 4 60 4 74 22 C60 40 30 40 10 22Z M74 22 L90 10 L90 34Z" fill={body} fillOpacity="0.85" />
              <circle cx="24" cy="19" r="2.5" fill="#06222f" />
            </g>
          ))}
        </svg>
      );
    case "turtle":
      return (
        <svg viewBox="0 0 140 90" className="w-full">
          <ellipse cx="70" cy="45" rx="40" ry="28" fill="#6FA88A" />
          <ellipse cx="70" cy="45" rx="30" ry="20" fill="#4C7F66" />
          <circle cx="118" cy="40" r="11" fill="#8CC0A2" />
          <path d="M44 24 L18 8 L36 30Z M44 66 L18 84 L36 60Z M96 24 L110 10 L104 30Z M96 66 L110 80 L104 60Z" fill="#8CC0A2" />
        </svg>
      );
    case "shark":
      return (
        <svg viewBox="0 0 200 80" className="w-full">
          <path d="M10 44 C50 20 120 18 170 38 L196 22 L188 46 L196 66 L170 52 C120 66 50 64 10 44Z M90 26 L110 2 L118 28Z" fill="#7FA6BF" />
          <circle cx="36" cy="40" r="3" fill="#06222f" />
        </svg>
      );
    case "jelly":
      return (
        <svg viewBox="0 0 100 130" className="w-full">
          <path d="M10 50 C10 10 90 10 90 50 Z" fill={body} fillOpacity="0.5" stroke={body} />
          {[22, 38, 54, 70, 82].map((x) => (
            <path key={x} d={`M${x} 50 C${x - 8} 75 ${x + 8} 95 ${x - 3} 125`} fill="none" stroke={body} strokeWidth="2" />
          ))}
        </svg>
      );
    case "squid":
      return (
        <svg viewBox="0 0 110 130" className="w-full">
          <path d="M55 6 C80 20 82 60 70 76 L40 76 C28 60 30 20 55 6Z" fill="#B44A6A" />
          {[42, 50, 58, 66].map((x, i) => (
            <path key={x} d={`M${x} 74 C${x - 10 + i * 6} 100 ${x + 6} 112 ${x - 4 + i * 3} 126`} fill="none" stroke="#B44A6A" strokeWidth="4" strokeLinecap="round" />
          ))}
          <circle cx="47" cy="50" r="4" fill={body} /><circle cx="63" cy="50" r="4" fill={body} />
        </svg>
      );
    case "angler":
      return (
        <svg viewBox="0 0 160 110" className="w-full">
          <path d="M30 70 C30 30 110 30 120 66 C110 100 40 100 30 70Z M120 66 L150 48 L146 84Z" fill="#2C3E50" stroke="#46627D" />
          <path d="M44 40 Q40 8 70 12" fill="none" stroke="#46627D" strokeWidth="2" />
          <circle cx="72" cy="12" r="7" fill={body} />
          <path d="M34 72 L42 66 L48 74 L54 66 L60 74 L66 66 L72 74" fill="none" stroke="white" strokeWidth="2" />
          <circle cx="56" cy="54" r="5" fill={body} />
        </svg>
      );
    case "octo":
      return (
        <svg viewBox="0 0 120 110" className="w-full">
          <ellipse cx="60" cy="46" rx="34" ry="32" fill="#F2A3A0" />
          <ellipse cx="22" cy="34" rx="12" ry="8" fill="#F2A3A0" /><ellipse cx="98" cy="34" rx="12" ry="8" fill="#F2A3A0" />
          <path d="M30 70 Q40 100 60 86 Q80 100 90 70" fill="#E88985" />
          <circle cx="48" cy="44" r="4" fill="#06222f" /><circle cx="72" cy="44" r="4" fill="#06222f" />
        </svg>
      );
    case "worm":
      return (
        <svg viewBox="0 0 140 120" className="w-full">
          {[30, 60, 90, 112].map((x, i) => (
            <g key={x}>
              <rect x={x - 5} y={40 + i * 6} width="10" height={80 - i * 6} rx="4" fill="#E8E2D0" />
              <ellipse cx={x} cy={38 + i * 6} rx="10" ry="8" fill="#E2453C" />
            </g>
          ))}
        </svg>
      );
  }
}
