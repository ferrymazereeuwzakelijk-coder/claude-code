import type { ServiceIcon } from "@/content/services";
import { cn } from "@/lib/utils";

/**
 * Small abstract product mockups per service, drawn in markup/SVG.
 * They suggest the kind of product without pretending to be real client work.
 */
export function ServiceVisual({ kind, className }: { kind: ServiceIcon; className?: string }) {
  const base = cn("pointer-events-none select-none", className);

  switch (kind) {
    case "globe":
    case "cart":
      return (
        <div aria-hidden className={base}>
          <div className="overflow-hidden rounded-lg border border-line-strong bg-ink shadow-[0_30px_80px_-30px_rgb(75_123_255/0.5)] transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:-translate-y-1.5">
            <div className="flex items-center gap-1.5 border-b border-line px-3 py-2">
              <span className="size-2 rounded-full bg-white/15" />
              <span className="size-2 rounded-full bg-white/15" />
              <span className="size-2 rounded-full bg-white/15" />
              <span className="ml-3 h-4 flex-1 rounded bg-white/[0.04]" />
            </div>
            <div className="grid grid-cols-5 gap-3 p-4">
              <div className="col-span-3 space-y-2">
                <div className="h-5 w-11/12 rounded bg-white/80" />
                <div className="h-5 w-8/12 rounded bg-white/80" />
                <div className="mt-3 h-2 w-10/12 rounded bg-white/15" />
                <div className="h-2 w-9/12 rounded bg-white/15" />
                <div className="mt-3 h-6 w-24 rounded-full bg-blue" />
              </div>
              <div className="col-span-2 rounded-md bg-gradient-to-br from-blue/60 via-violet/40 to-transparent" />
              <div className="col-span-5 mt-1 grid grid-cols-3 gap-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-14 rounded-md border border-line bg-white/[0.03]" />
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    case "smartphone":
      return (
        <div aria-hidden className={base}>
          <div className="mx-auto w-36 rounded-[1.6rem] border border-line-strong bg-ink p-2 shadow-[0_30px_80px_-30px_rgb(128_102_255/0.6)] transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:-translate-y-1.5 group-hover:rotate-[-2deg]">
            <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-white/10" />
            <div className="space-y-2 rounded-[1.1rem] bg-ink-2 p-3">
              <div className="h-2 w-12 rounded bg-white/20" />
              <div className="h-4 w-20 rounded bg-white/80" />
              <div className="h-16 rounded-lg bg-gradient-to-br from-violet/70 to-blue/50" />
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-2 rounded-md bg-white/[0.04] p-1.5">
                  <span className="size-4 rounded bg-white/15" />
                  <span className="h-1.5 flex-1 rounded bg-white/15" />
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    case "layers":
      return (
        <div aria-hidden className={base}>
          <div className="rounded-lg border border-line-strong bg-ink p-4 transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:-translate-y-1">
            <div className="mb-3 flex gap-2">
              <span className="h-2 w-10 rounded bg-white/25" />
              <span className="h-2 w-6 rounded bg-white/10" />
            </div>
            <div className="flex h-20 items-end gap-1.5">
              {[40, 62, 48, 75, 58, 88, 70].map((v, i) => (
                <span
                  key={i}
                  className="flex-1 rounded-sm bg-gradient-to-t from-blue/30 to-blue transition-[height] duration-700"
                  style={{ height: `${v}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      );
    case "sparkles":
      return (
        <svg aria-hidden viewBox="0 0 240 110" className={cn(base, "w-full")}>
          <defs>
            <linearGradient id="ai-line" x1="0" x2="1">
              <stop offset="0" stopColor="#4B7BFF" />
              <stop offset="1" stopColor="#8066FF" />
            </linearGradient>
          </defs>
          <path d="M30 55 C 80 55, 80 22, 120 22 S 160 55, 210 55" fill="none" stroke="url(#ai-line)" strokeWidth="1.5" strokeDasharray="4 5" className="motion-safe:animate-[dash_3s_linear_infinite]" />
          <path d="M30 55 C 80 55, 80 88, 120 88 S 160 55, 210 55" fill="none" stroke="url(#ai-line)" strokeWidth="1.5" strokeOpacity="0.5" />
          {[
            [30, 55],
            [120, 22],
            [120, 88],
            [210, 55],
          ].map(([x, y], i) => (
            <g key={i}>
              <rect x={x! - 14} y={y! - 10} width="28" height="20" rx="6" fill="#0D111B" stroke="rgb(255 255 255 / 0.18)" />
              <circle cx={x} cy={y} r="3" fill={i === 1 ? "#8066FF" : "#4B7BFF"} />
            </g>
          ))}
        </svg>
      );
    case "gamepad":
      return (
        <div aria-hidden className={base}>
          <div className="grid grid-cols-6 gap-1.5 transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:-translate-y-1">
            {Array.from({ length: 18 }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "aspect-square rounded-[5px] border border-line",
                  [2, 7, 8, 9, 14].includes(i) && "border-transparent bg-violet/70",
                  [4, 11].includes(i) && "border-transparent bg-blue",
                  i === 16 && "border-transparent bg-white",
                )}
              />
            ))}
          </div>
        </div>
      );
    case "network":
      return (
        <svg aria-hidden viewBox="0 0 520 140" className={cn(base, "w-full")}>
          {(
            [
              [60, 40, 260, 70],
              [60, 100, 260, 70],
              [140, 20, 260, 70],
              [140, 120, 260, 70],
              [260, 70, 380, 20],
              [260, 70, 380, 120],
              [260, 70, 460, 40],
              [260, 70, 460, 100],
            ] as const
          ).map(([x1, y1, x2, y2], i) => (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgb(255 255 255 / 0.14)" />
          ))}
          {(
            [
              [60, 40],
              [60, 100],
              [140, 20],
              [140, 120],
            ] as const
          ).map(([x, y], i) => (
            <circle key={`l${i}`} cx={x} cy={y} r="7" fill="#0D111B" stroke="#4B7BFF" strokeWidth="1.5" />
          ))}
          {(
            [
              [380, 20],
              [380, 120],
              [460, 40],
              [460, 100],
            ] as const
          ).map(([x, y], i) => (
            <circle key={`r${i}`} cx={x} cy={y} r="7" fill="#0D111B" stroke="#8066FF" strokeWidth="1.5" />
          ))}
          <circle cx="260" cy="70" r="20" fill="#0D111B" stroke="white" strokeOpacity="0.5" />
          <circle cx="260" cy="70" r="6" fill="white" />
        </svg>
      );
  }
}
