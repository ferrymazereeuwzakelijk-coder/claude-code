import React from 'react';
import {AbsoluteFill} from 'remotion';
import {easeIn, easeOut, ramp, TL} from '../lib/anim';

const FONT = 'Inter, sans-serif';
const WA_GREEN = '#21c063';
const BLUE = '#3b74ff';

const ORANGE = '#ff8a3d';

const ROUTES: Record<string, {label: string; color: string; ink: string}> = {
  whatsapp: {label: 'MANIER 1 · VIA WHATSAPP', color: WA_GREEN, ink: '#06210f'},
  app: {label: 'MANIER 2 · VIA DE APP', color: BLUE, ink: '#fff'},
  freelancer: {label: 'DAARNA · DE ZZP’ER', color: ORANGE, ink: '#2a1200'},
  company: {label: 'DAARNA · JIJ ALS BEDRIJF', color: WA_GREEN, ink: '#06210f'},
};

const WaIcon: React.FC<{color: string}> = ({color}) => (
  <svg width={30} height={30} viewBox="0 0 24 24">
    <path
      d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Z"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinejoin="round"
    />
  </svg>
);

const AppIcon: React.FC<{color: string}> = ({color}) => (
  <svg width={30} height={30} viewBox="0 0 24 24">
    <rect x={6} y={2} width={12} height={20} rx={3} fill="none" stroke={color} strokeWidth={2} />
    <circle cx={12} cy={18.5} r={1.2} fill={color} />
  </svg>
);

/**
 * Big, always-readable step caption at the top of the frame.
 * Steps are defined in timeline.json → "steps", so copy and timing are editable.
 */
export const StepCaptions: React.FC<{frame: number}> = ({frame}) => {
  const steps = TL.steps;
  const active = steps.filter((s) => frame >= s.from - 2 && frame < s.to + 8);
  if (active.length === 0) return null;
  const cur = active[active.length - 1];
  const group = steps.filter((x) => x.group === cur.group);
  const total = group.length;
  const anyIn = Math.max(...active.map((s) => ramp(frame, [s.from - 2, s.from + 8], [0, 1], easeOut) * (1 - ramp(frame, [s.to, s.to + 8], [0, 1], easeIn))));
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {/* backdrop so the caption reads on any background */}
      <AbsoluteFill
        style={{
          height: 600,
          background: 'linear-gradient(180deg, rgba(2,6,13,0.97) 0%, rgba(2,6,13,0.97) 72%, rgba(2,6,13,0) 100%)',
          opacity: anyIn,
        }}
      />
      {active.map((s) => {
        const pin = ramp(frame, [s.from - 2, s.from + 8], [0, 1], easeOut);
        const pout = ramp(frame, [s.to, s.to + 8], [0, 1], easeIn);
        // only animate the route chip when the route changes
        const idx = steps.indexOf(s);
        const prev = steps[idx - 1];
        const sameRoute = prev && prev.route === s.route && prev.to === s.from;
        const next = steps[idx + 1];
        const nextSame = next && next.route === s.route && next.from === s.to;
        const chipOp = (sameRoute ? 1 : pin) * (nextSame ? 1 : 1 - pout);
        const r = ROUTES[s.route];
        return (
          <div key={`${s.group}-${s.n}`} style={{position: 'absolute', left: 64, right: 64, top: 112}}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 22px 10px 16px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.08)',
                border: `2px solid ${r.color}`,
                opacity: s === cur || !nextSame ? chipOp : 0,
                fontFamily: FONT,
                fontSize: 26,
                fontWeight: 800,
                letterSpacing: '0.14em',
                color: r.color,
              }}
            >
              {s.route === 'whatsapp' || s.route === 'company' ? <WaIcon color={r.color} /> : <AppIcon color={r.color} />}
              {r.label}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 28,
                marginTop: 26,
                opacity: pin * (1 - pout),
                transform: `translateY(${(1 - pin) * 30 - pout * 20}px)`,
              }}
            >
              <div
                style={{
                  flex: '0 0 auto',
                  width: 104,
                  height: 104,
                  borderRadius: 52,
                  background: r.color,
                  color: r.ink,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: FONT,
                  fontSize: 60,
                  fontWeight: 900,
                  boxShadow: `0 0 40px ${r.color}66`,
                  transform: `scale(${0.6 + 0.4 * pin})`,
                }}
              >
                {s.n}
              </div>
              <div style={{fontFamily: FONT, minWidth: 0}}>
                <div style={{fontSize: 66, fontWeight: 800, color: '#fff', lineHeight: 1.05, letterSpacing: '-0.01em'}}>
                  {s.title}
                </div>
                <div style={{fontSize: 36, fontWeight: 500, color: 'rgba(255,255,255,0.78)', marginTop: 8}}>{s.sub}</div>
              </div>
            </div>
          </div>
        );
      })}
      {/* progress: which step of the total */}
      <div style={{position: 'absolute', left: 64, top: 392, display: 'flex', gap: 10, opacity: anyIn}}>
        {group.map((s) => {
          const done = s.n < cur.n;
          const on = s.n === cur.n;
          return (
            <div
              key={`${s.group}-${s.n}`}
              style={{
                width: on ? 56 : 18,
                height: 8,
                borderRadius: 4,
                background: on ? ROUTES[s.route].color : done ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)',
              }}
            />
          );
        })}
        <div style={{fontFamily: FONT, fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginLeft: 8, marginTop: -8}}>
          {cur.n}/{total}
        </div>
      </div>
    </AbsoluteFill>
  );
};
