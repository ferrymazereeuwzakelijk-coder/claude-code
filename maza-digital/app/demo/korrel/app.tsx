"use client";

import { useMemo, useState } from "react";
import { Check, Clock, MapPin, Minus, Plus, ShoppingBag, X } from "lucide-react";

type Shape = "round" | "batard" | "baguette" | "croissant" | "bun" | "pie" | "loaf" | "cake";
type Product = { id: string; name: string; desc: string; price: number; cat: "Brood" | "Zoet" | "Taart"; shape: Shape; tone: string; soldOut?: boolean };

const PRODUCTS: Product[] = [
  { id: "zuur", name: "Zuurdesem wit", desc: "48 uur gerezen, krokante korst", price: 4.75, cat: "Brood", shape: "round", tone: "#C98A4B" },
  { id: "noten", name: "Notenbrood", desc: "Walnoot, hazelnoot en rozijn", price: 5.25, cat: "Brood", shape: "batard", tone: "#8E5A33" },
  { id: "stokbrood", name: "Stokbrood", desc: "Elke ochtend vers van de plaat", price: 2.4, cat: "Brood", shape: "baguette", tone: "#D49A57" },
  { id: "spelt", name: "Volkoren spelt", desc: "100% spelt uit de Noordoostpolder", price: 4.95, cat: "Brood", shape: "loaf", tone: "#9C6A3D" },
  { id: "croissant", name: "Roomboter croissant", desc: "Met Franse roomboter", price: 1.95, cat: "Zoet", shape: "croissant", tone: "#E0A458" },
  { id: "kaneel", name: "Kaneelbroodje", desc: "Met kardemom en parelsuiker", price: 2.75, cat: "Zoet", shape: "bun", tone: "#B9733F", soldOut: true },
  { id: "appel", name: "Appeltaart", desc: "Hele taart, 8 punten", price: 18.5, cat: "Taart", shape: "pie", tone: "#C17F3E" },
  { id: "kwark", name: "Kwarktaart rood fruit", desc: "Hele taart, 10 punten", price: 22.0, cat: "Taart", shape: "cake", tone: "#E9D9C4" },
];

const SLOTS = [
  { t: "07:30", left: 0 },
  { t: "08:30", left: 3 },
  { t: "09:30", left: 8 },
  { t: "10:30", left: 12 },
  { t: "12:00", left: 2 },
  { t: "14:00", left: 15 },
];

const eur = (n: number) => n.toLocaleString("nl-NL", { style: "currency", currency: "EUR" });

