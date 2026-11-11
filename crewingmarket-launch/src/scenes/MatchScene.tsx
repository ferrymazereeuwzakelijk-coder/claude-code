import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {fitText} from '@remotion/layout-utils';
import {Phone} from '../components/Phone';
import {Highlight, Shot} from '../components/ScreenUI';
import {camera, CamKey, easeIn, easeOut, ramp, shake, TL} from '../lib/anim';

const M = TL.match;
const FROM = TL.scenes.match.from;
const END = TL.scenes.match.to;
const FONT = 'Inter, sans-serif';

const side = (dir: -1 | 1): CamKey[] => [
  {f: FROM - 12, s: 0.45, fx: 660, fy: 1434, tx: dir * 1000, ty: 90, ry: -dir * 45, rz: dir * 6, rx: 6},
  {f: FROM + 2, s: 0.53, tx: dir * 228, ry: -dir * 16, rz: dir * 1.5, rx: 3},
  {f: END - 12, s: 0.55, tx: dir * 224, ry: -dir * 12, rz: dir * 1.2, rx: 2},
  {f: END, s: 0.85, tx: dir * 420, ry: -dir * 30, rz: dir * 3},
];
const COMPANY = side(-1);
const FREELANCER = side(1);

/** 0:20 – 0:24.5  Both sides of the market, connected. */
export const MatchScene: React.FC = () => {
  const f = useCurrentFrame() + FROM;
  const sh = shake(f, [M.impact], 14);
  const out = ramp(f, [END - 10, END], [0, 1], easeIn);
  const [l1, l2] = TL.copy.tagline;
  const fs = Math.min(
    fitText({text: l1, withinWidth: 930, fontFamily: FONT, fontWeight: '900'}).fontSize,
    fitText({text: l2, withinWidth: 930, fontFamily: FONT, fontWeight: '900'}).fontSize,
  );
  const t1 = ramp(f, [M.line1, M.line1 + 10], [0, 1], easeOut);
  const t2 = ramp(f, [M.line2, M.line2 + 10], [0, 1], easeOut);

  // connection beam: an arc between the two phones
  const draw = ramp(f, [M.impact, M.impact + 16], [0, 1], easeOut);
  const path = 'M 316 690 C 390 520, 690 520, 764 690';
  const pulseT = ((f - M.impact - 10) % 34) / 34;
  const pulse = (u: number) => {
    // cubic bezier point (from freelancer to company)
    const p0 = [764, 690];
    const p1 = [690, 520];
    const p2 = [390, 520];
    const p3 = [316, 690];
    const a = (1 - u) ** 3;
    const b = 3 * (1 - u) ** 2 * u;
    const c = 3 * (1 - u) * u * u;
    const d = u ** 3;
    return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
  };
  const [px, py] = pulse(Math.max(0, pulseT));
  const ring = ramp(f, [M.impact, M.impact + 22], [0, 1], easeOut);
  const labels = ramp(f, [M.impact + 6, M.impact + 16], [0, 1], easeOut);

  return (
    <AbsoluteFill
      style={{
        background: 'radial-gradient(ellipse 90% 70% at 50% 42%, #10264a 0%, #071225 45%, #02060d 100%)',
        overflow: 'hidden',
      }}
    >
      <AbsoluteFill style={{transform: `translate(${sh.x}px, ${sh.y}px)`, opacity: 1 - out}}>
        {/* impact shock ring */}
        <div
          style={{
            position: 'absolute',
            left: 540 - 400,
            top: 600 - 400,
            width: 800,
            height: 800,
            borderRadius: 400,
            border: `3px solid rgba(120,165,255,${0.6 * (1 - ring)})`,
            transform: `scale(${0.1 + ring * 1.4})`,
          }}
        />
        <Phone cam={camera(f, COMPANY)} shadow={0.8}>
          <Shot src="wa-online.png">
            <Highlight frame={f} at={M.impact + 4} x={70} y={2170} w={980} h={210} color="#21c063" radius={30} />
          </Shot>
        </Phone>
        <Phone cam={camera(f, FREELANCER)} shadow={0.8} glare={1.4}>
          <Shot src="app-reacted.png">
            <Highlight frame={f} at={M.impact + 4} x={40} y={226} w={1240} h={250} radius={30} />
          </Shot>
        </Phone>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <defs>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" />
            </filter>
          </defs>
          <path
            d={path}
            stroke="#3b74ff"
            strokeWidth={10}
            fill="none"
            pathLength={1}
            strokeDasharray={`${draw} 1`}
            filter="url(#glow)"
            opacity={0.8}
          />
          <path d={path} stroke="#cfe0ff" strokeWidth={3} fill="none" pathLength={1} strokeDasharray={`${draw} 1`} />
          {f > M.impact + 10 && (
            <>
              <circle cx={px} cy={py} r={16} fill="#3b74ff" filter="url(#glow)" />
              <circle cx={px} cy={py} r={7} fill="#fff" />
            </>
          )}
          {[
            [316, 690],
            [764, 690],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={9 * draw} fill="#fff" stroke="#3b74ff" strokeWidth={4} />
          ))}
        </svg>
        {/* role captions */}
        {[
          {x: 316, t: 'BEDRIJF', s: 'ziet alle reacties'},
          {x: 764, t: "ZZP'ER", s: 'reageerde met één tik'},
        ].map((c) => (
          <div
            key={c.t}
            style={{
              position: 'absolute',
              left: c.x - 200,
              width: 400,
              top: 1440,
              textAlign: 'center',
              fontFamily: FONT,
              opacity: labels,
              transform: `translateY(${(1 - labels) * 20}px)`,
            }}
          >
            <div style={{fontSize: 30, fontWeight: 800, letterSpacing: '0.18em', color: '#fff'}}>{c.t}</div>
            <div style={{fontSize: 27, fontWeight: 500, color: 'rgba(255,255,255,0.65)', marginTop: 6}}>{c.s}</div>
          </div>
        ))}
        {/* tagline */}
        <div style={{position: 'absolute', left: 0, right: 0, top: 1590, textAlign: 'center', fontFamily: FONT}}>
          {[
            {t: l1, p: t1, c: '#ffffff'},
            {t: l2, p: t2, c: '#3b74ff'},
          ].map((l) => (
            <div
              key={l.t}
              style={{
                fontSize: fs,
                fontWeight: 900,
                lineHeight: 1.08,
                letterSpacing: '-0.01em',
                color: l.c,
                opacity: l.p,
                filter: `blur(${(1 - l.p) * 12}px)`,
                transform: `translateY(${(1 - l.p) * 50}px)`,
                whiteSpace: 'nowrap',
              }}
            >
              {l.t}
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
