"use client";

import { useMemo, useState } from "react";
import { Anchor, CalendarDays, Check, ChevronRight, Droplets, Loader2, Lock, MapPin, Ruler, ShowerHead, Wifi, Zap } from "lucide-react";

type Berth = { id: string; jetty: string; length: number; depth: number; taken: boolean };

const JETTIES = ["A", "B", "C"] as const;
const BERTHS: Berth[] = JETTIES.flatMap((j, ji) =>
  Array.from({ length: 10 }, (_, i) => {
    const length = [8, 8, 10, 10, 12, 12, 14, 14, 16, 18][i]!;
    const taken = [[1, 4, 7], [0, 3, 5, 9], [2, 6]][ji]!.includes(i);
    return { id: `${j}${i + 1}`, jetty: j, length, depth: 1.8 + ji * 0.4 + (i > 6 ? 0.4 : 0), taken };
  }),
);

const PRICE_PER_M = 2.4; // per metre per night
const TOURIST_TAX = 1.35; // per person per night

const fmt = (n: number) => n.toLocaleString("nl-NL", { style: "currency", currency: "EUR" });
const today = new Date();
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

export function KadeboekApp() {
  const [arrive, setArrive] = useState(iso(addDays(today, 3)));
  const [leave, setLeave] = useState(iso(addDays(today, 5)));
  const [boat, setBoat] = useState(11.5);
  const [draught, setDraught] = useState(1.6);
  const [people, setPeople] = useState(2);
  const [chosen, setChosen] = useState<string | null>("B5");
  const [step, setStep] = useState<"pick" | "details" | "paying" | "done">("pick");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [vessel, setVessel] = useState("");

  const nights = Math.max(1, Math.round((new Date(leave).getTime() - new Date(arrive).getTime()) / 86400000));
  const fits = (b: Berth) => !b.taken && b.length >= boat && b.depth >= draught + 0.3;
  const berth = BERTHS.find((b) => b.id === chosen);
  const valid = berth && fits(berth);
  const harbour = nights * boat * PRICE_PER_M;
  const tax = nights * people * TOURIST_TAX;
  const total = harbour + tax;
  const freeCount = useMemo(() => BERTHS.filter(fits).length, [boat, draught]); // eslint-disable-line react-hooks/exhaustive-deps
  const code = useMemo(() => `KB-${Math.floor(100000 + Math.random() * 899999)}`, []);
  const gate = useMemo(() => String(Math.floor(1000 + Math.random() * 8999)), []);

  const pay = () => {
    setStep("paying");
    setTimeout(() => setStep("done"), 1400);
  };

  return (
    <div className="min-h-screen bg-[#F5F3EE] text-[#0B2545]">
      <header className="border-b border-[#0B2545]/10 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg bg-[#0B2545] text-white">
              <Anchor className="size-4" />
            </span>
            <div className="leading-tight">
              <p className="font-display text-[15px] font-semibold">Kadeboek</p>
              <p className="text-[11px] text-[#0B2545]/60">Jachthaven De Kaap</p>
            </div>
          </div>
          <nav className="hidden items-center gap-7 text-sm text-[#0B2545]/70 md:flex">
            <span className="text-[#0B2545]">Ligplaats boeken</span>
            <span>Faciliteiten</span>
            <span>Haveninformatie</span>
            <span>Contact</span>
          </nav>
          <span className="rounded-full border border-[#0B2545]/15 px-3 py-1.5 text-xs">VHF 31 · 06 12 34 56 78</span>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[#0B2545] text-white">
        <svg className="absolute inset-x-0 bottom-0 h-24 w-full opacity-20" viewBox="0 0 1200 100" preserveAspectRatio="none" aria-hidden>
          <path d="M0 60 Q150 20 300 60 T600 60 T900 60 T1200 60 V100 H0Z" fill="#13A8A8" />
          <path d="M0 75 Q150 45 300 75 T600 75 T900 75 T1200 75 V100 H0Z" fill="#13A8A8" opacity="0.6" />
        </svg>
        <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-12 md:pb-24 md:pt-16">
          <p className="flex items-center gap-2 text-sm text-white/70">
            <MapPin className="size-4" /> Kaapstraat 2, Harlingen · 180 ligplaatsen
          </p>
          <h1 className="mt-4 max-w-2xl font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            Direct een ligplaats. Zonder bellen.
          </h1>
          <p className="mt-4 max-w-xl text-white/75">Kies je data en je boot, zie welke plekken passen en betaal meteen. Je toegangscode staat in je bevestiging.</p>

          <div className="mt-8 grid gap-3 rounded-2xl bg-white p-3 text-[#0B2545] shadow-2xl md:grid-cols-5 md:p-4">
            <Field icon={<CalendarDays className="size-4" />} label="Aankomst">
              <input type="date" value={arrive} min={iso(today)} onChange={(e) => setArrive(e.target.value)} className="w-full bg-transparent text-sm font-medium outline-none" />
            </Field>
            <Field icon={<CalendarDays className="size-4" />} label="Vertrek">
              <input type="date" value={leave} min={arrive} onChange={(e) => setLeave(e.target.value)} className="w-full bg-transparent text-sm font-medium outline-none" />
            </Field>
            <Field icon={<Ruler className="size-4" />} label="Bootlengte">
              <select value={boat} onChange={(e) => setBoat(Number(e.target.value))} className="w-full bg-transparent text-sm font-medium outline-none">
                {[7, 8.5, 10, 11.5, 13, 15, 17].map((l) => (
                  <option key={l} value={l}>{l.toLocaleString("nl-NL")} m</option>
                ))}
              </select>
            </Field>
            <Field icon={<Droplets className="size-4" />} label="Diepgang">
              <select value={draught} onChange={(e) => setDraught(Number(e.target.value))} className="w-full bg-transparent text-sm font-medium outline-none">
                {[1.2, 1.6, 2.0, 2.4].map((d) => (
                  <option key={d} value={d}>{d.toLocaleString("nl-NL")} m</option>
                ))}
              </select>
            </Field>
            <div className="flex items-center justify-between rounded-xl bg-[#13A8A8]/10 px-4 py-2.5 md:flex-col md:items-start md:justify-center">
              <span className="text-xs text-[#0B2545]/60">Beschikbaar</span>
              <span className="font-display text-lg font-semibold text-[#0E7C7C]">{freeCount} plekken</span>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto grid max-w-6xl gap-6 px-5 py-10 lg:grid-cols-[1.6fr_1fr]">
        <section className="rounded-2xl bg-white p-5 shadow-sm md:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold">Kies je plek</h2>
              <p className="mt-1 text-sm text-[#0B2545]/60">Plekken die passen bij {boat.toLocaleString("nl-NL")} m en {draught.toLocaleString("nl-NL")} m diepgang zijn gemarkeerd.</p>
            </div>
            <div className="flex gap-4 text-xs text-[#0B2545]/70">
              <Legend className="border-[#13A8A8] bg-[#13A8A8]/15">Past</Legend>
              <Legend className="border-[#0B2545]/10 bg-[#0B2545]/10">Bezet</Legend>
              <Legend className="border-[#0B2545]/10 bg-white">Te klein</Legend>
            </div>
          </div>

          <div className="mt-6 space-y-6 overflow-x-auto pb-2">
            {JETTIES.map((j) => (
              <div key={j} className="min-w-[520px]">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[#0B2545]/50">Steiger {j}</p>
                <div className="relative">
                  <div className="absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 rounded bg-[#C9B99A]" />
                  <div className="relative grid grid-cols-10 gap-1.5">
                    {BERTHS.filter((b) => b.jetty === j).map((b) => {
                      const ok = fits(b);
                      const sel = chosen === b.id;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          disabled={!ok}
                          onClick={() => setChosen(b.id)}
                          className={`flex h-16 flex-col items-center justify-center rounded-lg border-2 text-[11px] transition ${
                            sel
                              ? "border-[#0B2545] bg-[#0B2545] text-white shadow-lg"
                              : ok
                                ? "border-[#13A8A8] bg-[#E6F6F6] hover:-translate-y-0.5 hover:shadow"
                                : b.taken
                                  ? "cursor-not-allowed border-transparent bg-[#E3E1DC] text-[#0B2545]/40"
                                  : "cursor-not-allowed border-[#0B2545]/10 bg-white text-[#0B2545]/30"
                          }`}
                        >
                          <span className="font-semibold">{b.id}</span>
                          <span>{b.length} m</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {[
              [<Zap key="z" className="size-4" />, "Walstroom 16A"],
              [<ShowerHead key="s" className="size-4" />, "Sanitair 24/7"],
              [<Wifi key="w" className="size-4" />, "Gratis wifi"],
              [<Droplets key="d" className="size-4" />, "Drinkwater"],
            ].map(([icon, label], i) => (
              <div key={i} className="flex items-center gap-2 rounded-xl bg-[#F5F3EE] px-3 py-2.5 text-[#0B2545]/80">
                {icon}
                {label}
              </div>
            ))}
          </div>
        </section>

        <aside className="h-fit rounded-2xl bg-white p-5 shadow-sm md:p-7 lg:sticky lg:top-6">
          {step === "done" ? (
            <div className="animate-fadeup text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-full bg-[#13A8A8] text-white">
                <Check className="size-7" />
              </span>
              <h2 className="mt-4 font-display text-2xl font-semibold">Je ligplaats is geboekt</h2>
              <p className="mt-2 text-sm text-[#0B2545]/60">We hebben de bevestiging gestuurd naar {email || "je e-mailadres"}.</p>
              <dl className="mt-6 space-y-3 rounded-xl bg-[#F5F3EE] p-4 text-left text-sm">
                <Row k="Boekingsnummer" v={code} />
                <Row k="Ligplaats" v={`Steiger ${berth?.jetty} · ${berth?.id}`} />
                <Row k="Aankomst" v={new Date(arrive).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "long" })} />
                <Row k="Toegangscode hek" v={gate} strong />
              </dl>
              <button type="button" onClick={() => setStep("pick")} className="mt-6 text-sm font-medium text-[#0E7C7C] underline underline-offset-4">
                Nog een boeking maken
              </button>
            </div>
          ) : (
            <>
              <h2 className="font-display text-xl font-semibold">Je boeking</h2>
              {valid ? (
                <p className="mt-1 text-sm text-[#0B2545]/60">
                  Steiger {berth.jetty} · plek {berth.id} · max {berth.length} m
                </p>
              ) : (
                <p className="mt-1 text-sm text-amber-700">Kies een gemarkeerde plek op de kaart.</p>
              )}

              <dl className="mt-5 space-y-2.5 border-y border-[#0B2545]/10 py-5 text-sm">
                <Row k={`Liggeld · ${nights} ${nights === 1 ? "nacht" : "nachten"} × ${boat.toLocaleString("nl-NL")} m`} v={fmt(harbour)} />
                <div className="flex items-center justify-between">
                  <dt className="text-[#0B2545]/60">Toeristenbelasting</dt>
                  <dd className="flex items-center gap-2">
                    <button type="button" aria-label="Minder personen" onClick={() => setPeople(Math.max(1, people - 1))} className="grid size-6 place-items-center rounded-full border border-[#0B2545]/15">−</button>
                    <span className="w-16 text-center">{people} pers.</span>
                    <button type="button" aria-label="Meer personen" onClick={() => setPeople(Math.min(8, people + 1))} className="grid size-6 place-items-center rounded-full border border-[#0B2545]/15">+</button>
                  </dd>
                </div>
                <Row k="" v={fmt(tax)} />
              </dl>
              <div className="flex items-baseline justify-between py-4">
                <span className="font-medium">Totaal</span>
                <span className="font-display text-2xl font-semibold">{fmt(total)}</span>
              </div>

              {step === "pick" ? (
                <button
                  type="button"
                  disabled={!valid}
                  onClick={() => setStep("details")}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0B2545] py-3.5 text-sm font-semibold text-white transition hover:bg-[#13315C] disabled:opacity-40"
                >
                  Verder naar gegevens <ChevronRight className="size-4" />
                </button>
              ) : (
                <form
                  className="animate-fadeup space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    pay();
                  }}
                >
                  <Input label="Naam" value={name} onChange={setName} placeholder="Jan de Vries" />
                  <Input label="E-mail" type="email" value={email} onChange={setEmail} placeholder="jan@voorbeeld.nl" />
                  <Input label="Naam boot" value={vessel} onChange={setVessel} placeholder="Zeezwaluw" />
                  <button
                    type="submit"
                    disabled={step === "paying"}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#CC0066] py-3.5 text-sm font-semibold text-white transition hover:brightness-110"
                  >
                    {step === "paying" ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
                    {step === "paying" ? "Betaling verwerken…" : `Betalen met iDEAL · ${fmt(total)}`}
                  </button>
                  <p className="text-center text-[11px] text-[#0B2545]/50">Demo: er wordt niets afgeschreven.</p>
                </form>
              )}
            </>
          )}
        </aside>
      </main>

      <footer className="border-t border-[#0B2545]/10 py-8 text-center text-xs text-[#0B2545]/50">
        Jachthaven De Kaap · Havenkantoor dagelijks 08:00–20:00
      </footer>
    </div>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 rounded-xl border border-[#0B2545]/10 px-4 py-2.5">
      <span className="flex items-center gap-1.5 text-xs text-[#0B2545]/60">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}

function Legend({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`size-3 rounded border-2 ${className}`} />
      {children}
    </span>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-[#0B2545]/60">{k}</dt>
      <dd className={strong ? "font-display text-lg font-semibold tracking-[0.2em]" : "font-medium"}>{v}</dd>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block text-xs text-[#0B2545]/60">
      {label}
      <input
        required
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-[#0B2545]/15 bg-white px-3 py-2.5 text-sm text-[#0B2545] outline-none focus:border-[#13A8A8]"
      />
    </label>
  );
}
