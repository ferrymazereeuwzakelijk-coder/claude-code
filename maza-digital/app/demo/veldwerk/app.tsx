"use client";

import { useEffect, useRef, useState } from "react";
import {
  Calendar,
  Camera,
  Check,
  ChevronLeft,
  ClipboardList,
  CloudOff,
  Home,
  MapPin,
  Minus,
  Navigation,
  Phone,
  Plus,
  RefreshCw,
  User,
  Wrench,
} from "lucide-react";

type Job = {
  id: number;
  time: string;
  title: string;
  customer: string;
  address: string;
  phone: string;
  note: string;
  tasks: string[];
  materials: { name: string; qty: number }[];
  done: boolean;
};

const START: Job[] = [
  {
    id: 2041,
    time: "08:30",
    title: "Onderhoud CV-ketel",
    customer: "Fam. Jansen",
    address: "Lindelaan 14, Zwolle",
    phone: "06 2345 6789",
    note: "Hond aanwezig, aanbellen bij zijdeur.",
    tasks: ["Filter vervangen", "Waterdruk controleren", "Rookgasmeting uitvoeren", "Ketel ontluchten"],
    materials: [
      { name: "Filter type B", qty: 1 },
      { name: "Afdichtring 22 mm", qty: 0 },
    ],
    done: false,
  },
  {
    id: 2042,
    time: "10:15",
    title: "Lekkage onder spoelbak",
    customer: "R. Bakker",
    address: "Assendorperstraat 88, Zwolle",
    phone: "06 9876 5432",
    note: "Klant thuis vanaf 10:00.",
    tasks: ["Lekkage lokaliseren", "Sifon vervangen", "Testen op lekkage"],
    materials: [{ name: "Sifon 40 mm", qty: 1 }],
    done: false,
  },
  {
    id: 2043,
    time: "13:00",
    title: "Thermostaat installeren",
    customer: "Kapsalon Knip",
    address: "Diezerstraat 3, Zwolle",
    phone: "038 123 4567",
    note: "Na 14:00 is de zaak druk.",
    tasks: ["Oude thermostaat demonteren", "Nieuwe thermostaat plaatsen", "App koppelen met klant"],
    materials: [{ name: "Slimme thermostaat", qty: 1 }],
    done: false,
  },
  {
    id: 2044,
    time: "15:30",
    title: "Oplevering badkamer",
    customer: "Fam. de Groot",
    address: "Veerallee 210, Zwolle",
    phone: "06 1122 3344",
    note: "Opleverpunten doorlopen met klant.",
    tasks: ["Opleverpunten doorlopen", "Kitwerk controleren", "Garantie uitleggen"],
    materials: [],
    done: false,
  },
];

