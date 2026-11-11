import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Phone} from '../components/Phone';
import {PALETTES, SeaScene} from '../components/SeaScene';
import {Footage} from '../components/Footage';
import {Highlight, ScrollSwap, SentBubble, Shot, Tap, TypingField} from '../components/ScreenUI';
import {FOOTAGE} from '../footage';
import {camera, CamKey, cameraSpeed, easeInOut, easeOut, fadeIn, ramp, TL} from '../lib/anim';

const W = TL.whatsapp;
const FROM = TL.scenes.whatsapp.from;

/** Company phone camera — every move eased like a motion-control rig. */
// ty: 250 keeps the phone below the step caption at the top of the frame.
export const COMPANY_CAM: CamKey[] = [
  {f: 225, s: 0.4, fx: 660, fy: 1434, rx: 30, ry: -40, rz: -8, ty: 560},
  {f: 252, s: 1.0, rx: 4, ry: -8, rz: -1, ty: 250},
  {f: 270, s: 1.28, fy: 1480, rx: 0, ry: 0, rz: 0},
  {f: 342, s: 1.28, fy: 1400},
  {f: 362, s: 1.22, fy: 1250},
  {f: 405, s: 1.22, fy: 1200},
  {f: 432, s: 1.28, fy: 1760},
  {f: 470, s: 1.04, fy: 1434},
  {f: 496, s: 1.18, fy: 1120},
  {f: 548, s: 1.18, fy: 1300},
  {f: 576, s: 1.22, fy: 1780},
  {f: 608, s: 1.0, fy: 1434},
  {f: 640, s: 1.42, fx: 560, fy: 1960},
  {f: 704, s: 1.48, fx: 560, fy: 1970},
  {f: 720, s: 1.2, tx: -1700, rz: -10, ry: 34},
];

const HEADER = 320; // bottom of the WhatsApp navigation bar (native px)

/** The company's screen, frame by frame, built only from real screenshots. */
export const CompanyScreen: React.FC<{f: number}> = ({f}) => {
  const msg = TL.copy.typedMessage;
  const time = TL.copy.messageTime;
  const bubble = (top: number, pop = 1) => <SentBubble top={top} text={msg} time={time} pop={pop} />;

  // sheet (form) presentation progress
  const up = ramp(f, [W.sheetUp, W.sheetUp + 12], [0, 1], easeOut);
  const down = ramp(f, [W.sheetDown, W.sheetDown + 10], [0, 1], easeInOut);
  const sheet = f < W.sheetDown ? up : 1 - down;
  const sheetY = (1 - sheet) * 2640;

  return (
    <>
      {/* 1. Empty chat, live typing, message sent */}
      <ScrollSwap
        frame={f}
        start={W.bemanning}
        dur={9}
        dy={342}
        top={HEADER}
        bottom={1690}
        a={{
          src: f < W.welcome ? 'wa-empty.png' : 'wa-welcome.png',
          children: (
            <>
              {f < W.welcome && (
                <TypingField frame={f} text={msg} start={W.typeStart} end={W.typeEnd} sent={W.send} />
              )}
              {f >= W.send && bubble(738, f < W.welcome ? ramp(f, [W.send, W.send + 9], [0, 1], easeOut) : 1)}
            </>
          ),
        }}
        b={{src: 'wa-bemanning.png', children: bubble(396)}}
      />
      {/* incoming welcome menu fades in on top of the sent message */}
      {f >= W.welcome && f < W.welcome + 7 && (
        <Shot src="wa-empty.png" opacity={1 - fadeIn(f, W.welcome, 7)} style={{clipPath: `inset(${HEADER}px 0 1180px 0)`}}>
          {bubble(738)}
        </Shot>
      )}

      {/* 2. Bot invites to fill in the form (keyboard closes) */}
      {f >= W.invite && (
        <Shot src={f < W.sheetDown ? 'wa-invite.png' : 'wa-form-sent.png'} opacity={fadeIn(f, W.invite, 7)}>
          {bubble(504)}
        </Shot>
      )}

      {/* 3. Form sheet slides up — real WhatsApp Flow screenshots */}
      {sheet > 0 && f < W.online + 12 && (
        <>
          <div style={{position: 'absolute', inset: 0, background: `rgba(0,0,0,${0.45 * sheet})`}} />
          <Shot src="wa-form-empty.png" opacity={sheet} style={{clipPath: 'inset(0 0 2618px 0)'}} />
          <div style={{position: 'absolute', inset: 0, transform: `translateY(${sheetY}px)`}}>
            <Shot src="wa-form-empty.png" style={{clipPath: 'inset(250px 0 0 0)'}} />
            <Shot src="wa-form-picker.png" opacity={fadeIn(f, W.picker, 5)} style={{clipPath: 'inset(250px 0 0 0)'}} />
            <Shot
              src="wa-form-complete.png"
              opacity={fadeIn(f, W.complete, 6)}
              style={{clipPath: 'inset(250px 0 0 0)'}}
            />
          </div>
        </>
      )}

      {/* 4. "Je opdracht staat online!" — chat scrolls to the confirmation */}
      {f >= W.online && (
        <ScrollSwap
          frame={f}
          start={W.online}
          dur={12}
          dy={1119}
          top={HEADER}
          bottom={2600}
          a={{src: 'wa-form-sent.png', children: bubble(504)}}
          b={{
            src: 'wa-online.png',
            children: <Highlight frame={f} at={W.online + 14} x={60} y={1484} w={1000} h={1080} color="#21c063" radius={44} />,
          }}
        />
      )}

      {TL.taps
        .filter((t) => t.phone === 'company')
        .map((t) => (
          <Tap key={t.frame} frame={f} at={t.frame} x={t.x} y={t.y} />
        ))}
    </>
  );
};

