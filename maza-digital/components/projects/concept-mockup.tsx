import type { MockupKind } from "@/content/projects";

/**
 * Generated interface for concept projects. These are design sketches of the
 * concept itself, shown only on projects labelled "Concept".
 * Everything is drawn with HTML/CSS, so it stays sharp and weighs almost nothing.
 */
export function ConceptMockup({ kind, accent }: { kind: MockupKind; accent: string }) {
  const bg = {
    background: `radial-gradient(80% 90% at 80% 0%, ${accent}40, transparent 65%), radial-gradient(60% 70% at 0% 100%, ${accent}1f, transparent 70%), #0a0e17`,
  };
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden" style={bg}>
      <Grid />
      {kind === "booking" && <Booking accent={accent} />}
      {kind === "mobile" && <Mobile accent={accent} />}
      {kind === "automation" && <Automation accent={accent} />}
      {kind === "shop" && <Shop accent={accent} />}
      {kind === "dashboard" && <Dashboard accent={accent} />}
      {kind === "game" && <Game accent={accent} />}
    </div>
  );
}

function Grid() {
  return (
    <div
      className="absolute inset-0 opacity-40"
      style={{
        backgroundImage:
          "linear-gradient(rgb(255 255 255 / 0.04) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.04) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }}
    />
  );
}

/** A browser window that sits slightly tilted in 3D space. */
function Window({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`absolute overflow-hidden rounded-[10px] border border-white/10 bg-[#0d1220]/95 shadow-[0_30px_80px_-20px_rgb(0_0_0/0.8)] transition-transform duration-[1.2s] ease-[var(--ease-out-expo)] group-hover:[transform:perspective(1400px)_rotateX(0deg)_rotateY(0deg)] ${className}`}
      style={{ transform: "perspective(1400px) rotateX(8deg) rotateY(-10deg)" }}
    >
      <div className="flex items-center gap-1.5 border-b border-white/10 px-3 py-2">
        <span className="size-1.5 rounded-full bg-white/20" />
        <span className="size-1.5 rounded-full bg-white/20" />
        <span className="size-1.5 rounded-full bg-white/20" />
        <span className="ml-3 h-2 w-1/3 rounded-full bg-white/5" />
      </div>
      {children}
    </div>
  );
}

const label = "text-[8px] uppercase tracking-[0.14em] text-white/40 md:text-[9px]";

function Booking({ accent }: { accent: string }) {
  const berths = Array.from({ length: 24 }, (_, i) => i);
  const taken = new Set([1, 2, 5, 8, 9, 13, 16, 17, 20]);
  const chosen = 11;
  return (
    <Window className="inset-x-[7%] top-[12%] bottom-[-6%]">
      <div className="grid h-full grid-cols-[1.4fr_1fr]">
        <div className="relative border-r border-white/10 p-3 md:p-5">
          <p className={label}>Haven · Steiger A–C</p>
          <div className="mt-3 space-y-3 md:mt-5 md:space-y-5">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-center gap-1 md:gap-1.5">
                <span className="w-3 text-[9px] text-white/40">{"ABC"[row]}</span>
                <div className="relative flex flex-1 gap-1 md:gap-1.5">
                  <span className="absolute inset-x-0 top-1/2 h-px bg-white/15" />
                  {berths.slice(row * 8, row * 8 + 8).map((b) => (
                    <span
                      key={b}
                      className="relative h-6 flex-1 rounded-[3px] border md:h-9"
                      style={{
                        borderColor: b === chosen ? accent : "rgb(255 255 255 / 0.12)",
                        background: b === chosen ? `${accent}55` : taken.has(b) ? "rgb(255 255 255 / 0.08)" : "transparent",
                        boxShadow: b === chosen ? `0 0 20px ${accent}88` : undefined,
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="absolute bottom-3 left-3 flex gap-3 text-[8px] text-white/50 md:bottom-5 md:left-5 md:text-[9px]">
            <span className="flex items-center gap-1"><span className="size-2 rounded-sm border border-white/20" />Vrij</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-white/10" />Bezet</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-sm" style={{ background: accent }} />Jouw plek</span>
          </div>
        </div>
        <div className="flex flex-col gap-2 p-3 md:gap-3 md:p-5">
          <p className={label}>Je boeking</p>
          <p className="font-display text-sm font-semibold text-white md:text-xl">Steiger B · 12</p>
          <div className="space-y-1.5 text-[9px] text-white/60 md:text-[11px]">
            <div className="flex justify-between"><span>Aankomst</span><span className="text-white">vr 14 jun</span></div>
            <div className="flex justify-between"><span>Vertrek</span><span className="text-white">zo 16 jun</span></div>
            <div className="flex justify-between"><span>Bootlengte</span><span className="text-white">11,5 m</span></div>
          </div>
          <div className="mt-auto flex items-center justify-between border-t border-white/10 pt-2 text-[10px] md:text-xs">
            <span className="text-white/60">2 nachten</span>
            <span className="font-semibold text-white">€ 64,00</span>
          </div>
          <span className="rounded-full py-1.5 text-center text-[9px] font-medium text-white md:py-2 md:text-[11px]" style={{ background: accent }}>
            Betalen met iDEAL
          </span>
        </div>
      </div>
    </Window>
  );
}

function Phone({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`absolute aspect-[9/19] overflow-hidden rounded-[18px] border border-white/15 bg-[#0d1220] p-2 shadow-[0_30px_60px_-15px_rgb(0_0_0/0.8)] md:rounded-[26px] md:p-3 ${className}`}
      style={style}
    >
      <div className="mx-auto mb-2 h-1 w-8 rounded-full bg-white/15 md:mb-3" />
      {children}
    </div>
  );
}

function Mobile({ accent }: { accent: string }) {
  return (
    <>
      <Phone className="left-[14%] top-[14%] h-[95%]" style={{ transform: "perspective(1000px) rotateY(18deg) rotateZ(-4deg)" }}>
        <p className={label}>Vandaag · 4 klussen</p>
        <div className="mt-2 space-y-1.5">
          {["CV-ketel onderhoud", "Lekkage keuken", "Thermostaat", "Oplevering"].map((t, i) => (
            <div key={t} className="rounded-md border border-white/10 p-1.5">
              <div className="flex items-center gap-1.5">
                <span className="size-2 shrink-0 rounded-full" style={{ background: i === 0 ? accent : "rgb(255 255 255 / 0.2)" }} />
                <span className="truncate text-[7px] text-white md:text-[9px]">{t}</span>
              </div>
              <span className="ml-3.5 text-[6px] text-white/40 md:text-[8px]">{["08:30", "10:15", "13:00", "15:30"][i]}</span>
            </div>
          ))}
        </div>
      </Phone>
      <Phone className="right-[14%] top-[6%] h-[100%]" style={{ transform: "perspective(1000px) rotateY(-14deg) rotateZ(3deg)" }}>
        <p className={label}>Werkbon #2041</p>
        <div className="mt-2 grid grid-cols-3 gap-1">
          {[0, 1, 2].map((i) => (
            <span key={i} className="aspect-square rounded" style={{ background: `linear-gradient(135deg, ${accent}66, rgb(255 255 255 / 0.05))` }} />
          ))}
        </div>
        <div className="mt-2 space-y-1">
          {["Filter vervangen", "Druk gecontroleerd", "Rookgasmeting"].map((t) => (
            <div key={t} className="flex items-center gap-1.5 text-[7px] text-white/70 md:text-[9px]">
              <span className="grid size-2.5 place-items-center rounded-sm text-[6px] text-white" style={{ background: accent }}>✓</span>
              {t}
            </div>
          ))}
        </div>
        <p className={`${label} mt-3`}>Handtekening klant</p>
        <svg viewBox="0 0 100 30" className="mt-1 h-6 w-full rounded border border-white/10">
          <path d="M5 22 C15 5, 22 28, 32 14 S48 6, 55 18 S72 26, 80 10 S92 12, 96 16" fill="none" stroke="white" strokeOpacity="0.8" strokeWidth="1.4" />
        </svg>
        <span className="mt-3 block rounded-full py-1 text-center text-[7px] font-medium text-white md:text-[9px]" style={{ background: accent }}>
          Afronden
        </span>
      </Phone>
    </>
  );
}

function Automation({ accent }: { accent: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center gap-[3%] px-[5%]">
      <div className="w-[30%] rounded-lg border border-white/10 bg-[#0d1220]/95 p-2 md:p-4" style={{ transform: "perspective(900px) rotateY(16deg)" }}>
        <p className={label}>Inbox</p>
        {["Aanvraag 40x pallet…", "Offerte graag voor…", "Kunnen jullie leveren…"].map((t, i) => (
          <div key={t} className="mt-2 rounded border border-white/10 p-1.5" style={{ borderColor: i === 0 ? `${accent}aa` : undefined }}>
            <span className="block h-1.5 w-1/2 rounded-full bg-white/30" />
            <span className="mt-1 block truncate text-[7px] text-white/60 md:text-[9px]">{t}</span>
          </div>
        ))}
      </div>
      <div className="relative grid size-[18%] shrink-0 place-items-center">
        <span className="absolute inset-0 animate-ping rounded-full opacity-20 [animation-duration:3s]" style={{ background: accent }} />
        <span className="absolute inset-[12%] rounded-full blur-xl" style={{ background: accent, opacity: 0.5 }} />
        <span
          className="relative grid size-[70%] place-items-center rounded-full border font-display text-[10px] font-semibold text-white md:text-base"
          style={{ borderColor: accent, background: "#0d1220" }}
        >
          AI
        </span>
        <svg className="absolute -left-[60%] top-1/2 w-[60%] -translate-y-1/2" viewBox="0 0 60 4" preserveAspectRatio="none" style={{ height: 4 }}>
          <line x1="0" y1="2" x2="60" y2="2" stroke={accent} strokeWidth="1.5" strokeDasharray="4 4" style={{ animation: "dash 1s linear infinite" }} />
        </svg>
        <svg className="absolute -right-[60%] top-1/2 w-[60%] -translate-y-1/2" viewBox="0 0 60 4" preserveAspectRatio="none" style={{ height: 4 }}>
          <line x1="0" y1="2" x2="60" y2="2" stroke={accent} strokeWidth="1.5" strokeDasharray="4 4" style={{ animation: "dash 1s linear infinite" }} />
        </svg>
      </div>
      <div className="w-[34%] rounded-lg border border-white/10 bg-[#0d1220]/95 p-2 md:p-4" style={{ transform: "perspective(900px) rotateY(-16deg)" }}>
        <p className={label}>CRM · Conceptofferte</p>
        <div className="mt-2 space-y-1 text-[7px] md:text-[10px]">
          {[
            ["Klant", "Bouwbedrijf De Vries"],
            ["Product", "Europallet 1200×800"],
            ["Aantal", "40"],
            ["Levering", "wk 27"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2 border-b border-white/5 pb-1">
              <span className="text-white/50">{k}</span>
              <span className="truncate text-white">{v}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-1">
          <span className="flex-1 rounded-full py-1 text-center text-[7px] text-white md:text-[9px]" style={{ background: accent }}>Goedkeuren</span>
          <span className="flex-1 rounded-full border border-white/15 py-1 text-center text-[7px] text-white/70 md:text-[9px]">Aanpassen</span>
        </div>
      </div>
    </div>
  );
}

function Shop({ accent }: { accent: string }) {
  const items = [
    ["Zuurdesem", "4,75"],
    ["Notenbrood", "5,25"],
    ["Appeltaart", "18,50"],
  ];
  return (
    <Window className="inset-x-[8%] top-[10%] bottom-[-8%]">
      <div className="p-3 md:p-6">
        <div className="flex items-end justify-between">
          <div>
            <p className={label}>Bakkerij · Ophalen morgen</p>
            <p className="mt-1 font-display text-base font-semibold text-white md:text-3xl">Vers van de plaat.</p>
          </div>
          <span className="rounded-full px-2 py-1 text-[8px] text-white md:px-3 md:text-[10px]" style={{ background: accent }}>Mandje · 3</span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 md:mt-5 md:gap-4">
          {items.map(([n, p], i) => (
            <div key={n}>
              <div
                className="aspect-[4/3] rounded-md"
                style={{
                  background: `radial-gradient(60% 55% at 50% 60%, ${accent}${["cc", "99", "bb"][i]}, ${accent}22 70%, transparent), #141a28`,
                }}
              />
              <div className="mt-1.5 flex justify-between text-[8px] md:text-[11px]">
                <span className="text-white">{n}</span>
                <span className="text-white/60">€ {p}</span>
              </div>
            </div>
          ))}
        </div>
        <p className={`${label} mt-3 md:mt-5`}>Kies je afhaalmoment</p>
        <div className="mt-1.5 flex gap-1.5">
          {["08:00", "09:30", "11:00", "12:30", "14:00"].map((t, i) => (
            <span
              key={t}
              className="rounded-full border px-2 py-0.5 text-[8px] md:px-3 md:py-1 md:text-[10px]"
              style={{ borderColor: i === 1 ? accent : "rgb(255 255 255 / 0.12)", color: i === 1 ? "white" : "rgb(255 255 255 / 0.6)", background: i === 1 ? `${accent}33` : undefined }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </Window>
  );
}

function Dashboard({ accent }: { accent: string }) {
  const bars = [40, 62, 48, 75, 58, 84, 70, 92, 66, 80, 72, 88];
  return (
    <Window className="inset-x-[6%] top-[10%] bottom-[-8%]">
      <div className="grid h-full grid-cols-[1.5fr_1fr] gap-2 p-2 md:gap-4 md:p-4">
        <div className="relative overflow-hidden rounded-md border border-white/10 bg-[#0a0e17]">
          <p className={`${label} absolute left-2 top-2`}>Vloot · live</p>
          <svg viewBox="0 0 200 120" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
            <path d="M-5 80 C30 70, 50 95, 80 78 S130 40, 160 52 S190 30, 210 35" fill="none" stroke={accent} strokeOpacity="0.5" strokeWidth="6" />
            <path d="M60 130 C70 100, 90 90, 80 78" fill="none" stroke={accent} strokeOpacity="0.3" strokeWidth="4" />
            {[
              [30, 74],
              [82, 77],
              [128, 50],
              [170, 46],
            ].map(([x, y], i) => (
              <g key={i}>
                <circle cx={x} cy={y} r="6" fill={accent} opacity="0.25" />
                <circle cx={x} cy={y} r="2.5" fill="white" />
              </g>
            ))}
          </svg>
        </div>
        <div className="flex flex-col gap-2 md:gap-3">
          <div className="rounded-md border border-white/10 p-2 md:p-3">
            <p className={label}>Certificaten</p>
            <div className="mt-1.5 space-y-1 text-[8px] md:text-[10px]">
              <div className="flex justify-between"><span className="text-white/60">MS Rijnstroom</span><span className="text-amber-300">14 dagen</span></div>
              <div className="flex justify-between"><span className="text-white/60">MS Waaldelta</span><span className="text-emerald-300">op orde</span></div>
            </div>
          </div>
          <div className="flex flex-1 flex-col rounded-md border border-white/10 p-2 md:p-3">
            <p className={label}>Vaaruren per week</p>
            <div className="mt-2 flex flex-1 items-end gap-[3px]">
              {bars.map((h, i) => (
                <span key={i} className="flex-1 rounded-t-[2px]" style={{ height: `${h}%`, background: i === bars.length - 1 ? accent : `${accent}55` }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Window>
  );
}

function Game({ accent }: { accent: string }) {
  const bubbles = Array.from({ length: 14 }, (_, i) => i);
  return (
    <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${accent}55 0%, #071a2a 45%, #02060c 100%)` }}>
      {/* light rays */}
      <div
        className="absolute inset-0 opacity-40"
        style={{ background: `repeating-linear-gradient(100deg, transparent 0 40px, ${accent}22 40px 70px)`, maskImage: "linear-gradient(180deg, black, transparent 60%)" }}
      />
      {bubbles.map((i) => (
        <span
          key={i}
          className="absolute rounded-full border border-white/30"
          style={{ left: `${(i * 37) % 95}%`, top: `${15 + ((i * 53) % 70)}%`, width: 4 + (i % 4) * 3, height: 4 + (i % 4) * 3 }}
        />
      ))}
      {/* creature: jellyfish */}
      <svg viewBox="0 0 100 120" className="absolute left-[56%] top-[24%] w-[16%]" style={{ filter: `drop-shadow(0 0 16px ${accent})` }}>
        <path d="M10 45 C10 10, 90 10, 90 45 Z" fill={accent} fillOpacity="0.55" stroke="white" strokeOpacity="0.6" />
        {[22, 38, 54, 70, 82].map((x) => (
          <path key={x} d={`M${x} 45 C${x - 6} 70, ${x + 6} 85, ${x - 2} 115`} fill="none" stroke={accent} strokeOpacity="0.8" strokeWidth="2" />
        ))}
      </svg>
      <svg viewBox="0 0 120 50" className="absolute left-[14%] top-[58%] w-[20%] opacity-80">
        <path d="M5 25 C30 0, 80 0, 100 25 C80 50, 30 50, 5 25 Z M100 25 L118 10 L118 40 Z" fill="#9fe8ff" fillOpacity="0.35" />
        <circle cx="30" cy="22" r="3" fill="white" />
      </svg>
      {/* HUD */}
      <div className="absolute left-[5%] top-[8%] font-mono text-[9px] uppercase tracking-[0.2em] text-white/80 md:text-xs">
        Diepte <span className="text-white">−340 m</span>
      </div>
      <div className="absolute right-[5%] top-[8%] h-[70%] w-1 rounded-full bg-white/10">
        <span className="absolute inset-x-0 top-0 h-[55%] rounded-full" style={{ background: accent }} />
      </div>
      <div className="absolute bottom-[8%] left-[5%] rounded-full border border-white/20 bg-black/30 px-3 py-1 text-[9px] text-white backdrop-blur md:text-xs">
        Ontdekt: 7 / 12 soorten
      </div>
    </div>
  );
}