export function VeldwerkApp() {
  const [jobs, setJobs] = useState(START);
  const [openId, setOpenId] = useState<number | null>(null);
  const [tab, setTab] = useState<"today" | "agenda" | "bonnen" | "profiel">("today");
  const [offline, setOffline] = useState(false);
  const open = jobs.find((j) => j.id === openId);
  const doneCount = jobs.filter((j) => j.done).length;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#E9ECF2] md:gap-16 md:p-10">
      <div className="hidden max-w-sm md:block">
        <p className="text-sm font-medium text-[#5B4BDB]">Veldwerk</p>
        <h1 className="mt-2 font-display text-4xl font-semibold leading-tight tracking-tight text-[#14162B]">De werkbon zit in je broekzak.</h1>
        <p className="mt-4 text-[#14162B]/70">
          Probeer het zelf: open een klus, vink taken af, voeg een foto toe en laat de klant tekenen. Zet de app offline: alles wordt bewaard en later gesynchroniseerd.
        </p>
      </div>

      <div className="relative h-[100svh] w-full overflow-hidden bg-[#F6F7FB] md:h-[812px] md:w-[390px] md:rounded-[48px] md:border-[10px] md:border-[#14162B] md:shadow-2xl">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between bg-[#14162B] px-5 pb-3 pt-4 text-white">
            <span className="text-xs font-medium">09:41</span>
            <button
              type="button"
              onClick={() => setOffline(!offline)}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] ${offline ? "bg-amber-400 text-[#14162B]" : "bg-white/10"}`}
            >
              {offline ? <CloudOff className="size-3" /> : <RefreshCw className="size-3" />}
              {offline ? "Offline · 1 wacht op sync" : "Gesynchroniseerd"}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {open ? (
              <JobDetail
                job={open}
                onBack={() => setOpenId(null)}
                onDone={(j) => {
                  setJobs((all) => all.map((x) => (x.id === j.id ? { ...j, done: true } : x)));
                  setOpenId(null);
                }}
              />
            ) : tab === "today" ? (
              <div className="animate-fadeup">
                <div className="bg-[#14162B] px-5 pb-6 text-white">
                  <p className="text-sm text-white/60">Goedemorgen, Mark</p>
                  <h2 className="mt-1 font-display text-2xl font-semibold">Vandaag · {jobs.length} klussen</h2>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-[#7C6CFF] transition-all duration-700" style={{ width: `${(doneCount / jobs.length) * 100}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-white/60">{doneCount} van {jobs.length} afgerond</p>
                </div>
                <ul className="space-y-3 p-4">
                  {jobs.map((j) => (
                    <li key={j.id}>
                      <button
                        type="button"
                        onClick={() => setOpenId(j.id)}
                        className="flex w-full items-start gap-3 rounded-2xl bg-white p-4 text-left shadow-sm transition active:scale-[0.98]"
                      >
                        <span className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl ${j.done ? "bg-emerald-100 text-emerald-600" : "bg-[#5B4BDB]/10 text-[#5B4BDB]"}`}>
                          {j.done ? <Check className="size-4" /> : <Wrench className="size-4" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-[#5B4BDB]">{j.time}</span>
                            <span className="text-[11px] text-[#14162B]/40">#{j.id}</span>
                          </span>
                          <span className={`mt-0.5 block font-medium text-[#14162B] ${j.done ? "line-through opacity-50" : ""}`}>{j.title}</span>
                          <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-[#14162B]/55">
                            <MapPin className="size-3 shrink-0" /> {j.address}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : tab === "agenda" ? (
              <Simple title="Deze week">
                {["Ma · 4 klussen", "Di · 5 klussen", "Wo · 3 klussen", "Do · 6 klussen", "Vr · 2 klussen"].map((d, i) => (
                  <div key={d} className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm">
                    <span className="font-medium text-[#14162B]">{d}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] ${i === 0 ? "bg-[#5B4BDB] text-white" : "bg-[#14162B]/5 text-[#14162B]/60"}`}>{i === 0 ? "Vandaag" : "Gepland"}</span>
                  </div>
                ))}
              </Simple>
            ) : tab === "bonnen" ? (
              <Simple title="Werkbonnen">
                {jobs.map((j) => (
                  <div key={j.id} className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm">
                    <span>
                      <span className="block text-sm font-medium text-[#14162B]">#{j.id} · {j.customer}</span>
                      <span className="text-xs text-[#14162B]/50">{j.title}</span>
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] ${j.done ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {j.done ? (offline ? "Wacht op sync" : "Verstuurd") : "Open"}
                    </span>
                  </div>
                ))}
              </Simple>
            ) : (
              <Simple title="Profiel">
                <div className="rounded-2xl bg-white p-5 shadow-sm">
                  <p className="font-display text-lg font-semibold text-[#14162B]">Mark Visser</p>
                  <p className="text-sm text-[#14162B]/60">Monteur · Bus 3 (VK-218-B)</p>
                </div>
              </Simple>
            )}
          </div>

          {!open && (
            <nav className="grid grid-cols-4 border-t border-[#14162B]/10 bg-white pb-5 pt-2">
              {(
                [
                  ["today", <Home key="h" className="size-5" />, "Vandaag"],
                  ["agenda", <Calendar key="c" className="size-5" />, "Agenda"],
                  ["bonnen", <ClipboardList key="b" className="size-5" />, "Bonnen"],
                  ["profiel", <User key="u" className="size-5" />, "Profiel"],
                ] as const
              ).map(([k, icon, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTab(k)}
                  className={`flex flex-col items-center gap-1 py-1 text-[11px] ${tab === k ? "text-[#5B4BDB]" : "text-[#14162B]/45"}`}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}

function Simple({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="animate-fadeup space-y-3 p-4">
      <h2 className="px-1 pt-2 font-display text-2xl font-semibold text-[#14162B]">{title}</h2>
      {children}
    </div>
  );
}

function JobDetail({ job, onBack, onDone }: { job: Job; onBack: () => void; onDone: (j: Job) => void }) {
  const [checked, setChecked] = useState<boolean[]>(job.tasks.map(() => job.done));
  const [materials, setMaterials] = useState(job.materials);
  const [photos, setPhotos] = useState<string[]>([]);
  const [signed, setSigned] = useState(job.done);
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const allDone = checked.every(Boolean) && signed;

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    c.width = r.width * 2;
    c.height = r.height * 2;
    const ctx = c.getContext("2d")!;
    ctx.scale(2, 2);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#14162B";
  }, []);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };

  return (
    <div className="animate-fadeup pb-6">
      <div className="bg-[#14162B] px-5 pb-6 text-white">
        <button type="button" onClick={onBack} className="-ml-1 flex items-center gap-1 text-sm text-white/70">
          <ChevronLeft className="size-4" /> Vandaag
        </button>
        <p className="mt-3 text-xs text-white/50">Werkbon #{job.id} · {job.time}</p>
        <h2 className="mt-1 font-display text-2xl font-semibold">{job.title}</h2>
        <p className="mt-1 text-sm text-white/70">{job.customer}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <span className="flex items-center justify-center gap-1.5 rounded-xl bg-white/10 py-2.5 text-sm">
            <Navigation className="size-4" /> Route
          </span>
          <span className="flex items-center justify-center gap-1.5 rounded-xl bg-white/10 py-2.5 text-sm">
            <Phone className="size-4" /> Bellen
          </span>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <Card title="Adres">
          <p className="text-sm text-[#14162B]">{job.address}</p>
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{job.note}</p>
        </Card>

        <Card title={`Taken · ${checked.filter(Boolean).length}/${job.tasks.length}`}>
          <ul className="space-y-1">
            {job.tasks.map((t, i) => (
              <li key={t}>
                <button
                  type="button"
                  onClick={() => setChecked(checked.map((c, k) => (k === i ? !c : c)))}
                  className="flex w-full items-center gap-3 rounded-lg py-2 text-left text-sm"
                >
                  <span className={`grid size-5 place-items-center rounded-md border-2 transition ${checked[i] ? "border-[#5B4BDB] bg-[#5B4BDB] text-white" : "border-[#14162B]/20"}`}>
                    {checked[i] && <Check className="size-3" />}
                  </span>
                  <span className={checked[i] ? "text-[#14162B]/50 line-through" : "text-[#14162B]"}>{t}</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        {materials.length > 0 && (
          <Card title="Materiaal uit de bus">
            {materials.map((m, i) => (
              <div key={m.name} className="flex items-center justify-between py-1.5 text-sm">
                <span className="text-[#14162B]">{m.name}</span>
                <span className="flex items-center gap-3">
                  <button type="button" aria-label="Minder" onClick={() => setMaterials(materials.map((x, k) => (k === i ? { ...x, qty: Math.max(0, x.qty - 1) } : x)))} className="grid size-7 place-items-center rounded-full bg-[#14162B]/5">
                    <Minus className="size-3" />
                  </button>
                  <span className="w-4 text-center font-medium">{m.qty}</span>
                  <button type="button" aria-label="Meer" onClick={() => setMaterials(materials.map((x, k) => (k === i ? { ...x, qty: x.qty + 1 } : x)))} className="grid size-7 place-items-center rounded-full bg-[#14162B]/5">
                    <Plus className="size-3" />
                  </button>
                </span>
              </div>
            ))}
          </Card>
        )}

        <Card title="Foto's">
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={p} alt={`Foto ${i + 1}`} className="aspect-square w-full rounded-lg object-cover" />
            ))}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-[#14162B]/15 text-xs text-[#14162B]/50"
            >
              <Camera className="size-5" /> Foto
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setPhotos((p) => [...p, URL.createObjectURL(f)]);
            }}
          />
        </Card>

        <Card title="Handtekening klant">
          <canvas
            ref={canvas}
            className="h-28 w-full touch-none rounded-lg border border-[#14162B]/10 bg-[#F6F7FB]"
            onPointerDown={(e) => {
              drawing.current = true;
              const ctx = e.currentTarget.getContext("2d")!;
              const [x, y] = pos(e);
              ctx.beginPath();
              ctx.moveTo(x, y);
            }}
            onPointerMove={(e) => {
              if (!drawing.current) return;
              const ctx = e.currentTarget.getContext("2d")!;
              const [x, y] = pos(e);
              ctx.lineTo(x, y);
              ctx.stroke();
              setSigned(true);
            }}
            onPointerUp={() => (drawing.current = false)}
            onPointerLeave={() => (drawing.current = false)}
          />
          <p className="mt-1.5 text-[11px] text-[#14162B]/40">Teken hierboven met je vinger of muis</p>
        </Card>

        <button
          type="button"
          disabled={!allDone}
          onClick={() => onDone({ ...job, materials })}
          className="w-full rounded-2xl bg-[#5B4BDB] py-4 font-semibold text-white shadow-lg shadow-[#5B4BDB]/30 transition disabled:opacity-35 disabled:shadow-none"
        >
          {allDone ? "Klus afronden" : "Rond taken af en laat tekenen"}
        </button>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#14162B]/45">{title}</h3>
      {children}
    </section>
  );
}
