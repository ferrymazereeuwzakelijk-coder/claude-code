import React from 'react';
import {AbsoluteFill, Freeze, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {Phone} from '../components/Phone';
import {Tap} from '../components/ScreenUI';
import {Footage} from '../components/Footage';
import {camera, CamKey, cameraSpeed, easeIn, easeOut, ramp, TL} from '../lib/anim';

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

const APP = TL.appRoute;
const APP_CAM: CamKey[] = [
  {f: 760, s: 0.5, fx: 660, fy: 1434, rx: 10, ry: 36, rz: 6, tx: 1500, ty: 250},
  {f: 785, s: 1.0, rx: 3, ry: 8, rz: 1, tx: 0},
  {f: 805, s: 1.22, fy: 1500, rx: 0, ry: 0, rz: 0},
  {f: 850, s: 1.22, fy: 1500},
  {f: 870, s: 1.2, fy: 1300},
  {f: 1000, s: 1.2, fy: 1500},
  {f: 1030, s: 1.08, fy: 1434},
  {f: 1060, s: 1.3, fy: 1500},
  {f: 1150, s: 1.36, fy: 1480},
  {f: 1165, s: 1.2, tx: -1700, rz: -10, ry: 34},
];

/** Route 2: the company posts the same request in the CrewingMarket app (real recording). */
export const AppRoute: React.FC = () => {
  const from = TL.scenes.appRoute.from;
  const f = useCurrentFrame() + from;
  const a = ramp(f, [from + 2, from + 12], [0, 1], easeOut);
  const cardOut = ramp(f, [APP.cardTo - 8, APP.cardTo], [0, 1], easeIn);
  const cam = camera(f, APP_CAM);
  const blur = Math.min(26, Math.max(0, cameraSpeed(f, APP_CAM) - 140) * 0.1);
  const video = (
    <OffthreadVideo src={staticFile('footage/app-route.mp4')} muted style={{width: 1320, height: 2868, display: 'block'}} />
  );
  return (
    <AbsoluteFill style={{background: '#02060d', overflow: 'hidden'}}>
      <Backdrop t={f - from} clip={{src: 'footage/rotterdam-night.mp4', start: 7, focusX: 0.55, credit: ''}} />
      <AbsoluteFill
        style={{background: 'radial-gradient(circle at 50% 55%, rgba(59,116,255,0.22) 0%, rgba(0,0,0,0) 58%)'}}
      />
      {f >= APP.phoneIn - 6 && (
        <Phone cam={cam} blur={blur} glare={1.3}>
          <div style={{position: 'absolute', left: 0, top: 0, width: 1320, height: 2868}}>
            {f < APP.clipStart ? (
              <Freeze frame={0}>{video}</Freeze>
            ) : (
              <Sequence from={APP.clipStart - from} layout="none">
                {video}
              </Sequence>
            )}
          </div>
          {TL.taps
            .filter((t) => t.phone === 'app')
            .map((t) => (
              <Tap key={t.frame} frame={f} at={t.frame} x={t.x} y={t.y} dark={false} />
            ))}
        </Phone>
      )}
      {f < APP.cardTo && (
        <AbsoluteFill
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: FONT,
            textAlign: 'center',
            background: 'rgba(2,6,13,0.55)',
            opacity: 1 - cardOut,
          }}
        >
          <div style={{opacity: a, transform: `translateY(${(1 - a) * 30}px) scale(${1 + cardOut * 0.06})`}}>
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
            <div style={{fontSize: 104, fontWeight: 900, color: '#fff', marginTop: 30, lineHeight: 1.05}}>Via de app</div>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 22}}>
              <Img src={staticFile('brand/logo-mark-white.png')} style={{width: 60, height: 60}} />
              <div style={{fontSize: 52, fontWeight: 800, color: BLUE}}>crewingmarket.com</div>
            </div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
