"use client";

import { useState } from "react";
import { AlertTriangle, BarChart3, Check, Clock, FileText, Inbox, Loader2, Settings, Sparkles, Users } from "lucide-react";

type Line = { product: string; sku: string; qty: number; price: number };
type Mail = {
  id: number;
  from: string;
  company: string;
  subject: string;
  time: string;
  body: string;
  extracted: { label: string; value: string; confidence: number }[];
  lines: Line[];
  delivery: string;
  warning?: string;
};

const MAILS: Mail[] = [
  {
    id: 1,
    from: "Peter de Vries",
    company: "Bouwbedrijf De Vries",
    subject: "Aanvraag pallets + folie",
    time: "08:12",
    body: "Goedemorgen,\n\nVoor ons project in Kampen hebben we nodig: 40 europallets (1200x800) en 6 rollen stretchfolie. Levering graag in week 27 op de bouwplaats, Oranjelaan 4.\n\nGroet,\nPeter de Vries",
    extracted: [
      { label: "Klant", value: "Bouwbedrijf De Vries", confidence: 0.99 },
      { label: "Contactpersoon", value: "Peter de Vries", confidence: 0.98 },
      { label: "Afleveradres", value: "Oranjelaan 4, Kampen", confidence: 0.93 },
      { label: "Gewenste levering", value: "Week 27", confidence: 0.96 },
    ],
    lines: [
      { product: "Europallet 1200×800", sku: "EP-1208", qty: 40, price: 12.5 },
      { product: "Stretchfolie 23 µm, 500 mm", sku: "SF-2350", qty: 6, price: 18.9 },
    ],
    delivery: "Week 27",
  },
  {
    id: 2,
    from: "Sanne Mulder",
    company: "Groenrijk Tuincentrum",
    subject: "Offerte dozen voor webshop",
    time: "09:47",
    body: "Hoi!\n\nKunnen jullie een prijs geven voor verzenddozen? We denken aan zo'n 500 stuks van 40x30x20, en dan ook nog wat kleinere, misschien 200? Liefst zo snel mogelijk.\n\nSanne",
    extracted: [
      { label: "Klant", value: "Groenrijk Tuincentrum", confidence: 0.97 },
      { label: "Contactpersoon", value: "Sanne Mulder", confidence: 0.99 },
      { label: "Gewenste levering", value: "Zo snel mogelijk", confidence: 0.88 },
    ],
    lines: [
      { product: "Verzenddoos 400×300×200", sku: "VD-4320", qty: 500, price: 0.84 },
      { product: "Verzenddoos 300×200×150", sku: "VD-3215", qty: 200, price: 0.61 },
    ],
    delivery: "Zo snel mogelijk",
    warning: "Afmeting van de kleinere dozen staat niet in de mail. Voorstel: 300×200×150, controleer met klant.",
  },
  {
    id: 3,
    from: "inkoop@vanderlaan.nl",
    company: "Van der Laan Logistiek",
    subject: "RE: herhaalorder",
    time: "Gisteren",
    body: "Beste,\n\nGraag dezelfde order als vorige maand: 120 pallets en 20 rollen tape. Afleveren DC Zwolle.\n\nMet vriendelijke groet,\nInkoop Van der Laan",
    extracted: [
      { label: "Klant", value: "Van der Laan Logistiek", confidence: 0.99 },
      { label: "Afleveradres", value: "DC Zwolle", confidence: 0.9 },
      { label: "Referentie", value: "Herhaalorder mei", confidence: 0.86 },
    ],
    lines: [
      { product: "Europallet 1200×800", sku: "EP-1208", qty: 120, price: 12.5 },
      { product: "Verpakkingstape bruin 48 mm", sku: "VT-4866", qty: 20, price: 2.35 },
    ],
    delivery: "Volgens afspraak",
  },
];

const eur = (n: number) => n.toLocaleString("nl-NL", { style: "currency", currency: "EUR" });

type State = "new" | "analysing" | "analysed" | "quote" | "sent";

