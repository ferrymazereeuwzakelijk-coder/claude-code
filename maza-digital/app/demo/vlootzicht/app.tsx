"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Anchor, Bell, Calendar, FileCheck2, Gauge, LayoutDashboard, Ship, Wrench, X } from "lucide-react";

type Vessel = {
  id: string;
  name: string;
  type: string;
  status: "Varend" | "Laden" | "Lossen" | "Ligt stil";
  route: [string, string];
  cargo: string;
  load: number;
  eta: string;
  path: number; // which river path
  speed: number;
  certs: { name: string; days: number }[];
  maintenance: string;
};

const VESSELS: Vessel[] = [
  { id: "1", name: "MS Rijnstroom", type: "Motorvrachtschip · 110 m", status: "Varend", route: ["Rotterdam", "Duisburg"], cargo: "Containers (96 TEU)", load: 86, eta: "Vandaag 21:40", path: 0, speed: 0.018, certs: [{ name: "Certificaat van onderzoek", days: 14 }, { name: "ADN-certificaat", days: 210 }], maintenance: "Motorrevisie gepland wk 30" },
  { id: "2", name: "MS Waaldelta", type: "Tanker · 86 m", status: "Varend", route: ["Moerdijk", "Nijmegen"], cargo: "Gasolie 1.850 t", load: 92, eta: "Morgen 06:15", path: 1, speed: 0.012, certs: [{ name: "Certificaat van onderzoek", days: 340 }, { name: "ADN-certificaat", days: 26 }], maintenance: "Geen openstaande punten" },
  { id: "3", name: "MS IJsselvaart", type: "Motorvrachtschip · 80 m", status: "Lossen", route: ["Amsterdam", "Kampen"], cargo: "Zand 1.200 t", load: 64, eta: "Gearriveerd", path: 2, speed: 0, certs: [{ name: "Certificaat van onderzoek", days: 190 }], maintenance: "Boegschroef storing gemeld" },
  { id: "4", name: "MS Maasland", type: "Duwbak-combinatie · 135 m", status: "Varend", route: ["Rotterdam", "Maastricht"], cargo: "Staal 2.400 t", load: 78, eta: "Do 14:00", path: 3, speed: 0.01, certs: [{ name: "Certificaat van onderzoek", days: 95 }], maintenance: "Geen openstaande punten" },
  { id: "5", name: "MS Lekzicht", type: "Motorvrachtschip · 95 m", status: "Laden", route: ["Antwerpen", "Utrecht"], cargo: "Graan (laden)", load: 41, eta: "Vertrek 16:30", path: 4, speed: 0, certs: [{ name: "Certificaat van onderzoek", days: 410 }], maintenance: "Geen openstaande punten" },
  { id: "6", name: "MS Nooitgedacht", type: "Motorvrachtschip · 70 m", status: "Ligt stil", route: ["Werkendam", "—"], cargo: "Leeg", load: 0, eta: "Werf tot vr", path: 4, speed: 0, certs: [{ name: "Certificaat van onderzoek", days: 60 }], maintenance: "Werfbeurt: romp conserveren" },
];

// Simplified waterways (not to scale).
const PATHS = [
  "M40 300 C120 290 180 270 260 262 S400 250 470 228 S560 210 610 190",
  "M70 340 C150 330 230 300 300 290 S420 300 500 290",
  "M210 110 C260 150 300 170 340 190 S420 200 460 160",
  "M40 300 C120 320 220 360 320 380 S430 430 470 470",
  "M30 380 C110 360 170 330 250 300",
];

