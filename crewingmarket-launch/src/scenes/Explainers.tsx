import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame} from 'remotion';
import {Footage} from '../components/Footage';
import {easeIn, easeOut, ramp, TL} from '../lib/anim';

const FONT = 'Inter, sans-serif';
const WA_GREEN = '#21c063';
const BLUE = '#3b74ff';

const WaIcon: React.FC<{size?: number; color?: string}> = ({size = 64, color = WA_GREEN}) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Z" fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    <path d="M8.5 8.5c.3 2.6 2.4 5 5.2 6l1.3-1.3 2 1-.4 1.6c-4.4.2-8.4-3.6-8.4-8.2l1.6-.4 1 2-1.3 1.3" fill={color} />
  </svg>
);

const AppIcon: React.FC<{size?: number; color?: string}> = ({size = 64, color = BLUE}) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <rect x={6} y={1.5} width={12} height={21} rx={3} fill="none" stroke={color} strokeWidth={1.8} />
    <rect x={8.5} y={5} width={7} height={3} rx={1} fill={color} />
    <rect x={8.5} y={10} width={7} height={3} rx={1} fill={color} opacity={0.6} />
    <circle cx={12} cy={19} r={1.1} fill={color} />
  </svg>
);

const Backdrop: React.FC<{t: number; clip: {src: string; start: number; focusX?: number; credit: string}}> = ({t, clip}) => (
  <AbsoluteFill style={{filter: 'blur(18px) brightness(0.45)', transform: 'scale(1.1)'}}>
    <Footage clip={clip} t={t} length={90} push={0.04} grade="night" />
  </AbsoluteFill>
);

const RouteCard: React.FC<{
  n: number;
  icon: React.ReactNode;
  title: string;
  sub: string;
  color: string;
  p: number;
  dim: number;
  focus: number;
}> = ({n, icon, title, sub, color, p, dim, focus}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 30,
      padding: '34px 40px',
      borderRadius: 36,
      background: 'rgba(12,24,41,0.72)',
      border: `3px solid ${color}`,
      boxShadow: `0 0 ${40 * focus}px ${color}55`,
      opacity: p * (1 - dim * 0.65),
      transform: `translateY(${(1 - p) * 60}px) scale(${1 + focus * 0.04})`,
      width: 860,
    }}
  >
    <div
      style={{
        width: 116,
        height: 116,
        borderRadius: 30,
        background: `${color}22`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: '0 0 auto',
      }}
    >
      {icon}
    </div>
    <div style={{fontFamily: FONT}}>
      <div style={{fontSize: 30, fontWeight: 800, letterSpacing: '0.16em', color}}>MANIER {n}</div>
      <div style={{fontSize: 64, fontWeight: 900, color: '#fff', lineHeight: 1.1}}>{title}</div>
      <div style={{fontSize: 32, fontWeight: 500, color: 'rgba(255,255,255,0.75)', marginTop: 4}}>{sub}</div>
    </div>
  </div>
);

/** 0:04.5 – 0:07.5  "Zo werkt het" — the two ways to request crew. */
export const Intro: React.FC = () => {
  const from = TL.scenes.intro.from;
  const to = TL.scenes.intro.to;
  const f = useCurrentFrame() + from;
  const head = ramp(f, [from + 2, from + 14], [0, 1], easeOut);
  const c1 = ramp(f, [from + 16, from + 30], [0, 1], easeOut);
  const c2 = ramp(f, [from + 26, from + 40], [0, 1], easeOut);
  // then: "we beginnen met WhatsApp"
  const pick = ramp(f, [to - 28, to - 16], [0, 1], easeOut);
  const out = ramp(f, [to - 8, to], [0, 1], easeIn);
  return (
    <AbsoluteFill style={{background: '#02060d'}}>
      <Backdrop t={f - from} clip={{src: 'footage/tug-vanino.mp4', start: 5.5, focusX: 0.46, credit: ''}} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', opacity: 1 - out, transform: `scale(${1 + out * 0.08})`}}>
        <div style={{textAlign: 'center', fontFamily: FONT, opacity: head, transform: `translateY(${(1 - head) * 30}px)`}}>
          <div style={{fontSize: 34, fontWeight: 800, letterSpacing: '0.3em', color: BLUE}}>ZO WERKT HET</div>
          <div style={{fontSize: 84, fontWeight: 900, color: '#fff', lineHeight: 1.05, marginTop: 18}}>
            Personeel aanvragen
            <br />
            kan op 2 manieren
          </div>
        </div>
        <div style={{display: 'flex', flexDirection: 'column', gap: 34, marginTop: 70}}>
          <RouteCard
            n={1}
            icon={<WaIcon size={72} />}
            title="Via WhatsApp"
            sub="stuur gewoon een appje"
            color={WA_GREEN}
            p={c1}
            dim={0}
            focus={pick}
          />
          <RouteCard
            n={2}
            icon={<AppIcon size={72} />}
            title="Via de app"
            sub="op crewingmarket.com"
            color={BLUE}
            p={c2}
            dim={pick}
            focus={0}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** 0:24 – 0:26.5  Route 2: the same request, from the app. */
export const AppRoute: React.FC = () => {
  const from = TL.scenes.appRoute.from;
  const to = TL.scenes.appRoute.to;
  const f = useCurrentFrame() + from;
  const a = ramp(f, [from + 2, from + 14], [0, 1], easeOut);
  const b = ramp(f, [from + 12, from + 24], [0, 1], easeOut);
  const c = ramp(f, [from + 24, from + 36], [0, 1], easeOut);
  const out = ramp(f, [to - 8, to], [0, 1], easeIn);
  return (
    <AbsoluteFill style={{background: '#02060d'}}>
      <Backdrop t={f - from} clip={{src: 'footage/rotterdam-night.mp4', start: 7, focusX: 0.55, credit: ''}} />
      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: FONT,
          textAlign: 'center',
          opacity: 1 - out,
          transform: `translateX(${-out * 120}px)`,
        }}
      >
        <div style={{opacity: a, transform: `translateY(${(1 - a) * 30}px)`}}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 14,
              padding: '12px 28px 12px 18px',
              borderRadius: 999,
              border: `3px solid ${BLUE}`,
              color: BLUE,
              fontSize: 30,
              fontWeight: 800,
              letterSpacing: '0.16em',
            }}
          >
            <AppIcon size={40} /> MANIER 2
          </div>
          <div style={{fontSize: 96, fontWeight: 900, color: '#fff', marginTop: 34, lineHeight: 1.05}}>
            Liever via
            <br />
            de app?
          </div>
        </div>
        <div style={{opacity: b, transform: `translateY(${(1 - b) * 30}px)`, marginTop: 40}}>
          <div style={{fontSize: 44, fontWeight: 500, color: 'rgba(255,255,255,0.8)'}}>Plaats je opdracht direct op</div>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, marginTop: 18}}>
            <Img src={staticFile('brand/logo-mark-white.png')} style={{width: 72, height: 72}} />
            <div style={{fontSize: 66, fontWeight: 800, color: BLUE}}>crewingmarket.com</div>
          </div>
        </div>
        <div
          style={{
            opacity: c,
            marginTop: 70,
            fontSize: 36,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.7)',
            transform: `translateY(${(1 - c) * 20}px)`,
          }}
        >
          En dan? Zo ziet de zzp’er het ↓
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
