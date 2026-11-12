import React from 'react';
import {AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame} from 'remotion';
import {Footage} from '../components/Footage';
import {Phone} from '../components/Phone';
import {Highlight, Tap} from '../components/ScreenUI';
import {DECKHAND, FOOTAGE} from '../footage';
import counterRows from '../rec-counter.json';
import {camera, CamKey, cameraSpeed, easeIn, easeOut, ramp, TL} from '../lib/anim';

const FONT = 'Inter, sans-serif';
const ORANGE = '#ff8a3d';

/** "Ondertussen bij de matroos…" — the deckhand at work, back to camera. */
export const Deckhand: React.FC = () => {
  const {from, to} = TL.scenes.deckhand;
  const f = useCurrentFrame() + from;
  const a = ramp(f, [from + 3, from + 13], [0, 1], easeOut);
  const out = ramp(f, [to - 6, to], [0, 1], easeIn);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <AbsoluteFill style={{opacity: ramp(f, [from, from + 5], [0, 1])}}>
        <Footage clip={DECKHAND} t={f - from} length={to - from} push={0.1} grade="neutral" />
      </AbsoluteFill>
      <AbsoluteFill
        style={{background: 'linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(2,6,13,0.85) 100%)'}}
      />
      <div
        style={{
          position: 'absolute',
          left: 64,
          right: 64,
          top: 1360,
          fontFamily: FONT,
          opacity: a * (1 - out),
          transform: `translateY(${(1 - a) * 30}px)`,
        }}
      >
        <div
          style={{
            display: 'inline-block',
            padding: '10px 22px',
            borderRadius: 999,
            border: `2px solid ${ORANGE}`,
            color: ORANGE,
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: '0.14em',
            background: 'rgba(2,6,13,0.5)',
          }}
        >
          ZZP’ER
        </div>
        <div style={{fontSize: 78, fontWeight: 900, color: '#fff', lineHeight: 1.05, marginTop: 20}}>
          Ondertussen
          <br />
          bij de matroos…
        </div>
      </div>
    </AbsoluteFill>
  );
};

const R = TL.companyResult;
const RESULT_CAM: CamKey[] = [
  {f: 1465, s: 0.55, fx: 660, fy: 1434, rx: -6, ry: -38, rz: -6, tx: 1700, ty: 250},
  {f: 1482, s: 1.0, rx: 2, ry: -6, rz: -1, tx: 0},
  {f: 1497, s: 1.3, fy: 2080, rx: 0, ry: 0, rz: 0},
  {f: 1507, s: 1.3, fy: 2080},
  {f: 1520, s: 1.05, fy: 1434},
  {f: 1546, s: 1.3, fy: 1180},
  {f: 1582, s: 1.34, fy: 1180},
];

/**
 * Step 7, from the company's own screen recording: tap the link in WhatsApp,
 * the reactions page opens and the freelancer's reaction is there.
 */
export const CompanyResult: React.FC = () => {
  const {from, to} = TL.scenes.companyResult;
  const f = useCurrentFrame() + from;
  const cam = camera(f, RESULT_CAM);
  const blur = Math.min(26, Math.max(0, cameraSpeed(f, RESULT_CAM) - 140) * 0.1);
  const out = ramp(f, [to - 6, to], [0, 1], easeIn);
  // the recording is 512px wide: K maps its pixels to native screen pixels
  const K = 1320 / 512;
  const rows = counterRows as (number | null)[];
  const counterY = rows[Math.min(rows.length - 1, Math.max(0, f - from))] ?? null;
  return (
    <AbsoluteFill style={{background: '#02060d', overflow: 'hidden'}}>
      <AbsoluteFill style={{filter: 'blur(22px) brightness(0.9)', transform: 'scale(1.12)'}}>
        {FOOTAGE.companyBackground && (
          <Footage clip={{...FOOTAGE.companyBackground, start: 9}} t={f - from} length={to - from} push={0.04} grade="night" />
        )}
      </AbsoluteFill>
      <AbsoluteFill
        style={{background: 'radial-gradient(circle at 50% 55%, rgba(33,192,99,0.16) 0%, rgba(0,0,0,0) 58%)'}}
      />
      <AbsoluteFill style={{opacity: 1 - out}}>
        <Phone cam={cam} blur={blur} glare={1.3}>
          <div style={{position: 'absolute', left: 0, top: 0, width: 1320, height: 2868}}>
            <OffthreadVideo
              src={staticFile('footage/rec-reactions.mp4')}
              muted
              style={{width: 1320, height: 2868, display: 'block'}}
            />
            {/* screen-recording dot */}
            <div style={{position: 'absolute', left: 443 - 28, top: 95 - 28, width: 56, height: 56, borderRadius: 28, background: '#000'}} />
            {/* the page's interest counter does not update yet — hide it */}
            {counterY !== null && (
              <div style={{position: 'absolute', left: 30, top: (counterY - 9) * K, width: 660, height: 34 * K, background: '#f3f4f7'}} />
            )}
            {counterY !== null && (
              <Highlight frame={f} at={R.reaction + 8} x={44} y={(counterY + 33) * K} w={1232} h={528} radius={40} color="#21c063" />
            )}
          </div>
          <Tap frame={f} at={R.tapLink} x={500} y={2310} />
        </Phone>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