export const WhatsAppScene: React.FC = () => {
  const f = useCurrentFrame() + FROM;
  const cam = camera(f, COMPANY_CAM);
  const speed = cameraSpeed(f, COMPANY_CAM);
  const blur = Math.min(26, Math.max(0, speed - 140) * 0.1);
  const bgBlur = ramp(f, [FROM, FROM + 16], [0, 22]);

  return (
    <AbsoluteFill style={{background: '#02050b', overflow: 'hidden'}}>
      <AbsoluteFill style={{filter: `blur(${bgBlur}px) brightness(${1.25 - bgBlur / 60})`, transform: 'scale(1.12)'}}>
        {FOOTAGE.companyBackground ? (
          <Footage clip={FOOTAGE.companyBackground} t={f - FROM} length={300} push={0.05} grade="night" />
        ) : (
          <SeaScene
              frame={f + 40}
              palette={PALETTES.night}
              horizon={0.62}
              zoom={1.14 + (f - FROM) * 0.0006}
              vessel={{x: 470, y: 1340, scale: 1.55, speed: 0.55}}
              rain={1}
              searchlight={0.5}
              glowX={720}
            />
        )}
      </AbsoluteFill>
      <AbsoluteFill
        style={{background: 'radial-gradient(circle at 50% 50%, rgba(33,192,99,0.16) 0%, rgba(0,0,0,0) 55%)'}}
      />
      <Phone cam={cam} blur={blur}>
        <CompanyScreen f={f} />
      </Phone>
      {/* light streak on the whip out */}
      <AbsoluteFill
        style={{
          opacity: ramp(f, [W.out + 8, W.out + 13], [0, 1]) * ramp(f, [W.out + 13, W.out + 18], [1, 0]),
          background:
            'linear-gradient(90deg, rgba(0,0,0,0) 20%, rgba(120,170,255,0.55) 48%, rgba(255,255,255,0.9) 50%, rgba(120,170,255,0.55) 52%, rgba(0,0,0,0) 80%)',
          transform: `translateX(${ramp(f, [W.out + 8, W.out + 18], [500, -500])}px) scaleX(2)`,
          mixBlendMode: 'screen',
        }}
      />
    </AbsoluteFill>
  );
};
