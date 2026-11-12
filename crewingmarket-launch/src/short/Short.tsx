import React from 'react';
import {AbsoluteFill, Audio, Freeze, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {Footage} from '../components/Footage';
import {Finish} from '../components/Finish';
import {Phone} from '../components/Phone';
import {Highlight, ScrollSwap, SentBubble, Shot, Tap, TypingField} from '../components/ScreenUI';
import {Routes, Step, StepCaptions} from '../components/StepCaption';
import {camera, CamKey, cameraSpeed, easeIn, easeInOut, easeOut, fadeIn, ramp, shake} from '../lib/anim';
import T from './timeline.json';

/**
 * CrewingMarket — 35-second launch cut (1080x1920, 30 fps).
 * Story: problem → CrewingMarket → request (WhatsApp or platform) → freelancers react → direct contact → CTA.
 * All timing lives in ./timeline.json; every scene cut lands on a beat (120 BPM).
 */

const FONT = 'Inter, sans-serif';
const BLUE = '#3b74ff';
const GREEN = '#21c063';
const ORANGE = '#ff8a3d';
const S = T.scenes;
const credit = 'see CREDITS.md';

const ROUTES: Routes = {
  whatsapp: {label: 'MANIER 1 · WHATSAPP', color: GREEN, ink: '#06210f'},
  app: {label: 'MANIER 2 · HET PLATFORM', color: BLUE, ink: '#fff'},
  freelancer: {label: 'DE ZZP’ER', color: ORANGE, ink: '#2a1200'},
  company: {label: 'JIJ ALS BEDRIJF', color: GREEN, ink: '#06210f'},
};

const whipBlur = (f: number, keys: CamKey[]) => Math.min(26, Math.max(0, cameraSpeed(f, keys) - 140) * 0.1);

/** Dark, blurred maritime footage behind the phones. */
const PhoneBackdrop: React.FC<{t: number; src: string; start: number; tint: string}> = ({t, src, start, tint}) => (
  <>
    <AbsoluteFill style={{filter: 'blur(22px) brightness(0.8)', transform: 'scale(1.12)'}}>
      <Footage clip={{src, start, focusX: 0.55, credit}} t={t} length={150} push={0.05} grade="night" />
    </AbsoluteFill>
    <AbsoluteFill style={{background: `radial-gradient(circle at 50% 58%, ${tint} 0%, rgba(0,0,0,0) 60%)`}} />
  </>
);

// ─────────────────────────────────────────────────────────────── 0–3s HOOK
const HOOK_SHOTS = [
  {from: 0, to: 20, push: 0.1, clip: {src: 'footage/helm-throttle.mp4', start: 0.45, rate: 0.85, focusX: 0.38, zoom: 1.12, credit}},
  {from: 20, to: 50, push: 0.08, clip: {src: 'footage/deck-crew.mp4', start: 0.3, focusX: 0.88, credit}},
  {from: 50, to: 90, push: 0.12, clip: {src: 'footage/tanker-storm.mp4', start: 2.6, rate: 0.9, focusX: 0.66, credit}},
];

const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const sh = shake(f, [0, ...T.hookWords], 10);
  const flash = ramp(f, [0, 10], [1, 0], easeOut);
  const end = S.hook.to;
  return (
    <AbsoluteFill style={{background: '#000', overflow: 'hidden'}}>
      <AbsoluteFill style={{transform: `translate(${sh.x}px, ${sh.y}px) scale(1.04)`}}>
        {HOOK_SHOTS.map((s) => (
          <Sequence key={s.from} from={s.from} durationInFrames={s.to - s.from} layout="none">
            <Footage clip={s.clip} t={f - s.from} length={s.to - s.from} push={s.push} grade="night" />
          </Sequence>
        ))}
      </AbsoluteFill>
      <AbsoluteFill
        style={{background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.45) 100%)'}}
      />
      <AbsoluteFill style={{padding: '0 76px', paddingTop: 330}}>
        {T.copy.hook.map((w, i) => {
          const a = T.hookWords[i];
          const p = ramp(f, [a, a + 6], [0, 1], easeOut);
          const out = ramp(f, [end - 16 + i, end - 4 + i], [0, 1], easeIn);
          const key = i === 2;
          return (
            <div
              key={w}
              style={{
                alignSelf: 'flex-start',
                fontFamily: FONT,
                fontWeight: 900,
                fontSize: key ? 178 : 158,
                lineHeight: key ? '186px' : '166px',
                letterSpacing: `${0.18 * (1 - p) - 0.02}em`,
                color: '#fff',
                background: key ? BLUE : undefined,
                padding: key ? '0 22px' : 0,
                marginLeft: key ? -22 : 0,
                borderRadius: key ? 16 : 0,
                opacity: p * (1 - out),
                filter: `blur(${(1 - p) * 14 + out * 16}px)`,
                transform: `translateY(${(1 - p) * 36 - out * 70}px) scale(${1 + (1 - p) * 0.28})`,
                transformOrigin: '0% 50%',
                textShadow: '0 6px 40px rgba(0,0,0,0.6)',
                boxShadow: key ? '0 10px 50px rgba(59,116,255,0.45)' : undefined,
                whiteSpace: 'nowrap',
              }}
            >
              {w}
            </div>
          );
        })}
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 55% 50%, rgba(255,255,255,${flash}) 0%, rgba(190,215,255,${
            flash * 0.8
          }) 30%, rgba(0,0,0,0) 75%)`,
          mixBlendMode: 'screen',
        }}
      />
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────── 3–6.5s SOLUTION
const Solution: React.FC = () => {
  const {from, to} = S.solution;
  const f = useCurrentFrame() + from;
  const logo = ramp(f, [from, from + 12], [0, 1], easeOut);
  const head = ramp(f, [from + 10, from + 22], [0, 1], easeOut);
  const roles = (i: number) => ramp(f, [from + 30 + i * 5, from + 40 + i * 5], [0, 1], easeOut);
  const out = ramp(f, [to - 8, to], [0, 1], easeIn);
  return (
    <AbsoluteFill style={{background: '#02060d', overflow: 'hidden'}}>
      <AbsoluteFill style={{opacity: 0.55}}>
        <Footage
          clip={{src: 'footage/tug-vanino.mp4', start: 2.2, focusX: 0.46, zoom: 1.04, credit}}
          t={f - from}
          length={to - from}
          push={0.08}
          grade="night"
        />
      </AbsoluteFill>
      <AbsoluteFill
        style={{background: 'radial-gradient(ellipse 85% 60% at 50% 45%, rgba(8,20,39,0.55) 0%, rgba(2,6,13,0.92) 100%)'}}
      />
      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: FONT,
          textAlign: 'center',
          opacity: 1 - out,
          transform: `scale(${1 + out * 0.06})`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 22,
            opacity: logo,
            transform: `translateY(${(1 - logo) * 24}px) scale(${0.92 + 0.08 * logo})`,
          }}
        >
          <Img src={staticFile('brand/logo-mark-white.png')} style={{width: 112, height: 112}} />
          <div style={{fontSize: 84, fontWeight: 800, letterSpacing: '-0.02em'}}>
            <span style={{color: '#fff'}}>Crewing</span>
            <span style={{color: BLUE}}>Market</span>
          </div>
        </div>
        <div
          style={{
            marginTop: 56,
            fontSize: 98,
            fontWeight: 900,
            color: '#fff',
            lineHeight: 1.04,
            letterSpacing: '-0.01em',
            opacity: head,
            filter: `blur(${(1 - head) * 10}px)`,
            transform: `translateY(${(1 - head) * 34}px)`,
          }}
        >
          Vind maritieme
          <br />
          professionals
        </div>
        <div style={{display: 'flex', gap: 18, marginTop: 52}}>
          {T.copy.roles.map((r, i) => (
            <div
              key={r}
              style={{
                padding: '14px 30px',
                borderRadius: 999,
                border: '2px solid rgba(255,255,255,0.22)',
                background: 'rgba(59,116,255,0.16)',
                color: '#dfe8ff',
                fontSize: 38,
                fontWeight: 700,
                opacity: roles(i),
                transform: `translateY(${(1 - roles(i)) * 20}px)`,
              }}
            >
              {r}
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────── 6.5–11.5s WAY 1: WHATSAPP
const W = T.whatsapp;
const WA_CAM: CamKey[] = [
  {f: 195, s: 0.42, fx: 660, fy: 1434, rx: 26, ry: -36, rz: -7, ty: 560},
  {f: 210, s: 1.28, fy: 1460, rx: 0, ry: 0, rz: 0, ty: 250},
  {f: 252, s: 1.28, fy: 1400},
  {f: 270, s: 1.08, fy: 1434},
  {f: 284, s: 1.24, fy: 1820},
  {f: 298, s: 1.08, fy: 1434},
  {f: 310, s: 1.42, fx: 560, fy: 1960},
  {f: 331, s: 1.48, fx: 560, fy: 1970},
  {f: 345, s: 1.2, tx: -1700, rz: -10, ry: 34},
];

const WhatsAppScreen: React.FC<{f: number}> = ({f}) => {
  const msg = T.copy.typedMessage;
  const bubble = (top: number, pop = 1) => <SentBubble top={top} text={msg} time={T.copy.messageTime} pop={pop} />;
  const up = ramp(f, [W.sheetUp, W.sheetUp + 10], [0, 1], easeOut);
  const down = ramp(f, [W.sheetDown, W.sheetDown + 8], [0, 1], easeInOut);
  const sheet = f < W.sheetDown ? up : 1 - down;
  return (
    <>
      <Shot src="wa-empty.png">
        {f < W.sheetUp && <TypingField frame={f} text={msg} start={W.typeStart} end={W.typeEnd} sent={W.send} />}
        {f >= W.send && bubble(738, ramp(f, [W.send, W.send + 8], [0, 1], easeOut))}
      </Shot>
      {f >= W.sheetDown && (
        <ScrollSwap
          frame={f}
          start={W.online}
          dur={10}
          dy={1119}
          top={320}
          bottom={2600}
          a={{src: 'wa-form-sent.png', children: bubble(504)}}
          b={{
            src: 'wa-online.png',
            children: <Highlight frame={f} at={W.online + 10} x={40} y={1470} w={1030} h={1110} color={GREEN} radius={44} />,
          }}
        />
      )}
      {sheet > 0 && (
        <>
          <div style={{position: 'absolute', inset: 0, background: `rgba(0,0,0,${0.45 * sheet})`}} />
          <Shot src="wa-form-complete.png" opacity={sheet} style={{clipPath: 'inset(0 0 2618px 0)'}} />
          <div style={{position: 'absolute', inset: 0, transform: `translateY(${(1 - sheet) * 2640}px)`}}>
            <Shot src="wa-form-complete.png" style={{clipPath: 'inset(250px 0 0 0)'}} />
          </div>
        </>
      )}
      {T.taps
        .filter((t) => t.phone === 'company')
        .map((t) => (
          <Tap key={t.frame} frame={f} at={t.frame} x={t.x} y={t.y} />
        ))}
    </>
  );
};

const WhatsAppWay: React.FC = () => {
  const f = useCurrentFrame() + S.whatsapp.from;
  return (
    <AbsoluteFill style={{background: '#02060d', overflow: 'hidden'}}>
      <PhoneBackdrop t={f - S.whatsapp.from} src="footage/rotterdam-night.mp4" start={4} tint="rgba(33,192,99,0.16)" />
      <Phone cam={camera(f, WA_CAM)} blur={whipBlur(f, WA_CAM)}>
        <WhatsAppScreen f={f} />
      </Phone>
    </AbsoluteFill>
  );
};

// ──────────────────────────────────────── 11.5–16s WAY 2: THE PLATFORM
const A = T.app;
const APP_CAM: CamKey[] = [
  {f: 345, s: 0.5, fx: 660, fy: 1434, rx: -8, ry: 38, rz: 7, tx: 1600, ty: 250},
  {f: 360, s: 1.2, fy: 1480, rx: 0, ry: 0, rz: 0, tx: 0},
  {f: 386, s: 1.2, fy: 1300},
  {f: 404, s: 1.1, fy: 1700},
  {f: 418, s: 1.08, fy: 1434},
  {f: 434, s: 1.3, fy: 1560},
  {f: 470, s: 1.34, fy: 1580},
  {f: 480, s: 1.2, tx: -1700, rz: -10, ry: 34},
];

const PlatformWay: React.FC = () => {
  const f = useCurrentFrame() + S.app.from;
  const video = (
    <OffthreadVideo src={staticFile('footage/app-short.mp4')} muted style={{width: 1320, height: 2868, display: 'block'}} />
  );
  return (
    <AbsoluteFill style={{background: '#02060d', overflow: 'hidden'}}>
      <PhoneBackdrop t={f - S.app.from} src="footage/rotterdam-night.mp4" start={7} tint="rgba(59,116,255,0.2)" />
      <Phone cam={camera(f, APP_CAM)} blur={whipBlur(f, APP_CAM)} glare={1.3}>
        <div style={{position: 'absolute', left: 0, top: 0, width: 1320, height: 2868}}>
          {f < A.clipStart ? (
            <Freeze frame={0}>{video}</Freeze>
          ) : (
            <Sequence from={A.clipStart - S.app.from} layout="none">
              {video}
            </Sequence>
          )}
          <Highlight frame={f} at={A.clipStart + 74} x={44} y={1680} w={1232} h={530} color={BLUE} radius={40} />
        </div>
        {T.taps
          .filter((t) => t.phone === 'app')
          .map((t) => (
            <Tap key={t.frame} frame={f} at={t.frame} x={t.x} y={t.y} dark={false} />
          ))}
      </Phone>
    </AbsoluteFill>
  );
};

// ───────────────────────────────────────── 16–17.5s THE CREW (real footage)
const Crew: React.FC = () => {
  const {from, to} = S.crew;
  const f = useCurrentFrame() + from;
  const a = ramp(f, [from + 2, from + 10], [0, 1], easeOut);
  const out = ramp(f, [to - 5, to], [0, 1], easeIn);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Footage
        clip={{src: 'footage/deck-crew.mp4', start: 2.2, focusX: 0.86, credit}}
        t={f - from}
        length={to - from}
        push={0.1}
        grade="neutral"
      />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(2,6,13,0.88) 100%)'}} />
      <div
        style={{
          position: 'absolute',
          left: 64,
          right: 64,
          top: 1380,
          fontFamily: FONT,
          opacity: a * (1 - out),
          transform: `translateY(${(1 - a) * 30}px)`,
        }}
      >
        <div style={{fontSize: 84, fontWeight: 900, color: '#fff', lineHeight: 1.05}}>{T.copy.crew}</div>
      </div>
    </AbsoluteFill>
  );
};

// ──────────────────────────────────────────── 17.5–23s FREELANCER REACTS
const FR = T.freelancer;
const FR_CAM: CamKey[] = [
  {f: 525, s: 0.55, fx: 660, fy: 1434, rx: -8, ry: 38, rz: 7, tx: 1600, ty: 250},
  {f: 540, s: 1.28, fy: 1350, rx: 0, ry: 0, rz: 0, tx: 0},
  {f: 578, s: 1.28, fy: 1450},
  {f: 600, s: 1.28, fy: 900},
  {f: 680, s: 1.36, fy: 880},
  {f: 690, s: 1.2, tx: -1700, rz: -10, ry: 34},
];

const FreelancerReacts: React.FC = () => {
  const f = useCurrentFrame() + S.freelancer.from;
  const toast = ramp(f, [FR.reacted, FR.reacted + 12], [0, 1], easeOut);
  return (
    <AbsoluteFill style={{background: '#06142a', overflow: 'hidden'}}>
      <PhoneBackdrop t={f - S.freelancer.from} src="footage/rhine-barges.mp4" start={1} tint="rgba(255,138,61,0.16)" />
      <Phone cam={camera(f, FR_CAM)} blur={whipBlur(f, FR_CAM)} glare={1.5}>
        <Shot src="app-assignments.png" />
        {f >= FR.reacted && (
          <>
            <Shot src="app-reacted.png" opacity={fadeIn(f, FR.reacted, 3)} />
            <Shot
              src="app-assignments.png"
              opacity={1 - ramp(f, [FR.reacted + 8, FR.reacted + 13], [0, 1])}
              style={{clipPath: 'inset(214px 0 2380px 0)'}}
            />
            <Shot
              src="app-reacted.png"
              y={(1 - toast) * -320}
              opacity={Math.min(1, toast * 2)}
              style={{clipPath: 'inset(222px 24px 2384px 24px)'}}
            />
            <Highlight frame={f} at={FR.reacted + 14} x={40} y={226} w={1240} h={250} radius={30} color={ORANGE} />
            <Highlight frame={f} at={FR.reacted + 22} x={104} y={1574} w={478} h={88} color="#21a35a" radius={44} />
          </>
        )}
        {T.taps
          .filter((t) => t.phone === 'freelancer')
          .map((t) => (
            <Tap key={t.frame} frame={f} at={t.frame} x={t.x} y={t.y} dark={false} />
          ))}
      </Phone>
    </AbsoluteFill>
  );
};

// ───────────────────────────────────────────── 23–28.5s DIRECT CONTACT
const C = T.contact;
const C_CAM: CamKey[] = [
  {f: 690, s: 0.55, fx: 660, fy: 1434, rx: -6, ry: -38, rz: -6, tx: 1700, ty: 250},
  {f: 702, s: 1.3, fy: 2250, rx: 0, ry: 0, rz: 0, tx: 0},
  {f: 736, s: 1.3, fy: 2250},
  {f: 748, s: 1.3, fy: 1300},
  {f: 788, s: 1.3, fy: 1330},
  {f: 800, s: 1.32, fy: 1180},
  {f: 850, s: 1.38, fy: 1180},
];

const DirectContact: React.FC = () => {
  const {from, to} = S.contact;
  const f = useCurrentFrame() + from;
  const out = ramp(f, [to - 5, to], [0, 1], easeIn);
  const video = (
    <OffthreadVideo src={staticFile('footage/contact-short.mp4')} muted style={{width: 1320, height: 2868, display: 'block'}} />
  );
  return (
    <AbsoluteFill style={{background: '#02060d', overflow: 'hidden'}}>
      <PhoneBackdrop t={f - from} src="footage/rotterdam-night.mp4" start={9} tint="rgba(33,192,99,0.16)" />
      <AbsoluteFill style={{opacity: 1 - out}}>
        <Phone cam={camera(f, C_CAM)} blur={whipBlur(f, C_CAM)} glare={1.3}>
          <div style={{position: 'absolute', left: 0, top: 0, width: 1320, height: 2868}}>
            {f < C.clipStart ? (
              <Freeze frame={0}>{video}</Freeze>
            ) : (
              <Sequence from={C.clipStart - from} layout="none">
                {video}
              </Sequence>
            )}
            {f < C.tapLink + 3 && <Highlight frame={f} at={C.clipStart + 4} x={36} y={2178} w={1010} h={396} radius={40} color={GREEN} />}
            {f >= C.pageOpen && f < C.tapContact + 1 && (
              <Highlight frame={f} at={C.pageOpen + 8} x={36} y={944} w={1248} h={776} radius={40} color={GREEN} />
            )}
            {f >= C.contactOpen && <Highlight frame={f} at={C.contactOpen + 4} x={40} y={840} w={1240} h={520} radius={40} color={GREEN} />}
          </div>
          {T.taps
            .filter((t) => t.phone === 'contact')
            .map((t) => (
              <Tap key={t.frame} frame={f} at={t.frame} x={t.x} y={t.y} dark={t.frame === C.tapLink} />
            ))}
        </Phone>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ───────────────────────────────────────────────────────── 28.5–35s CTA
const E = T.end;
const End: React.FC = () => {
  const {from, to} = S.end;
  const f = useCurrentFrame() + from;
  const sh = shake(f, [E.logo, E.cta], 8);
  const mark = ramp(f, [E.logo, E.logo + 14], [0, 1], easeOut);
  const bloom = ramp(f, [E.logo, E.logo + 4], [0, 1]) * ramp(f, [E.logo + 4, E.logo + 40], [1, 0.4]);
  const q1 = ramp(f, [E.q1, E.q1 + 10], [0, 1], easeOut);
  const q2 = ramp(f, [E.q2, E.q2 + 10], [0, 1], easeOut);
  const cta = ramp(f, [E.cta, E.cta + 10], [0, 1], easeOut);
  const live = ramp(f, [E.live, E.live + 12], [0, 1], easeOut);
  const pulse = 0.5 + 0.5 * Math.sin((f - E.cta) / 9);
  const word = 'CrewingMarket';
  return (
    <AbsoluteFill style={{background: '#02060d', overflow: 'hidden'}}>
      {/* maritime backdrop: a vessel underway, pushed into the brand's dark blue */}
      <AbsoluteFill style={{opacity: 0.5}}>
        <Footage
          clip={{src: 'footage/tanker-storm.mp4', start: 8.6, rate: 0.85, focusX: 0.56, credit}}
          t={f - from}
          length={to - from}
          push={0.1}
          grade="night"
        />
      </AbsoluteFill>
      <AbsoluteFill
        style={{background: 'radial-gradient(ellipse 85% 60% at 50% 42%, rgba(15,34,66,0.55) 0%, rgba(2,6,13,0.94) 100%)'}}
      />
      <AbsoluteFill style={{transform: `translate(${sh.x}px, ${sh.y}px)`, fontFamily: FONT, textAlign: 'center'}}>
        <div
          style={{
            position: 'absolute',
            left: 540 - 380,
            top: 470 - 380,
            width: 760,
            height: 760,
            borderRadius: 380,
            background: 'radial-gradient(circle, rgba(59,116,255,0.45) 0%, rgba(59,116,255,0) 65%)',
            opacity: bloom,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 540 - 105,
            top: 360,
            width: 210,
            height: 210,
            clipPath: `inset(${(1 - mark) * 100}% 0 0 0)`,
            transform: `translateY(${(1 - mark) * 26}px) scale(${1.15 - 0.15 * mark})`,
          }}
        >
          <Img src={staticFile('brand/logo-mark-white.png')} style={{width: 210, height: 210}} />
        </div>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 590,
            display: 'flex',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: 112,
            letterSpacing: '-0.02em',
            lineHeight: '140px',
            height: 140,
            overflow: 'hidden',
          }}
        >
          {word.split('').map((ch, i) => {
            const p = ramp(f, [E.logo + 6 + i, E.logo + 16 + i], [0, 1], easeOut);
            return (
              <span key={i} style={{display: 'inline-block', color: i < 7 ? '#fff' : BLUE, transform: `translateY(${(1 - p) * 110}%)`}}>
                {ch}
              </span>
            );
          })}
        </div>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 850,
            fontSize: 72,
            fontWeight: 900,
            color: '#fff',
            lineHeight: 1.15,
            whiteSpace: 'nowrap',
          }}
        >
          <div style={{opacity: q1, transform: `translateY(${(1 - q1) * 30}px)`}}>{T.copy.ctaQ1}</div>
          <div style={{opacity: q2, transform: `translateY(${(1 - q2) * 30}px)`, color: '#cfe0ff'}}>{T.copy.ctaQ2}</div>
        </div>
        <div style={{position: 'absolute', left: 0, right: 0, top: 1130, display: 'flex', justifyContent: 'center'}}>
          <div
            style={{
              padding: '30px 64px',
              borderRadius: 999,
              background: BLUE,
              color: '#fff',
              fontSize: 64,
              fontWeight: 800,
              letterSpacing: '-0.01em',
              opacity: cta,
              transform: `scale(${(0.85 + 0.15 * cta) * (1 + 0.015 * pulse * cta)})`,
              boxShadow: `0 18px ${50 + 30 * pulse}px rgba(59,116,255,${0.45 + 0.2 * pulse})`,
            }}
          >
            {T.copy.url}
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 1310,
            fontSize: 34,
            fontWeight: 700,
            letterSpacing: '0.24em',
            color: '#9db8ff',
            opacity: live,
          }}
        >
          {T.copy.live}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ──────────────────────────────────────────────────────────── assembly
const len = (k: keyof typeof S) => S[k].to - S[k].from;

export const ShortCommercial: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Sequence name="1 · Hook" from={S.hook.from} durationInFrames={len('hook')}>
        <Hook />
      </Sequence>
      <Sequence name="2 · CrewingMarket" from={S.solution.from} durationInFrames={len('solution')}>
        <Solution />
      </Sequence>
      <Sequence name="3 · Via WhatsApp" from={S.whatsapp.from} durationInFrames={len('whatsapp')}>
        <WhatsAppWay />
      </Sequence>
      <Sequence name="4 · Via het platform" from={S.app.from} durationInFrames={len('app')}>
        <PlatformWay />
      </Sequence>
      <Sequence name="5 · De matroos" from={S.crew.from} durationInFrames={len('crew')}>
        <Crew />
      </Sequence>
      <Sequence name="6 · Zzp'er reageert" from={S.freelancer.from} durationInFrames={len('freelancer')}>
        <FreelancerReacts />
      </Sequence>
      <Sequence name="7 · Direct contact" from={S.contact.from} durationInFrames={len('contact')}>
        <DirectContact />
      </Sequence>
      <Sequence name="8 · CTA" from={S.end.from} durationInFrames={len('end')}>
        <End />
      </Sequence>
      <StepCaptions frame={frame} steps={T.steps as Step[]} routes={ROUTES} showProgress={false} />
      <Finish frame={frame} />
      <Audio src={staticFile(T.audioOut)} />
    </AbsoluteFill>
  );
};