export function VlootzichtApp() {
  const [t, setT] = useState(0);
  const [open, setOpen] = useState<Vessel | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const loop = () => {
      setT((v) => v + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const hours = [362, 388, 401, 375, 420, 398, 412];
  const max = 450;
  const expiring = VESSELS.flatMap((v) => v.certs.filter((c) => c.days <= 30).map((c) => ({ v, c })));

  return (
    <div className="flex min-h-screen bg-[#EEF1F5] text-[#0F172A]">
      <aside className="hidden w-56 shrink-0 flex-col bg-[#0F172A] p-4 text-white md:flex">
        <div className="flex items-center gap-2 px-2">
          <Anchor className="size-5 text-[#38BDF8]" />
          <span className="font-display text-lg font-semibold">Vlootzicht</span>
        </div>
        <p className="mt-1 px-2 text-[11px] text-white/40">Rederij Van Dijk & Zn.</p>
        <nav className="mt-8 space-y-1 text-sm">
          {[
            [LayoutDashboard, "Overzicht", true],
            [Ship, "Schepen", false],
            [Calendar, "Reisplanning", false],
            [FileCheck2, "Certificaten", false],
            [Wrench, "Onderhoud", false],
          ].map(([I, l, a]) => {
            const Icon = I as typeof Ship;
            return (
              <span key={l as string} className={`flex items-center gap-2.5 rounded-lg px-3 py-2 ${a ? "bg-white/10 text-white" : "text-white/55"}`}>
                <Icon className="size-4" /> {l as string}
              </span>
            );
          })}
        </nav>
      </aside>

      <main className="min-w-0 flex-1 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold">Goedemiddag, Linda</h1>
            <p className="text-sm text-[#0F172A]/55">{VESSELS.filter((v) => v.status === "Varend").length} van {VESSELS.length} schepen onderweg</p>
          </div>
          <span className="relative grid size-10 place-items-center rounded-full bg-white shadow-sm">
            <Bell className="size-4" />
            <span className="absolute right-2 top-2 size-2 rounded-full bg-red-500" />
          </span>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ["Onderweg", `${VESSELS.filter((v) => v.status === "Varend").length} / ${VESSELS.length}`, Ship, "text-[#0EA5E9]"],
            ["Gem. belading", `${Math.round(VESSELS.reduce((s, v) => s + v.load, 0) / VESSELS.length)}%`, Gauge, "text-[#6366F1]"],
            ["Vaaruren deze week", "2.756", Calendar, "text-[#0F172A]"],
            ["Certificaten < 30 dagen", String(expiring.length), AlertTriangle, "text-amber-500"],
          ].map(([label, value, I, c]) => {
            const Icon = I as typeof Ship;
            return (
              <div key={label as string} className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="flex items-center gap-1.5 text-xs text-[#0F172A]/55">
                  <Icon className={`size-3.5 ${c as string}`} /> {label as string}
                </p>
                <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{value as string}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
          <section className="relative overflow-hidden rounded-2xl bg-[#0B1324] p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-white/50">Live posities</p>
            <svg viewBox="0 0 640 500" className="mt-2 h-auto w-full">
              <defs>
                <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
                  <path d="M32 0H0V32" fill="none" stroke="white" strokeOpacity="0.04" />
                </pattern>
              </defs>
              <rect width="640" height="500" fill="url(#grid)" />
              <path d="M0 0 H180 C150 80 120 160 60 230 C40 260 20 270 0 280Z" fill="#13213D" />
              {PATHS.map((d, i) => (
                <path key={i} id={`river-${i}`} d={d} fill="none" stroke="#1E3A5F" strokeWidth={i === 0 ? 9 : 6} strokeLinecap="round" />
              ))}
              {[
                ["Rotterdam", 40, 300],
                ["Duisburg", 610, 185],
                ["Nijmegen", 500, 288],
                ["Kampen", 460, 155],
                ["Amsterdam", 210, 105],
                ["Maastricht", 470, 470],
              ].map(([n, x, y]) => (
                <g key={n as string}>
                  <circle cx={x as number} cy={y as number} r="3" fill="white" opacity="0.6" />
                  <text x={(x as number) + 8} y={(y as number) - 8} fill="white" fillOpacity="0.55" fontSize="13">{n as string}</text>
                </g>
              ))}
              {VESSELS.map((v, i) => {
                const progress = v.speed ? ((t * v.speed * 0.05 + i * 0.17) % 1) : [0, 0, 0.98, 0, 0.1, 0.5][i]!;
                return (
                  <VesselDot key={v.id} pathId={`river-${v.path}`} d={PATHS[v.path]!} progress={progress} active={open?.id === v.id} moving={v.speed > 0} onClick={() => setOpen(v)} label={v.name.replace("MS ", "")} />
                );
              })}
            </svg>
          </section>

          <div className="grid gap-4">
            <section className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#0F172A]/45">Aandacht nodig</p>
              <ul className="mt-3 space-y-2">
                {expiring.map(({ v, c }) => (
                  <li key={v.id + c.name} className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                    <span>
                      <span className="font-medium">{v.name}</span>: {c.name} verloopt over {c.days} dagen
                    </span>
                  </li>
                ))}
                <li className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm">
                  <Wrench className="mt-0.5 size-4 shrink-0 text-red-500" />
                  <span>
                    <span className="font-medium">MS IJsselvaart</span>: boegschroef storing gemeld
                  </span>
                </li>
              </ul>
            </section>
            <section className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#0F172A]/45">Vaaruren per dag</p>
              <div className="mt-4 flex h-28 gap-2">
                {hours.map((h, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1">
                    <div className={`w-full rounded-t-md ${i === hours.length - 1 ? "bg-[#0EA5E9]" : "bg-[#0EA5E9]/30"}`} style={{ height: `${(h / max) * 85}%` }} />
                    <span className="text-[10px] text-[#0F172A]/45">{["ma", "di", "wo", "do", "vr", "za", "zo"][i]}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        <section className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-[#F8FAFC] text-left text-xs text-[#0F172A]/50">
                <tr>
                  {["Schip", "Status", "Route", "Lading", "Belading", "ETA"].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {VESSELS.map((v) => (
                  <tr key={v.id} onClick={() => setOpen(v)} className="cursor-pointer border-t border-black/5 hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3 font-medium">{v.name}</td>
                    <td className="px-4 py-3"><Status s={v.status} /></td>
                    <td className="px-4 py-3 text-[#0F172A]/70">{v.route[0]} → {v.route[1]}</td>
                    <td className="px-4 py-3 text-[#0F172A]/70">{v.cargo}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 rounded-full bg-black/5"><div className="h-full rounded-full bg-[#6366F1]" style={{ width: `${v.load}%` }} /></div>
                        <span className="tabular-nums text-xs">{v.load}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#0F172A]/70">{v.eta}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={() => setOpen(null)}>
          <div className="animate-fadeup h-full w-full max-w-sm overflow-y-auto bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-display text-2xl font-semibold">{open.name}</h2>
                <p className="text-sm text-[#0F172A]/55">{open.type}</p>
              </div>
              <button type="button" aria-label="Sluiten" onClick={() => setOpen(null)} className="grid size-9 place-items-center rounded-full bg-black/5"><X className="size-4" /></button>
            </div>
            <div className="mt-4"><Status s={open.status} /></div>
            <dl className="mt-6 space-y-3 text-sm">
              {[
                ["Route", `${open.route[0]} → ${open.route[1]}`],
                ["Lading", open.cargo],
                ["Belading", `${open.load}%`],
                ["ETA", open.eta],
                ["Onderhoud", open.maintenance],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-black/5 pb-3">
                  <dt className="text-[#0F172A]/55">{k}</dt>
                  <dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-[#0F172A]/45">Certificaten</p>
            <ul className="mt-2 space-y-2">
              {open.certs.map((c) => (
                <li key={c.name} className="flex items-center justify-between rounded-lg bg-[#F8FAFC] p-3 text-sm">
                  {c.name}
                  <span className={`rounded-full px-2 py-0.5 text-xs ${c.days <= 30 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                    {c.days <= 30 ? `${c.days} dagen` : "Op orde"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function Status({ s }: { s: Vessel["status"] }) {
  const c = { Varend: "bg-sky-100 text-sky-700", Laden: "bg-indigo-100 text-indigo-700", Lossen: "bg-violet-100 text-violet-700", "Ligt stil": "bg-slate-100 text-slate-600" }[s];
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${c}`}>{s}</span>;
}

/** A vessel marker placed along a waterway path. */
function VesselDot({ d, progress, active, moving, onClick, label }: { pathId: string; d: string; progress: number; active: boolean; moving: boolean; onClick: () => void; label: string }) {
  const [pt, setPt] = useState<[number, number]>([0, 0]);
  const [el, setEl] = useState<SVGPathElement | null>(null);
  useEffect(() => {
    if (!el) return;
    const p = el.getPointAtLength(el.getTotalLength() * progress);
    setPt([p.x, p.y]);
  }, [el, progress]);
  return (
    <g onClick={onClick} className="cursor-pointer">
      <path ref={setEl} d={d} fill="none" stroke="none" />
      {moving && <circle cx={pt[0]} cy={pt[1]} r="14" fill="#38BDF8" opacity="0.15" />}
      <circle cx={pt[0]} cy={pt[1]} r={active ? 8 : 6} fill={moving ? "#38BDF8" : "#94A3B8"} stroke="white" strokeWidth="2" />
      <text x={pt[0] + 10} y={pt[1] + 18} fill="white" fontSize="12" fontWeight="600">{label}</text>
    </g>
  );
}
