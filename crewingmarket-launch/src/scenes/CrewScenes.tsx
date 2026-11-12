import React from 'react';
import {AbsoluteFill, Freeze, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {Footage} from '../components/Footage';
import {Phone} from '../components/Phone';
import {Highlight, Tap} from '../components/ScreenUI';
import {DECKHAND, FOOTAGE} from '../footage';
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
  {f: 1497, s: 1.3, fy: 2250, rx: 0, ry: 0, rz: 0},
  {f: 1552, s: 1.3, fy: 2250},
  {f: 1570, s: 1.05, fy: 1434},
  {f: 1585, s: 1.3, fy: 1300},
  {f: 1696, s: 1.3, fy: 1330},
  {f: 1712, s: 1.3, fy: 1200},
  {f: 1800, s: 1.36, fy: 1200},
];

/**
 * The company's own screen recording: the WhatsApp alert that a deckhand
 * reacted, the reactions page, and contacting him in one tap.
 */
export const CompanyResult: React.FC = () => {
  const {from, to} = TL.scenes.companyResult;
  const f = useCurrentFrame() + from;
  const cam = camera(f, RESULT_CAM);
  const blur = Math.min(26, Math.max(0, cameraSpeed(f, RESULT_CAM) - 140) * 0.1);
  const out = ramp(f, [to - 6, to], [0, 1], easeIn);
  const video = (
    <OffthreadVideo src={staticFile('footage/rec-reactions.mp4')} muted style={{width: 1320, height: 2868, display: 'block'}} />
  );
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
            {f < R.clipStart ? (
              <Freeze frame={0}>{video}</Freeze>
            ) : (
              <Sequence from={R.clipStart - from} layout="none">
                {video}
              </Sequence>
            )}
            {f < R.tapLink + 4 && (
              <Highlight frame={f} at={R.clipStart + 2} x={36} y={2178} w={1010} h={396} radius={40} color="#21c063" />
            )}
            {f >= R.pageOpen && f < R.tapContact + 2 && (
              <Highlight frame={f} at={R.pageOpen + 14} x={36} y={944} w={1248} h={776} radius={40} color="#21c063" />
            )}
            {f >= R.contact && (
              <Highlight frame={f} at={R.contact + 6} x={40} y={840} w={1240} h={520} radius={40} color="#21c063" />
            )}
          </div>
          {TL.taps
            .filter((t) => t.phone === 'result')
            .map((t) => (
              <Tap key={t.frame} frame={f} at={t.frame} x={t.x} y={t.y} dark={f < R.tapLink + 10} />
            ))}
        </Phone>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