export function StroomlijnApp() {
  const [sel, setSel] = useState(1);
  const [state, setState] = useState<Record<number, State>>({ 3: "sent" });
  const [revealed, setRevealed] = useState(0);
  const [saved, setSaved] = useState(14);
  const mail = MAILS.find((m) => m.id === sel)!;
  const st = state[sel] ?? "new";
  const subtotal = mail.lines.reduce((s, l) => s + l.qty * l.price, 0);

  const analyse = () => {
    setState({ ...state, [sel]: "analysing" });
    setRevealed(0);
    const total = mail.extracted.length + mail.lines.length;
    let n = 0;
    const tick = () => {
      n++;
      setRevealed(n);
      if (n < total) setTimeout(tick, 280);
      else setState((s) => ({ ...s, [sel]: "analysed" }));
    };
    setTimeout(tick, 600);
  };

  const select = (id: number) => {
    setSel(id);
    setRevealed(99);
  };

  return (
    <div className="flex min-h-screen bg-[#F4F5F8] text-[#1A1D29]">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-black/5 bg-white p-4 md:flex">
        <div className="flex items-center gap-2 px-2 py-1">
          <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] text-white">
            <Sparkles className="size-4" />
          </span>
          <span className="font-display text-lg font-semibold">Stroomlijn</span>
        </div>
        <nav className="mt-8 space-y-1 text-sm">
          {[
            [Inbox, "Aanvragen", true],
            [FileText, "Offertes", false],
            [Users, "Klanten", false],
            [BarChart3, "Rapportage", false],
            [Settings, "Instellingen", false],
          ].map(([Icon, label, active]) => {
            const I = Icon as typeof Inbox;
            return (
              <span key={label as string} className={`flex items-center gap-2.5 rounded-lg px-3 py-2 ${active ? "bg-[#4F46E5]/10 font-medium text-[#4F46E5]" : "text-black/55"}`}>
                <I className="size-4" />
                {label as string}
              </span>
            );
          })}
        </nav>
        <div className="mt-auto rounded-xl bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] p-4 text-white">
          <p className="flex items-center gap-1.5 text-xs text-white/80">
            <Clock className="size-3.5" /> Tijd bespaard vandaag
          </p>
          <p className="mt-1 font-display text-3xl font-semibold">{saved} min</p>
          <p className="mt-1 text-xs text-white/70">t.o.v. handmatig overtypen</p>
        </div>
      </aside>

      <section className="w-full max-w-[22rem] shrink-0 border-r border-black/5 bg-white max-lg:hidden">
        <div className="border-b border-black/5 p-4">
          <h1 className="font-display text-lg font-semibold">Aanvragen</h1>
          <p className="text-xs text-black/50">verkoop@groothandel-noord.nl</p>
        </div>
        <ul>
          {MAILS.map((m) => {
            const s = state[m.id] ?? "new";
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => select(m.id)}
                  className={`w-full border-b border-black/5 px-4 py-3.5 text-left transition ${sel === m.id ? "bg-[#4F46E5]/[0.06]" : "hover:bg-black/[0.02]"}`}
                >
                  <span className="flex items-center justify-between text-xs text-black/45">
                    <span className="font-medium text-black/80">{m.company}</span>
                    {m.time}
                  </span>
                  <span className="mt-1 block truncate text-sm">{m.subject}</span>
                  <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${s === "sent" ? "bg-emerald-100 text-emerald-700" : s === "new" ? "bg-[#4F46E5]/10 text-[#4F46E5]" : "bg-amber-100 text-amber-700"}`}>
                    {s === "sent" ? "Offerte verstuurd" : s === "new" ? "Nieuw" : "In behandeling"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <main className="grid min-w-0 flex-1 gap-5 p-4 md:p-6 xl:grid-cols-2">
        <div className="lg:hidden">
          <select value={sel} onChange={(e) => select(Number(e.target.value))} className="w-full rounded-lg border border-black/10 bg-white p-2.5 text-sm">
            {MAILS.map((m) => (
              <option key={m.id} value={m.id}>{m.company} · {m.subject}</option>
            ))}
          </select>
        </div>
        <article className="h-fit rounded-2xl bg-white p-5 shadow-sm md:p-6">
          <p className="text-xs text-black/45">Van: {mail.from} · {mail.time}</p>
          <h2 className="mt-1 font-display text-xl font-semibold">{mail.subject}</h2>
          <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-black/75">{mail.body}</p>
        </article>

        <section className="h-fit rounded-2xl bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <Sparkles className="size-4 text-[#7C3AED]" /> AI-analyse
            </h2>
            {st === "new" && (
              <button type="button" onClick={analyse} className="rounded-lg bg-[#4F46E5] px-4 py-2 text-sm font-medium text-white hover:bg-[#4338CA]">
                Analyseer aanvraag
              </button>
            )}
            {st === "analysing" && (
              <span className="flex items-center gap-2 text-sm text-[#4F46E5]">
                <Loader2 className="size-4 animate-spin" /> Bezig met lezen…
              </span>
            )}
          </div>

          {st === "new" ? (
            <p className="mt-6 rounded-xl border border-dashed border-black/10 p-6 text-center text-sm text-black/45">
              Stroomlijn leest de mail, herkent klant, producten en levering, en zet een conceptofferte klaar.
            </p>
          ) : (
            <div className="mt-5 space-y-5">
              <dl className="grid gap-2 sm:grid-cols-2">
                {mail.extracted.map((f, i) =>
                  i < revealed ? (
                    <div key={f.label} className="animate-fadeup rounded-lg bg-[#F4F5F8] px-3 py-2">
                      <dt className="flex items-center justify-between text-[11px] text-black/45">
                        {f.label}
                        <span className={f.confidence > 0.9 ? "text-emerald-600" : "text-amber-600"}>{Math.round(f.confidence * 100)}%</span>
                      </dt>
                      <dd className="text-sm font-medium">{f.value}</dd>
                    </div>
                  ) : null,
                )}
              </dl>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-black/40">Regels</p>
                <table className="w-full text-sm">
                  <tbody>
                    {mail.lines.map((l, i) =>
                      i + mail.extracted.length < revealed ? (
                        <tr key={l.sku} className="animate-fadeup border-b border-black/5">
                          <td className="py-2">
                            {l.product}
                            <span className="block text-[11px] text-black/40">{l.sku}</span>
                          </td>
                          <td className="py-2 text-right tabular-nums">{l.qty}×</td>
                          <td className="py-2 text-right tabular-nums">{eur(l.qty * l.price)}</td>
                        </tr>
                      ) : null,
                    )}
                  </tbody>
                </table>
              </div>

              {mail.warning && st !== "analysing" && (
                <p className="flex gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                  <AlertTriangle className="size-4 shrink-0" /> {mail.warning}
                </p>
              )}

              {(st === "analysed" || st === "quote" || st === "sent") && (
                <div className="animate-fadeup rounded-xl border border-black/10 p-4">
                  <div className="flex justify-between text-sm text-black/60">
                    <span>Subtotaal</span>
                    <span className="tabular-nums">{eur(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-black/60">
                    <span>Btw 21%</span>
                    <span className="tabular-nums">{eur(subtotal * 0.21)}</span>
                  </div>
                  <div className="mt-2 flex justify-between border-t border-black/10 pt-2 font-semibold">
                    <span>Totaal</span>
                    <span className="tabular-nums">{eur(subtotal * 1.21)}</span>
                  </div>
                  {st === "sent" ? (
                    <p className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-emerald-50 py-2.5 text-sm font-medium text-emerald-700">
                      <Check className="size-4" /> Offerte verstuurd naar klant
                    </p>
                  ) : (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button type="button" className="rounded-lg border border-black/10 py-2.5 text-sm font-medium">
                        Aanpassen
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setState({ ...state, [sel]: "sent" });
                          setSaved(saved + 9);
                        }}
                        className="rounded-lg bg-[#4F46E5] py-2.5 text-sm font-medium text-white hover:bg-[#4338CA]"
                      >
                        Goedkeuren & versturen
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <p className="mt-5 text-[11px] text-black/35">Demo: de analyse gebruikt vaste voorbeeldmails.</p>
        </section>
      </main>
    </div>
  );
}