export function KorrelApp() {
  const [cat, setCat] = useState<"Alles" | Product["cat"]>("Alles");
  const [cart, setCart] = useState<Record<string, number>>({ zuur: 1, croissant: 4 });
  const [open, setOpen] = useState(false);
  const [shop, setShop] = useState<"Centrum" | "Noord">("Centrum");
  const [slot, setSlot] = useState("09:30");
  const [step, setStep] = useState<"cart" | "checkout" | "done">("cart");
  const [name, setName] = useState("");
  const order = useMemo(() => `K-${Math.floor(1000 + Math.random() * 8999)}`, []);

  const items = Object.entries(cart).filter(([, q]) => q > 0);
  const count = items.reduce((s, [, q]) => s + q, 0);
  const total = items.reduce((s, [id, q]) => s + q * PRODUCTS.find((p) => p.id === id)!.price, 0);
  const add = (id: string, d: number) => setCart((c) => ({ ...c, [id]: Math.max(0, (c[id] ?? 0) + d) }));
  const shown = PRODUCTS.filter((p) => cat === "Alles" || p.cat === cat);

  return (
    <div className="min-h-screen bg-[#FBF6EE] text-[#3B2A20]">
      <div className="bg-[#3B2A20] py-2 text-center text-xs text-[#FBF6EE]/85">Vandaag besteld vóór 18:00, morgen op te halen · Gratis</div>
      <header className="sticky top-0 z-30 border-b border-[#3B2A20]/10 bg-[#FBF6EE]/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <span className="font-serif text-2xl font-semibold italic tracking-tight">Korrel</span>
          <nav className="hidden gap-7 text-sm md:flex">
            <span className="font-medium">Bestellen</span>
            <span className="text-[#3B2A20]/60">Ons verhaal</span>
            <span className="text-[#3B2A20]/60">Vestigingen</span>
          </nav>
          <button type="button" onClick={() => setOpen(true)} className="relative flex items-center gap-2 rounded-full bg-[#3B2A20] px-4 py-2 text-sm text-[#FBF6EE]">
            <ShoppingBag className="size-4" /> {eur(total)}
            {count > 0 && <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-[#E2703A] text-[11px] font-semibold">{count}</span>}
          </button>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-12 md:grid-cols-2 md:py-20">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#E2703A]">Ambachtelijke bakkerij · sinds 1987</p>
          <h1 className="mt-4 font-serif text-5xl font-semibold leading-[1.02] tracking-tight md:text-7xl">
            Vers van de plaat.
            <br />
            <span className="italic text-[#E2703A]">Zonder wachtrij.</span>
          </h1>
          <p className="mt-5 max-w-md text-lg text-[#3B2A20]/70">Bestel vandaag, kies je afhaalmoment en loop morgen zo naar binnen. Je bestelling staat klaar.</p>
          <div className="mt-6 flex gap-2">
            {(["Centrum", "Noord"] as const).map((s) => (
              <button key={s} type="button" onClick={() => setShop(s)} className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm ${shop === s ? "border-[#3B2A20] bg-[#3B2A20] text-[#FBF6EE]" : "border-[#3B2A20]/20"}`}>
                <MapPin className="size-3.5" /> {s}
              </button>
            ))}
          </div>
        </div>
        <div className="relative mx-auto aspect-square w-full max-w-md">
          <div className="absolute inset-[6%] rounded-full bg-[#F1E2CC]" />
          <div className="absolute left-[8%] top-[18%] w-[56%] -rotate-6"><Bread shape="round" tone="#C98A4B" /></div>
          <div className="absolute right-[2%] top-[8%] w-[44%] rotate-12"><Bread shape="croissant" tone="#E0A458" /></div>
          <div className="absolute bottom-[10%] right-[8%] w-[62%] -rotate-12"><Bread shape="baguette" tone="#D49A57" /></div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-serif text-3xl font-semibold">Het assortiment van morgen</h2>
          <div className="flex gap-2">
            {(["Alles", "Brood", "Zoet", "Taart"] as const).map((c) => (
              <button key={c} type="button" onClick={() => setCat(c)} className={`rounded-full px-4 py-1.5 text-sm ${cat === c ? "bg-[#E2703A] text-white" : "bg-[#3B2A20]/5"}`}>
                {c}
              </button>
            ))}
          </div>
        </div>
        <ul className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {shown.map((p) => (
            <li key={p.id} className="group">
              <div className="relative grid aspect-square place-items-center overflow-hidden rounded-2xl bg-[#F1E2CC] p-[14%] transition group-hover:bg-[#EDD8BA]">
                <div className="w-full transition duration-500 group-hover:-rotate-3 group-hover:scale-105">
                  <Bread shape={p.shape} tone={p.tone} />
                </div>
                {p.soldOut && <span className="absolute left-3 top-3 rounded-full bg-[#3B2A20] px-2.5 py-1 text-[11px] text-[#FBF6EE]">Uitverkocht voor morgen</span>}
              </div>
              <div className="mt-3 flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-[#3B2A20]/55">{p.desc}</p>
                </div>
                <p className="shrink-0 font-medium">{eur(p.price)}</p>
              </div>
              {p.soldOut ? (
                <p className="mt-3 rounded-full border border-[#3B2A20]/10 py-2 text-center text-sm text-[#3B2A20]/40">Overmorgen weer</p>
              ) : cart[p.id] ? (
                <div className="mt-3 flex items-center justify-between rounded-full bg-[#3B2A20] px-1.5 py-1.5 text-[#FBF6EE]">
                  <button type="button" aria-label="Minder" onClick={() => add(p.id, -1)} className="grid size-7 place-items-center rounded-full bg-white/10"><Minus className="size-3.5" /></button>
                  <span className="text-sm font-medium">{cart[p.id]} in mandje</span>
                  <button type="button" aria-label="Meer" onClick={() => add(p.id, 1)} className="grid size-7 place-items-center rounded-full bg-white/10"><Plus className="size-3.5" /></button>
                </div>
              ) : (
                <button type="button" onClick={() => add(p.id, 1)} className="mt-3 w-full rounded-full border border-[#3B2A20]/20 py-2 text-sm font-medium transition hover:bg-[#3B2A20] hover:text-[#FBF6EE]">
                  Toevoegen
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={() => setOpen(false)}>
          <div className="animate-fadeup flex h-full w-full max-w-md flex-col bg-[#FBF6EE] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#3B2A20]/10 p-5">
              <h2 className="font-serif text-2xl font-semibold">{step === "done" ? "Bedankt!" : "Je bestelling"}</h2>
              <button type="button" aria-label="Sluiten" onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-full bg-[#3B2A20]/5"><X className="size-4" /></button>
            </div>

            {step === "done" ? (
              <div className="flex-1 p-6 text-center">
                <span className="mx-auto grid size-16 place-items-center rounded-full bg-[#E2703A] text-white"><Check className="size-8" /></span>
                <p className="mt-5 font-serif text-xl">Bestelling {order} staat morgen om {slot} klaar</p>
                <p className="mt-2 text-sm text-[#3B2A20]/60">Korrel {shop} · Noem je naam{name ? ` (${name})` : ""} bij de kassa.</p>
                <div className="mx-auto mt-6 grid w-32 grid-cols-6 gap-1" aria-hidden>
                  {Array.from({ length: 36 }, (_, i) => (
                    <span key={i} className={`aspect-square ${(i * 7 + (i % 5)) % 3 ? "bg-[#3B2A20]" : "bg-transparent"}`} />
                  ))}
                </div>
                <button type="button" onClick={() => { setStep("cart"); setCart({}); setOpen(false); }} className="mt-8 text-sm underline underline-offset-4">Nieuwe bestelling</button>
              </div>
            ) : (
              <>
                <div className="flex-1 space-y-5 overflow-y-auto p-5">
                  {items.length === 0 && <p className="text-sm text-[#3B2A20]/60">Je mandje is leeg.</p>}
                  {items.map(([id, q]) => {
                    const p = PRODUCTS.find((x) => x.id === id)!;
                    return (
                      <div key={id} className="flex items-center gap-3">
                        <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-[#F1E2CC] p-2"><Bread shape={p.shape} tone={p.tone} /></span>
                        <span className="flex-1">
                          <span className="block text-sm font-medium">{p.name}</span>
                          <span className="text-xs text-[#3B2A20]/55">{q} × {eur(p.price)}</span>
                        </span>
                        <span className="flex items-center gap-2">
                          <button type="button" aria-label="Minder" onClick={() => add(id, -1)} className="grid size-7 place-items-center rounded-full bg-[#3B2A20]/5"><Minus className="size-3" /></button>
                          <button type="button" aria-label="Meer" onClick={() => add(id, 1)} className="grid size-7 place-items-center rounded-full bg-[#3B2A20]/5"><Plus className="size-3" /></button>
                        </span>
                      </div>
                    );
                  })}

                  <div>
                    <p className="flex items-center gap-1.5 text-sm font-medium"><Clock className="size-4" /> Ophalen morgen bij Korrel {shop}</p>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {SLOTS.map((s) => (
                        <button
                          key={s.t}
                          type="button"
                          disabled={s.left === 0}
                          onClick={() => setSlot(s.t)}
                          className={`rounded-xl border py-2 text-sm ${slot === s.t ? "border-[#E2703A] bg-[#E2703A] text-white" : "border-[#3B2A20]/15"} disabled:opacity-35`}
                        >
                          {s.t}
                          <span className="block text-[10px] opacity-70">{s.left === 0 ? "vol" : s.left < 4 ? `nog ${s.left}` : "ruim"}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {step === "checkout" && (
                    <div className="animate-fadeup space-y-3">
                      <label className="block text-xs text-[#3B2A20]/60">
                        Naam voor de bestelling
                        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Anna" className="mt-1 w-full rounded-xl border border-[#3B2A20]/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#E2703A]" />
                      </label>
                      <label className="block text-xs text-[#3B2A20]/60">
                        E-mail voor je bevestiging
                        <input type="email" placeholder="anna@voorbeeld.nl" className="mt-1 w-full rounded-xl border border-[#3B2A20]/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#E2703A]" />
                      </label>
                    </div>
                  )}
                </div>
                <div className="border-t border-[#3B2A20]/10 p-5">
                  <div className="flex justify-between font-medium">
                    <span>Totaal</span>
                    <span>{eur(total)}</span>
                  </div>
                  <button
                    type="button"
                    disabled={items.length === 0}
                    onClick={() => (step === "cart" ? setStep("checkout") : setStep("done"))}
                    className="mt-4 w-full rounded-full bg-[#E2703A] py-3.5 font-medium text-white transition hover:brightness-105 disabled:opacity-40"
                  >
                    {step === "cart" ? "Afrekenen" : `Betalen · ${eur(total)}`}
                  </button>
                  <p className="mt-2 text-center text-[11px] text-[#3B2A20]/45">Demo: er wordt niets afgeschreven.</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Simple illustrated bakes, drawn in SVG so the demo needs no photos. */
function Bread({ shape, tone }: { shape: Shape; tone: string }) {
  const id = `g-${shape}`;
  const grad = (
    <defs>
      <radialGradient id={id} cx="40%" cy="35%" r="75%">
        <stop offset="0%" stopColor="#F6D29C" />
        <stop offset="55%" stopColor={tone} />
        <stop offset="100%" stopColor="#5A3820" />
      </radialGradient>
    </defs>
  );
  const score = { fill: "none", stroke: "#F7DDB0", strokeWidth: 3, strokeLinecap: "round" as const, opacity: 0.85 };
  switch (shape) {
    case "round":
      return (
        <svg viewBox="0 0 120 100" className="w-full drop-shadow-xl">{grad}
          <ellipse cx="60" cy="55" rx="54" ry="40" fill={`url(#${id})`} />
          <path d="M30 40 Q60 20 92 42" {...score} /><path d="M26 56 Q60 36 96 58" {...score} />
        </svg>
      );
    case "batard":
      return (
        <svg viewBox="0 0 140 80" className="w-full drop-shadow-xl">{grad}
          <ellipse cx="70" cy="42" rx="64" ry="32" fill={`url(#${id})`} />
          <path d="M28 40 L112 40" {...score} strokeWidth={4} />
          {[40, 58, 76, 94].map((x) => <circle key={x} cx={x} cy={30 + (x % 3) * 6} r="3" fill="#5A3820" opacity="0.6" />)}
        </svg>
      );
    case "baguette":
      return (
        <svg viewBox="0 0 200 60" className="w-full drop-shadow-xl">{grad}
          <rect x="6" y="14" width="188" height="34" rx="17" fill={`url(#${id})`} />
          {[40, 75, 110, 145].map((x) => <path key={x} d={`M${x} 22 L${x + 24} 38`} {...score} />)}
        </svg>
      );
    case "loaf":
      return (
        <svg viewBox="0 0 130 100" className="w-full drop-shadow-xl">{grad}
          <path d="M12 90 V48 Q12 14 65 14 Q118 14 118 48 V90 Z" fill={`url(#${id})`} />
          <path d="M30 40 Q65 24 100 40" {...score} />
          {[30, 50, 70, 90].map((x) => <circle key={x} cx={x} cy={60 + (x % 4) * 3} r="2" fill="#F7DDB0" opacity="0.6" />)}
        </svg>
      );
    case "croissant":
      return (
        <svg viewBox="0 0 140 90" className="w-full drop-shadow-xl">{grad}
          <path d="M10 60 Q20 18 70 14 Q120 18 130 60 Q118 52 104 58 Q92 34 70 32 Q48 34 36 58 Q22 52 10 60Z" fill={`url(#${id})`} />
          {[46, 70, 94].map((x) => <path key={x} d={`M${x} 22 Q${x + (x - 70) * 0.2} 40 ${x + (x - 70) * 0.3} 54`} {...score} strokeWidth={2.5} />)}
        </svg>
      );
    case "bun":
      return (
        <svg viewBox="0 0 110 100" className="w-full drop-shadow-xl">{grad}
          <circle cx="55" cy="52" r="44" fill={`url(#${id})`} />
          <path d="M55 52 m0 -6 a6 6 0 1 1 -6 6 a12 12 0 1 1 12 12 a20 20 0 1 1 -20 -20 a28 28 0 1 1 28 28" {...score} strokeWidth={4} />
        </svg>
      );
    case "pie":
      return (
        <svg viewBox="0 0 120 100" className="w-full drop-shadow-xl">{grad}
          <ellipse cx="60" cy="56" rx="56" ry="38" fill="#7A4A26" />
          <ellipse cx="60" cy="50" rx="54" ry="36" fill={`url(#${id})`} />
          {[-30, -10, 10, 30].map((d) => <path key={d} d={`M${60 + d} 16 L${60 + d * 0.6} 84`} {...score} strokeWidth={5} />)}
          {[-20, 0, 20].map((d) => <path key={d} d={`M10 ${50 + d} L110 ${50 + d}`} {...score} strokeWidth={5} />)}
        </svg>
      );
    case "cake":
      return (
        <svg viewBox="0 0 120 100" className="w-full drop-shadow-xl">
          <ellipse cx="60" cy="74" rx="54" ry="18" fill="#B98552" />
          <rect x="6" y="36" width="108" height="38" fill="#F6EBDD" />
          <ellipse cx="60" cy="36" rx="54" ry="18" fill="#C2223B" />
          {[[34, 32], [60, 26], [86, 34], [48, 40], [74, 42]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="5" fill="#8E1029" />)}
        </svg>
      );
  }
}
